from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

import logging
logger = logging.getLogger(__name__)

from api.modules.users.throttling import SupportRequestThrottle, UserManagementRateThrottle
from api.modules.users.services import (
    audit_security_event,
    can_manage_target_user,
    get_or_create_profile,
    is_platform_superadmin,
    notify_support_request,
    staff_required,
    tenant_schema_name,
    user_account_dict,
    visible_users_queryset,
)
from api.permissions_data import apply_permission_patch, default_permissions_for_user
from api.utils.file_upload import validate_signature_upload, validate_image_upload
from organizations.models import Organization, OrganizationUser
from workspace.models import UserProfile

User = get_user_model()


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@throttle_classes([SupportRequestThrottle])
def me_support(request):
    """Mensajes de soporte desde usuarios autenticados (fallos o plan personalizado)."""
    data = request.data if isinstance(request.data, dict) else {}
    category = (data.get("category") or "").strip().lower()
    message = (data.get("message") or "").strip()

    if category not in {"bug", "plan"}:
        return Response(
            {"detail": "category debe ser 'bug' o 'plan'."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if len(message) < 10:
        return Response(
            {"detail": "Escribe al menos 10 caracteres para que podamos ayudarte."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if len(message) > 8000:
        return Response(
            {"detail": "El mensaje no puede superar 8000 caracteres."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        notify_support_request(
            user=request.user,
            tenant_schema=tenant_schema_name(),
            category=category,
            message=message,
        )
    except (ConnectionError, TimeoutError) as exc:
        logger.exception("Support request network error for user %s", request.user.id)
        return Response(
            {"detail": "No se pudo enviar el mensaje. Verifica tu conexión e intenta de nuevo."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    except Exception as exc:
        logger.exception("Support request failed for user %s", request.user.id)
        return Response(
            {"detail": "No se pudo enviar el mensaje. Intenta de nuevo más tarde."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return Response(
        {
            "detail": "Gracias. Recibimos tu mensaje y el equipo te contactará cuando corresponda.",
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def me(request):
    user = request.user
    profile = get_or_create_profile(user)

    if request.method == "GET":
        return Response(user_account_dict(user, profile))

    data = request.data
    if not isinstance(data, dict):
        return Response({"detail": "JSON inválido"}, status=400)

    if "first_name" in data:
        user.first_name = (data.get("first_name") or "")[:150]
    if "last_name" in data:
        user.last_name = (data.get("last_name") or "")[:150]
    if "email" in data:
        user.email = (data.get("email") or "").strip()[:254]
    user.save()

    if "avatar" in data:
        av = data.get("avatar")
        if av == "":
            profile.avatar_url = ""
        elif isinstance(av, str) and av.startswith("data:"):
            # Security: Validate uploaded image before storing
            try:
                # Extract base64 data
                format_, imgstr = av.split(';base64,')
                ext = format_.split('/')[-1]
                decoded_file = base64.b64decode(imgstr)
                
                # Create a mock file object for validation
                from io import BytesIO
                from django.core.files.uploadedfile import SimpleUploadedFile
                
                mock_file = SimpleUploadedFile(
                    f"avatar.{ext}",
                    decoded_file,
                    content_type=f"image/{ext}"
                )
                
                is_valid, error = validate_image_upload(mock_file)
                if not is_valid:
                    logger.warning(f"Avatar upload rejected: {error} (user: {user.id})")
                    audit_security_event(
                        actor=user,
                        action="avatar_upload_rejected",
                        schema_name=tenant_schema_name(),
                        metadata={"reason": error},
                    )
                    return Response({"detail": f"Avatar inválido: {error}"}, status=400)
                
                # Store validated avatar
                profile.avatar_url = av[:2_000_000]
                
                audit_security_event(
                    actor=user,
                    action="avatar_uploaded",
                    schema_name=tenant_schema_name(),
                )
            except (ValueError, TypeError) as e:
                logger.warning(f"Avatar upload decode error: {e} (user: {user.id})")
                return Response({"detail": "Formato de avatar inválido"}, status=400)
            except Exception as e:
                logger.error(f"Avatar upload error: {e}")
                return Response({"detail": "Error al procesar el avatar"}, status=400)
        profile.save(update_fields=["avatar_url"])

    profile.refresh_from_db()
    user.refresh_from_db()
    return Response(user_account_dict(user, profile))


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me_permissions(request):
    profile = get_or_create_profile(request.user)
    return Response({"permissions": profile.permissions})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me_signature(request):
    user = request.user
    profile = get_or_create_profile(user)
    return Response(
        {
            "user": user.id,
            "url": profile.signature_data or "",
            "public_id": "",
            "updated_at": (
                profile.signature_updated_at.isoformat() if profile.signature_updated_at else ""
            ),
        }
    )


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
@throttle_classes([UserManagementRateThrottle])
def users_accounts(request):
    if request.method == "GET":
        memberships_by_user = {}
        if is_platform_superadmin(request.user):
            user_ids = list(
                visible_users_queryset(requesting_user=request.user)
                .order_by("id")
                .values_list("id", flat=True)
            )
            memberships = (
                OrganizationUser.objects.filter(user_id__in=user_ids)
                .select_related("organization")
                .order_by("organization__name", "user_id")
            )
            for m in memberships:
                memberships_by_user.setdefault(m.user_id, m)

        rows = []
        # FIX N+1: Use select_related to fetch profiles in single query
        for u in visible_users_queryset(requesting_user=request.user).select_related("profile").order_by("id"):
            try:
                p = u.profile
            except UserProfile.DoesNotExist:
                p = get_or_create_profile(u)
            row = user_account_dict(u, p)
            membership = memberships_by_user.get(u.id)
            if membership:
                row["organization_id"] = membership.organization_id
                row["organization_name"] = membership.organization.name
                row["organization_schema"] = membership.organization.schema_name
            else:
                row["organization_id"] = None
                row["organization_name"] = ""
                row["organization_schema"] = ""
            rows.append(row)
        return Response(rows)

    if not staff_required(request.user):
        return Response({"detail": "No autorizado"}, status=403)

    data = request.data
    username = (data.get("username") or "").strip()
    password = data.get("password")
    if not username or not password:
        return Response({"detail": "username y password son requeridos"}, status=400)

    if User.objects.filter(username__iexact=username).exists():
        return Response({"detail": "El usuario ya existe"}, status=400)

    schema = tenant_schema_name()
    if schema != "public":
        org = Organization.objects.filter(schema_name=schema).first()
        if org:
            members_count = OrganizationUser.objects.filter(organization=org).count()
            if members_count >= 3:
                return Response(
                    {
                        "detail": "Este plan permite maximo 3 usuarios por empresa. Actualiza plan para agregar mas usuarios.",
                    },
                    status=403,
                )

    # ATOMIC TRANSACTION: Ensure all-or-nothing user creation
    with transaction.atomic():
        user = User.objects.create_user(
            username=username,
            email=(data.get("email") or "").strip()[:254],
            password=password,
            first_name=(data.get("first_name") or "")[:150],
            last_name=(data.get("last_name") or "")[:150],
            is_staff=bool(data.get("is_staff")),
            is_superuser=False,
            is_active=True,
        )
        if schema != "public":
            org = Organization.objects.filter(schema_name=schema).first()
            if org:
                OrganizationUser.objects.get_or_create(organization=org, user=user)

        profile = get_or_create_profile(user)
        profile.permissions = default_permissions_for_user(user)
        profile.save(update_fields=["permissions"])
    
    audit_security_event(
        actor=request.user,
        action="users_create",
        target_user_id=user.id,
        metadata={"schema": tenant_schema_name(), "created_username": user.username},
    )
    return Response(user_account_dict(user, profile), status=201)


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
@throttle_classes([UserManagementRateThrottle])
def users_account_detail(request, user_id: int):
    if not staff_required(request.user):
        return Response({"detail": "No autorizado"}, status=403)

    try:
        target = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        return Response({"detail": "No encontrado"}, status=404)
    if not can_manage_target_user(requesting_user=request.user, target_user=target):
        return Response({"detail": "No encontrado"}, status=404)

    if request.method == "GET":
        p = get_or_create_profile(target)
        return Response(user_account_dict(target, p))

    if request.method == "DELETE":
        if target.id == request.user.id:
            return Response({"detail": "No puede eliminar su propio usuario"}, status=400)
        audit_security_event(
            actor=request.user,
            action="users_delete",
            target_user_id=target.id,
            metadata={"schema": tenant_schema_name(), "deleted_username": target.username},
        )
        with transaction.atomic():
            target.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    data = request.data
    if not isinstance(data, dict):
        return Response({"detail": "JSON inválido"}, status=400)

    if "username" in data:
        nu = (data.get("username") or "").strip()
        if nu and nu != target.username:
            if User.objects.filter(username__iexact=nu).exclude(pk=target.pk).exists():
                return Response({"detail": "El usuario ya existe"}, status=400)
            target.username = nu[:150]
    if "email" in data:
        target.email = (data.get("email") or "").strip()[:254]
    if "first_name" in data:
        target.first_name = (data.get("first_name") or "")[:150]
    if "last_name" in data:
        target.last_name = (data.get("last_name") or "")[:150]
    if "is_staff" in data:
        target.is_staff = bool(data.get("is_staff"))
    if "is_superuser" in data:
        target.is_superuser = False
    if "is_active" in data:
        target.is_active = bool(data.get("is_active"))

    pw = data.get("password")
    pw2 = data.get("password2")
    if pw or pw2:
        if not pw or pw != pw2:
            return Response({"detail": "Las contraseñas no coinciden"}, status=400)
        target.set_password(pw)

    target.save()
    profile = get_or_create_profile(target)
    return Response(user_account_dict(target, profile))


@api_view(["GET", "PUT"])
@permission_classes([IsAuthenticated])
@throttle_classes([UserManagementRateThrottle])
def users_account_permissions(request, user_id: int):
    if not staff_required(request.user):
        return Response({"detail": "No autorizado"}, status=403)

    try:
        target = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        return Response({"detail": "No encontrado"}, status=404)
    if not can_manage_target_user(requesting_user=request.user, target_user=target):
        return Response({"detail": "No encontrado"}, status=404)

    profile = get_or_create_profile(target)

    if request.method == "GET":
        return Response({"permissions": profile.permissions})

    perms = (request.data or {}).get("permissions")
    if not isinstance(perms, dict):
        return Response({"detail": "permissions debe ser un objeto"}, status=400)

    base = default_permissions_for_user(target)
    profile.permissions = apply_permission_patch(base, perms)
    profile.save(update_fields=["permissions"])
    audit_security_event(
        actor=request.user,
        action="users_permissions_update",
        target_user_id=target.id,
        metadata={"schema": tenant_schema_name(), "by_superadmin": is_platform_superadmin(request.user)},
    )
    return Response({"permissions": profile.permissions})


@api_view(["GET", "PUT"])
@permission_classes([IsAuthenticated])
def users_account_signature(request, user_id: int):
    if not staff_required(request.user):
        return Response({"detail": "No autorizado"}, status=403)

    try:
        target = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        return Response({"detail": "No encontrado"}, status=404)
    if not can_manage_target_user(requesting_user=request.user, target_user=target):
        return Response({"detail": "No encontrado"}, status=404)

    profile = get_or_create_profile(target)

    if request.method == "GET":
        return Response(
            {
                "user": target.id,
                "url": profile.signature_data or "",
                "public_id": "",
                "updated_at": (
                    profile.signature_updated_at.isoformat()
                    if profile.signature_updated_at
                    else ""
                ),
            }
        )

    sig = (request.data or {}).get("signature")
    if not isinstance(sig, str):
        return Response({"detail": "signature es requerido"}, status=400)

    # Security: Validate signature image upload
    if sig.startswith("data:"):
        try:
            # Extract base64 data
            format_, imgstr = sig.split(';base64,')
            ext = format_.split('/')[-1]
            decoded_file = base64.b64decode(imgstr)
            
            # Create a mock file object for validation
            from io import BytesIO
            from django.core.files.uploadedfile import SimpleUploadedFile
            
            mock_file = SimpleUploadedFile(
                f"signature.{ext}",
                decoded_file,
                content_type=f"image/{ext}"
            )
            
            is_valid, error = validate_signature_upload(mock_file)
            if not is_valid:
                logger.warning(f"Signature upload rejected: {error} (user: {target.id})")
                audit_security_event(
                    actor=request.user,
                    action="signature_upload_rejected",
                    schema_name=tenant_schema_name(),
                    target_user_id=target.id,
                    metadata={"reason": error},
                )
                return Response({"detail": f"Firma inválida: {error}"}, status=400)
            
            # Store validated signature
            profile.signature_data = sig[:2_000_000]
            
            audit_security_event(
                actor=request.user,
                action="signature_uploaded",
                schema_name=tenant_schema_name(),
                target_user_id=target.id,
            )
        except (ValueError, TypeError) as e:
            logger.warning(f"Signature upload decode error: {e} (user: {target.id})")
            return Response({"detail": "Formato de firma inválido"}, status=400)
        except Exception as e:
            logger.error(f"Signature upload error: {e}")
            return Response({"detail": "Error al procesar la firma"}, status=400)
    else:
        profile.signature_data = sig[:2_000_000]
    
    profile.signature_updated_at = timezone.now()
    profile.save(update_fields=["signature_data", "signature_updated_at"])
    return Response(
        {
            "user": target.id,
            "url": profile.signature_data or "",
            "public_id": "",
            "updated_at": (
                profile.signature_updated_at.isoformat()
                if profile.signature_updated_at
                else ""
            ),
        }
    )
