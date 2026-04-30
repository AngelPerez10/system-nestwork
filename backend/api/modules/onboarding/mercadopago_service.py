"""
Mercado Pago: preapproval (suscripción mensual) para plan starter.
"""
from __future__ import annotations

import logging
from datetime import timedelta
from decimal import Decimal
from typing import Any, Optional

import mercadopago
from django.conf import settings
from django.db import transaction
from django.utils import timezone

from django.core.exceptions import ValidationError

from organizations.models import PendingCompanyRegistration

logger = logging.getLogger(__name__)


def starter_monthly_total_mxn() -> Decimal:
    base = getattr(settings, "STARTER_PLAN_BASE_MXN", Decimal("200"))
    rate = getattr(settings, "STARTER_PLAN_IVA_RATE", Decimal("0.16"))
    return (base * (Decimal("1") + rate)).quantize(Decimal("0.01"))


def _mp_sdk() -> Optional[mercadopago.SDK]:
    token = (getattr(settings, "MERCADOPAGO_ACCESS_TOKEN", "") or "").strip()
    if not token:
        return None
    return mercadopago.SDK(token)


def _unwrap(result: Any) -> dict[str, Any]:
    if isinstance(result, dict) and "response" in result:
        return result["response"]
    return result


def _init_point_from_create(result: Any) -> Optional[str]:
    body = _unwrap(result)
    return body.get("init_point") or body.get("sandbox_init_point")


def create_preapproval_for_pending(
    pending: PendingCompanyRegistration,
):
    """
    Crea preapproval en Mercado Pago y devuelve (init_point, preapproval_id).
    """
    sdk = _mp_sdk()
    if sdk is None:
        raise RuntimeError("Mercado Pago no está configurado.")

    frontend = (getattr(settings, "FRONTEND_BASE_URL", "http://localhost:5173") or "").rstrip("/")
    back_url = f"{frontend}/registro-empresa?plan=starter_2_users&mp=return"

    backend = (getattr(settings, "BACKEND_PUBLIC_URL", "http://127.0.0.1:8000") or "").rstrip("/")
    notification_url = f"{backend}/api/onboarding/mercadopago-webhook/"

    now = timezone.now()
    start = now + timedelta(minutes=20)
    end = now + timedelta(days=365 * 10)

    amount = float(starter_monthly_total_mxn())

    body: dict[str, Any] = {
        "reason": "System Nestwork — Plan 2 usuarios (mensual, IVA incl.)",
        "external_reference": str(pending.external_reference),
        "payer_email": pending.email.strip().lower(),
        "auto_recurring": {
            "frequency": 1,
            "frequency_type": "months",
            "transaction_amount": amount,
            "currency_id": "MXN",
            "start_date": start.isoformat(),
            "end_date": end.isoformat(),
        },
        "back_url": back_url,
        "notification_url": notification_url,
        "status": "pending",
    }

    result = sdk.preapproval().create(body)
    status_code = result.get("status") if isinstance(result, dict) else None
    resp = _unwrap(result)

    if status_code and status_code >= 400:
        logger.warning("Mercado Pago preapproval error: %s", resp)
        cause = resp.get("message") or resp.get("error") or str(resp)
        raise RuntimeError(cause if isinstance(cause, str) else "Error al crear el cobro en Mercado Pago.")

    init_point = _init_point_from_create(result)
    preapproval_id = str(resp.get("id") or "")

    if not init_point or not preapproval_id:
        logger.warning("Respuesta MP inesperada: %s", resp)
        raise RuntimeError("No se recibió enlace de pago de Mercado Pago.")

    pending.preapproval_id = preapproval_id
    pending.save(update_fields=["preapproval_id", "updated_on"])

    return init_point, preapproval_id


def provision_pending_if_eligible(pending: PendingCompanyRegistration) -> bool:
    """
    Idempotente: crea tenant y envía correo de activación si aún no está provisionado.
    """
    from api.modules.onboarding.services import create_company_with_default_users, send_activation_email

    if pending.status == PendingCompanyRegistration.Status.PROVISIONED:
        return False

    with transaction.atomic():
        locked = (
            PendingCompanyRegistration.objects.select_for_update()
            .filter(pk=pending.pk)
            .first()
        )
        if not locked or locked.status == PendingCompanyRegistration.Status.PROVISIONED:
            return False

        try:
            payload = create_company_with_default_users(
                first_name=locked.first_name,
                last_name=locked.last_name,
                email=locked.email,
                company_name=locked.company_name,
            )
            send_activation_email(
                to_email=locked.email,
                username=payload["admin_user"].username,
                raw_token=payload["activation_raw_token"],
            )
            locked.status = PendingCompanyRegistration.Status.PROVISIONED
            locked.save(update_fields=["status", "updated_on"])
        except ValidationError as exc:
            logger.warning("Provision validation: %s", exc)
            locked.status = PendingCompanyRegistration.Status.FAILED
            locked.save(update_fields=["status", "updated_on"])
            return False
    return True


def sync_preapproval_and_provision(preapproval_id: str) -> None:
    """Consulta estado del preapproval; si está authorized, provisiona."""
    sdk = _mp_sdk()
    if sdk is None:
        logger.warning("MP webhook: SDK no configurado.")
        return

    result = sdk.preapproval().get(preapproval_id)
    resp = _unwrap(result)
    status = (resp.get("status") or "").lower()
    ext_ref = str(resp.get("external_reference") or "")

    if status != "authorized":
        logger.info("Preapproval %s status=%s (sin provisionar)", preapproval_id, status)
        return

    pending = PendingCompanyRegistration.objects.filter(
        preapproval_id=preapproval_id,
    ).first()
    if not pending and ext_ref:
        try:
            import uuid as uuid_mod

            u = uuid_mod.UUID(ext_ref)
            pending = PendingCompanyRegistration.objects.filter(external_reference=u).first()
        except (ValueError, TypeError):
            pending = None

    if not pending:
        logger.warning("Preapproval %s sin PendingCompanyRegistration asociado.", preapproval_id)
        return

    pending.status = PendingCompanyRegistration.Status.AUTHORIZED
    pending.save(update_fields=["status", "updated_on"])
    provision_pending_if_eligible(pending)


def handle_payment_notification(payment_id: str) -> None:
    """Refuerzo: algunos flujos notifican payment; intentamos obtener preapproval_id."""
    sdk = _mp_sdk()
    if sdk is None:
        return

    result = sdk.payment().get(payment_id)
    resp = _unwrap(result)
    meta = resp.get("metadata") if isinstance(resp.get("metadata"), dict) else {}
    pid = meta.get("preapproval_id")
    if pid:
        sync_preapproval_and_provision(str(pid))
