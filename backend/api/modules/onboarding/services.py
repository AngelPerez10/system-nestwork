import hashlib
import secrets
import unicodedata
from datetime import timedelta

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.mail import send_mail
from django.db import transaction
from django.utils import timezone
from django.utils.text import slugify

from api.permissions_data import default_permissions_for_user
from organizations.models import Domain, OnboardingToken, Organization, OrganizationLead, OrganizationUser
from workspace.models import UserProfile

User = get_user_model()


def _strip_accents(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    return "".join(ch for ch in normalized if not unicodedata.combining(ch))


def normalize_username_seed(first_name: str, last_name: str) -> str:
    left = slugify(_strip_accents(first_name or ""), allow_unicode=False).replace("-", "")
    right = slugify(_strip_accents(last_name or ""), allow_unicode=False).replace("-", "")
    base = ".".join(part for part in [left, right] if part)
    return (base or "usuario")[:120]


def unique_username(seed: str) -> str:
    candidate = seed
    i = 1
    while User.objects.filter(username__iexact=candidate).exists():
        i += 1
        suffix = str(i)
        candidate = f"{seed[: max(1, 150 - len(suffix) - 1)]}.{suffix}"
    return candidate


def unique_schema_name(company_name: str) -> str:
    base = slugify(_strip_accents(company_name or ""), allow_unicode=False).replace("-", "_")
    base = "".join(ch for ch in base if ch.isalnum() or ch == "_").strip("_")
    if not base:
        base = "empresa"
    base = base[:40]
    candidate = base
    i = 1
    while Organization.objects.filter(schema_name=candidate).exists():
        i += 1
        suffix = str(i)
        candidate = f"{base[: max(1, 63 - len(suffix) - 1)]}_{suffix}"
    return candidate


def unique_org_slug(company_name: str) -> str:
    base = slugify(_strip_accents(company_name or ""), allow_unicode=False) or "empresa"
    base = base[:40]
    candidate = base
    i = 1
    while Organization.objects.filter(slug=candidate).exists():
        i += 1
        suffix = str(i)
        candidate = f"{base[: max(1, 63 - len(suffix) - 1)]}-{suffix}"
    return candidate


def unique_domain(schema_name: str) -> str:
    base_domain = (getattr(settings, "ONBOARDING_BASE_DOMAIN", "localtest.me") or "localtest.me").strip().lower()
    if base_domain in {"localhost", "127.0.0.1"}:
        base_domain = "localtest.me"
    base = f"{schema_name}.{base_domain}"
    candidate = base
    i = 1
    while Domain.objects.filter(domain__iexact=candidate).exists():
        i += 1
        candidate = f"{schema_name}-{i}.{base_domain}"
    return candidate


def create_activation_token(user, *, purpose: str = OnboardingToken.Purpose.ACTIVATE):
    raw_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
    expires_hours = int(getattr(settings, "ONBOARDING_TOKEN_TTL_HOURS", 24))
    expires_at = timezone.now() + timedelta(hours=max(1, expires_hours))
    record = OnboardingToken.objects.create(
        user=user,
        purpose=purpose,
        token_hash=token_hash,
        expires_at=expires_at,
    )
    return record, raw_token


def create_company_with_default_users(*, first_name: str, last_name: str, email: str, company_name: str):
    email_normalized = (email or "").strip().lower()
    if User.objects.filter(email__iexact=email_normalized).exists():
        raise ValidationError("El correo ya está registrado.")

    schema_name = unique_schema_name(company_name)
    org_slug = unique_org_slug(company_name)
    domain_value = unique_domain(schema_name)

    with transaction.atomic():
        organization = Organization.objects.create(
            name=(company_name or "").strip()[:255],
            schema_name=schema_name,
            slug=org_slug,
        )
        Domain.objects.create(domain=domain_value, tenant=organization, is_primary=True)

        admin_username = unique_username(normalize_username_seed(first_name, last_name))
        admin_user = User.objects.create_user(
            username=admin_username,
            email=email_normalized[:254],
            first_name=(first_name or "").strip()[:150],
            last_name=(last_name or "").strip()[:150],
            is_staff=True,
            is_superuser=False,
            is_active=False,
        )
        admin_user.set_unusable_password()
        admin_user.save(update_fields=["password"])

        tech_seed = f"tecnico.{schema_name}".replace("_", "")
        tech_username_1 = unique_username(tech_seed[:120])
        technician_user = User.objects.create_user(
            username=tech_username_1,
            email="",
            first_name="Tecnico",
            last_name=(company_name or "").strip()[:140],
            is_staff=False,
            is_superuser=False,
            is_active=False,
        )
        technician_user.set_unusable_password()
        technician_user.save(update_fields=["password"])

        tech_username_2 = unique_username(f"{tech_seed}2"[:120])
        technician_user_2 = User.objects.create_user(
            username=tech_username_2,
            email="",
            first_name="Tecnico",
            last_name=(company_name or "").strip()[:140],
            is_staff=False,
            is_superuser=False,
            is_active=False,
        )
        technician_user_2.set_unusable_password()
        technician_user_2.save(update_fields=["password"])

        OrganizationUser.objects.get_or_create(organization=organization, user=admin_user)
        OrganizationUser.objects.get_or_create(organization=organization, user=technician_user)
        OrganizationUser.objects.get_or_create(organization=organization, user=technician_user_2)

        admin_profile, _ = UserProfile.objects.get_or_create(user=admin_user)
        admin_profile.permissions = default_permissions_for_user(admin_user)
        admin_profile.save(update_fields=["permissions"])

        technician_profile, _ = UserProfile.objects.get_or_create(user=technician_user)
        technician_profile.permissions = default_permissions_for_user(technician_user)
        technician_profile.save(update_fields=["permissions"])

        technician_profile_2, _ = UserProfile.objects.get_or_create(user=technician_user_2)
        technician_profile_2.permissions = default_permissions_for_user(technician_user_2)
        technician_profile_2.save(update_fields=["permissions"])

        token_obj, raw_token = create_activation_token(admin_user)

    return {
        "organization": organization,
        "domain": domain_value,
        "admin_user": admin_user,
        "technician_user": technician_user,
        "technician_user_2": technician_user_2,
        "activation_token_id": token_obj.id,
        "activation_raw_token": raw_token,
    }


def send_activation_email(*, to_email: str, username: str, raw_token: str):
    frontend_base = (getattr(settings, "FRONTEND_BASE_URL", "http://localhost:5173") or "http://localhost:5173").rstrip("/")
    activation_url = f"{frontend_base}/activate-account?token={raw_token}"
    subject = "Activa tu cuenta de System Nestwork"
    body = (
        "Hola,\n\n"
        "Tu empresa ya fue creada correctamente.\n"
        f"Usuario: {username}\n\n"
        "Para definir tu contraseña de acceso, abre este enlace:\n"
        f"{activation_url}\n\n"
        "Este enlace expira en 24 horas y solo puede usarse una vez.\n\n"
        "Si no solicitaste esta cuenta, ignora este mensaje."
    )
    send_mail(
        subject=subject,
        message=body,
        from_email=getattr(settings, "DEFAULT_FROM_EMAIL", None),
        recipient_list=[to_email],
        fail_silently=False,
    )


def consume_activation_token(*, raw_token: str, password: str):
    if not raw_token:
        raise ValidationError("Token requerido.")
    validate_password(password)
    token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
    token = (
        OnboardingToken.objects.select_related("user")
        .filter(
            token_hash=token_hash,
            purpose=OnboardingToken.Purpose.ACTIVATE,
            used_at__isnull=True,
        )
        .order_by("-created_on")
        .first()
    )
    if not token:
        raise ValidationError("Token inválido o ya utilizado.")
    if token.expires_at <= timezone.now():
        raise ValidationError("Token expirado.")

    with transaction.atomic():
        user = token.user
        user.set_password(password)
        user.is_active = True
        user.save(update_fields=["password", "is_active"])
        token.used_at = timezone.now()
        token.save(update_fields=["used_at"])
    return token.user


def create_custom_plan_lead(
    *,
    first_name: str,
    last_name: str,
    email: str,
    company_name: str,
    custom_requirements: str,
):
    lead = OrganizationLead.objects.create(
        first_name=(first_name or "").strip()[:150],
        last_name=(last_name or "").strip()[:150],
        email=(email or "").strip().lower()[:254],
        company_name=(company_name or "").strip()[:255],
        plan=OrganizationLead.Plan.CUSTOM,
        custom_requirements=(custom_requirements or "").strip()[:8000],
    )
    return lead
