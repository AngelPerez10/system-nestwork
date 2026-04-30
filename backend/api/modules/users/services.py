import logging

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.db import connection

from api.permissions_data import default_permissions_for_user
from organizations.models import OrganizationUser
from workspace.models import SecurityAuditEvent, UserProfile

User = get_user_model()
logger = logging.getLogger(__name__)


def role_for(user) -> str:
    if is_platform_superadmin(user):
        return "superadmin"
    return "admin" if (user.is_superuser or user.is_staff) else "tecnico"


def role_for_profile(user, profile: UserProfile | None = None) -> str:
    profile = profile or getattr(user, "profile", None)
    if profile and profile.platform_role == UserProfile.PlatformRole.SUPERADMIN:
        return "superadmin"
    if profile and profile.platform_role == UserProfile.PlatformRole.ADMIN_EMPRESA:
        return "admin"
    return role_for(user)


def is_platform_superadmin(user) -> bool:
    if not getattr(user, "is_authenticated", False):
        return False
    if getattr(user, "is_superuser", False):
        return True
    profile = getattr(user, "profile", None)
    return bool(profile and profile.platform_role == UserProfile.PlatformRole.SUPERADMIN)


def user_account_dict(user, profile: UserProfile | None = None):
    profile = profile or getattr(user, "profile", None)
    return {
        "id": user.id,
        "username": user.get_username(),
        "email": user.email or "",
        "first_name": user.first_name or "",
        "last_name": user.last_name or "",
        "is_staff": user.is_staff,
        "is_superuser": user.is_superuser,
        "is_active": user.is_active,
        "role": role_for_profile(user, profile),
        "platform_role": (
            profile.platform_role
            if profile
            else (
                UserProfile.PlatformRole.SUPERADMIN
                if getattr(user, "is_superuser", False)
                else UserProfile.PlatformRole.ADMIN_EMPRESA
                if getattr(user, "is_staff", False)
                else UserProfile.PlatformRole.TECNICO
            )
        ),
        "password_enabled": True,
        "avatar_url": (profile.avatar_url if profile else "") or "",
    }


def get_or_create_profile(user) -> UserProfile:
    profile, created = UserProfile.objects.get_or_create(
        user=user,
        defaults={"permissions": default_permissions_for_user(user)},
    )
    desired_role = (
        UserProfile.PlatformRole.SUPERADMIN
        if user.is_superuser
        else UserProfile.PlatformRole.ADMIN_EMPRESA
        if user.is_staff
        else UserProfile.PlatformRole.TECNICO
    )
    dirty_fields = []
    if profile.platform_role != desired_role:
        profile.platform_role = desired_role
        dirty_fields.append("platform_role")
    if created or not profile.permissions:
        profile.permissions = default_permissions_for_user(user)
        dirty_fields.append("permissions")
    if dirty_fields:
        profile.save(update_fields=dirty_fields)
    return profile


def staff_required(user):
    return user.is_authenticated and (user.is_staff or user.is_superuser)


def tenant_schema_name() -> str:
    tenant = getattr(connection, "tenant", None)
    return (getattr(tenant, "schema_name", None) or connection.schema_name or "public").strip()


def notify_support_request(*, user, tenant_schema: str, category: str, message: str) -> None:
    """
    Envía el mensaje al buzón de soporte (SUPPORT_INBOX_EMAIL) o lo registra en logs si no está configurado.
    category: 'bug' | 'plan'
    """
    label = "Fallo / error" if category == "bug" else "Plan personalizado"
    subject = f"[System NestWork] Soporte: {label} — tenant {tenant_schema}"
    body = (
        f"Tipo: {label} ({category})\n"
        f"Tenant (schema): {tenant_schema}\n"
        f"Usuario: {user.get_username()} (id={user.pk})\n"
        f"Correo: {user.email or '(sin correo)'}\n"
        f"Nombre: {(user.first_name or '').strip()} {(user.last_name or '').strip()}\n\n"
        f"Mensaje:\n{message.strip()}\n"
    )
    to = (getattr(settings, "SUPPORT_INBOX_EMAIL", "") or "").strip()
    from_email = getattr(settings, "DEFAULT_FROM_EMAIL", None) or None
    if to:
        send_mail(
            subject=subject,
            message=body,
            from_email=from_email,
            recipient_list=[to],
            fail_silently=False,
        )
    else:
        logger.warning(
            "SUPPORT_INBOX_EMAIL no configurado; solicitud de soporte solo en logs.\n%s\n%s",
            subject,
            body,
        )


def visible_users_queryset(*, requesting_user, include_superusers: bool = False):
    qs = User.objects.filter(is_active=True)
    schema = tenant_schema_name()

    if is_platform_superadmin(requesting_user):
        return qs

    if schema != "public":
        qs = qs.filter(
            id__in=OrganizationUser.objects.filter(
                organization__schema_name=schema
            ).values_list("user_id", flat=True)
        )

    if not include_superusers:
        qs = qs.filter(is_superuser=False)

    if requesting_user.is_superuser and include_superusers:
        return qs

    return qs


def can_manage_target_user(*, requesting_user, target_user) -> bool:
    if target_user.is_superuser and not is_platform_superadmin(requesting_user):
        return False
    return visible_users_queryset(
        requesting_user=requesting_user, include_superusers=False
    ).filter(pk=target_user.pk).exists()


def audit_security_event(
    *,
    actor,
    action: str,
    target_user_id: int | None = None,
    schema_name: str | None = None,
    ip_address: str | None = None,
    metadata: dict | None = None,
):
    SecurityAuditEvent.objects.create(
        actor=actor if getattr(actor, "is_authenticated", False) else None,
        action=action[:120],
        target_user_id=target_user_id,
        schema_name=(schema_name or tenant_schema_name())[:63],
        ip_address=ip_address,
        metadata=metadata or {},
    )
