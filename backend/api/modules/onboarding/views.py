import logging

from django.conf import settings
from django.core.exceptions import ValidationError
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle

from api.modules.onboarding.mercadopago_service import (
    create_preapproval_for_pending,
    handle_payment_notification,
    starter_monthly_total_mxn,
    sync_preapproval_and_provision,
)
from api.modules.onboarding.services import (
    consume_activation_token,
    create_company_with_default_users,
    create_custom_plan_lead,
    send_activation_email,
)
from api.modules.users.services import tenant_schema_name
from organizations.models import PendingCompanyRegistration

logger = logging.getLogger(__name__)


class OnboardingRegisterThrottle(AnonRateThrottle):
    scope = "onboarding_register"


class OnboardingSetPasswordThrottle(AnonRateThrottle):
    scope = "onboarding_set_password"


class OnboardingLeadThrottle(AnonRateThrottle):
    scope = "onboarding_lead"


def _require_public_schema():
    if tenant_schema_name() != "public":
        return Response({"detail": "No encontrado"}, status=404)
    return None


@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([OnboardingRegisterThrottle])
def register_company(request):
    schema_guard = _require_public_schema()
    if schema_guard:
        return schema_guard
    data = request.data or {}
    first_name = (data.get("first_name") or "").strip()
    last_name = (data.get("last_name") or "").strip()
    email = (data.get("email") or "").strip()
    company_name = (data.get("company_name") or "").strip()
    plan = (data.get("plan") or "").strip().lower()

    if plan and plan not in {"starter_2_users", "custom"}:
        return Response({"detail": "Plan inválido."}, status=400)
    if not all([first_name, last_name, email, company_name]):
        return Response(
            {"detail": "first_name, last_name, email y company_name son requeridos."},
            status=400,
        )

    mp_on = bool((getattr(settings, "MERCADOPAGO_ACCESS_TOKEN", "") or "").strip())
    allow_bypass = getattr(settings, "ALLOW_REGISTER_WITHOUT_PAYMENT", False)
    if plan == "starter_2_users" and mp_on and not allow_bypass:
        return Response(
            {
                "detail": "El plan de pago requiere completar la suscripción en Mercado Pago. Usa el flujo de registro con cobro.",
            },
            status=400,
        )

    try:
        payload = create_company_with_default_users(
            first_name=first_name,
            last_name=last_name,
            email=email,
            company_name=company_name,
        )
        send_activation_email(
            to_email=email,
            username=payload["admin_user"].username,
            raw_token=payload["activation_raw_token"],
        )
    except ValidationError as exc:
        return Response({"detail": exc.messages[0] if exc.messages else str(exc)}, status=400)
    except Exception:
        return Response(
            {"detail": "No se pudo completar el registro por el momento."},
            status=500,
        )

    return Response(
        {
            "detail": "Registro exitoso. Revisa tu correo para activar la cuenta.",
            "organization": payload["organization"].name,
            "tenant_domain": payload["domain"],
            "admin_username": payload["admin_user"].username,
        },
        status=201,
    )


@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([OnboardingSetPasswordThrottle])
def set_password(request):
    schema_guard = _require_public_schema()
    if schema_guard:
        return schema_guard
    data = request.data or {}
    token = (data.get("token") or "").strip()
    password = data.get("password") or ""
    password2 = data.get("password2") or ""

    if not token or not password:
        return Response({"detail": "token y password son requeridos."}, status=400)
    if password != password2:
        return Response({"detail": "Las contraseñas no coinciden."}, status=400)

    try:
        user = consume_activation_token(raw_token=token, password=password)
    except ValidationError as exc:
        return Response({"detail": exc.messages[0] if exc.messages else str(exc)}, status=400)

    return Response(
        {
            "detail": "Cuenta activada correctamente. Ya puedes iniciar sesión.",
            "username": user.username,
            "email": user.email or "",
        },
        status=200,
    )


@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([OnboardingLeadThrottle])
def custom_plan_lead(request):
    schema_guard = _require_public_schema()
    if schema_guard:
        return schema_guard
    data = request.data or {}
    first_name = (data.get("first_name") or "").strip()
    last_name = (data.get("last_name") or "").strip()
    email = (data.get("email") or "").strip()
    company_name = (data.get("company_name") or "").strip()
    custom_requirements = (data.get("custom_requirements") or data.get("requirements") or "").strip()

    if not all([first_name, last_name, email, company_name]):
        return Response(
            {"detail": "first_name, last_name, email y company_name son requeridos."},
            status=400,
        )
    if not custom_requirements:
        return Response(
            {"detail": "Describe qué funcionalidades o sistema necesitas (custom_requirements)."},
            status=400,
        )
    if len(custom_requirements) > 8000:
        return Response({"detail": "La descripción no puede superar 8000 caracteres."}, status=400)

    try:
        create_custom_plan_lead(
            first_name=first_name,
            last_name=last_name,
            email=email,
            company_name=company_name,
            custom_requirements=custom_requirements,
        )
    except Exception:
        return Response({"detail": "No se pudo registrar tu solicitud."}, status=500)

    return Response(
        {"detail": "Solicitud enviada. El equipo comercial te contactará pronto."},
        status=201,
    )


@api_view(["GET"])
@permission_classes([AllowAny])
def starter_pricing(request):
    schema_guard = _require_public_schema()
    if schema_guard:
        return schema_guard
    """Precio público del plan starter (base, IVA, total mensual)."""
    base = getattr(settings, "STARTER_PLAN_BASE_MXN", None)
    rate = getattr(settings, "STARTER_PLAN_IVA_RATE", None)
    total = starter_monthly_total_mxn()
    return Response(
        {
            "base_mxn": str(base) if base is not None else "200.00",
            "iva_rate": str(rate) if rate is not None else "0.16",
            "monthly_total_mxn": str(total),
            "currency": "MXN",
        }
    )


@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([OnboardingRegisterThrottle])
def create_checkout_preference(request):
    schema_guard = _require_public_schema()
    if schema_guard:
        return schema_guard
    """
    Crea registro pendiente + preapproval Mercado Pago; el cliente debe abrir init_point.
    """
    if not (getattr(settings, "MERCADOPAGO_ACCESS_TOKEN", "") or "").strip():
        return Response(
            {"detail": "Pagos no configurados en el servidor. Contacta al administrador."},
            status=503,
        )

    data = request.data or {}
    first_name = (data.get("first_name") or "").strip()
    last_name = (data.get("last_name") or "").strip()
    email = (data.get("email") or "").strip()
    company_name = (data.get("company_name") or "").strip()

    if not all([first_name, last_name, email, company_name]):
        return Response(
            {"detail": "first_name, last_name, email y company_name son requeridos."},
            status=400,
        )

    open_qs = PendingCompanyRegistration.objects.filter(
        email__iexact=email.lower(),
        status__in=[
            PendingCompanyRegistration.Status.PENDING_PAYMENT,
            PendingCompanyRegistration.Status.AUTHORIZED,
        ],
    )
    if open_qs.exists():
        return Response(
            {
                "detail": "Ya hay un registro pendiente para este correo. Revisa tu correo o intenta más tarde.",
            },
            status=400,
        )

    try:
        pending = PendingCompanyRegistration.objects.create(
            first_name=first_name[:150],
            last_name=last_name[:150],
            email=email.lower()[:254],
            company_name=company_name[:255],
            plan="starter_2_users",
            status=PendingCompanyRegistration.Status.PENDING_PAYMENT,
        )
        init_point, preapproval_id = create_preapproval_for_pending(pending)
    except RuntimeError as exc:
        return Response({"detail": str(exc)}, status=502)
    except Exception:
        return Response(
            {"detail": "No se pudo iniciar el cobro. Intenta de nuevo más tarde."},
            status=500,
        )

    return Response(
        {
            "init_point": init_point,
            "preapproval_id": preapproval_id,
            "external_reference": str(pending.external_reference),
        },
        status=201,
    )


@api_view(["POST", "GET"])
@permission_classes([AllowAny])
def mercadopago_webhook(request):
    schema_guard = _require_public_schema()
    if schema_guard:
        return schema_guard
    """
    Notificaciones IPN / webhook de Mercado Pago (preapproval / payment).
    Responde 200 para evitar reintentos excesivos cuando el caso ya está cubierto.
    """
    topic = (request.GET.get("topic") or request.GET.get("type") or "").strip()
    rid = (request.GET.get("id") or "").strip()

    if not rid and request.method == "POST":
        body = request.data if isinstance(request.data, dict) else {}
        etype = (body.get("type") or body.get("topic") or "").strip()
        data = body.get("data") if isinstance(body.get("data"), dict) else {}
        rid = str(data.get("id") or body.get("id") or "").strip()
        if not rid and isinstance(body.get("resource"), str):
            # Algunas notificaciones envían el id en un resource URL
            res = body.get("resource", "")
            if "/preapproval/" in res:
                rid = res.split("/preapproval/")[-1].split("?")[0].strip()
                topic = topic or "preapproval"
            elif "/payments/" in res:
                rid = res.split("/payments/")[-1].split("?")[0].strip()
                topic = topic or "payment"
        topic = etype or topic

    if not rid:
        return Response({"ok": True}, status=200)

    try:
        lt = topic.lower()
        if "preapproval" in lt or topic == "preapproval":
            sync_preapproval_and_provision(rid)
        elif "payment" in lt or topic == "payment":
            handle_payment_notification(rid)
    except Exception:
        logger.exception("mercadopago_webhook")

    return Response({"ok": True}, status=200)
