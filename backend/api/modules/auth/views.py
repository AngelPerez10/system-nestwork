from django.contrib.auth import authenticate, get_user_model
from django.conf import settings
from django.db import connection
from django.http import JsonResponse
from django_tenants.utils import schema_context
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
import logging

from organizations.models import OrganizationUser
from api.modules.auth.throttling import LoginThrottle
from api.modules.users.services import (
    audit_security_event,
    get_or_create_profile,
    is_platform_superadmin,
    role_for_profile,
    tenant_schema_name,
)

logger = logging.getLogger(__name__)


def _attach_jwt_cookies(response, refresh: RefreshToken) -> None:
    """Set httpOnly JWT cookies; max_age matches SIMPLE_JWT unless session-cookie mode is on."""
    sj = settings.SIMPLE_JWT
    is_debug = getattr(settings, "DEBUG", False)
    session_mode = getattr(settings, "AUTH_JWT_SESSION_COOKIES", False)
    access_max = None if session_mode else int(sj["ACCESS_TOKEN_LIFETIME"].total_seconds())
    refresh_max = None if session_mode else int(sj["REFRESH_TOKEN_LIFETIME"].total_seconds())
    common = {"httponly": True, "secure": not is_debug, "samesite": "Lax"}
    response.set_cookie(
        key="access_token",
        value=str(refresh.access_token),
        max_age=access_max,
        path="/",
        **common,
    )
    response.set_cookie(
        key="refresh_token",
        value=str(refresh),
        max_age=refresh_max,
        path="/api/token/refresh/",
        **common,
    )


def _sync_user_from_public_to_current_schema(user_identifier: str, by_email: bool = False):
    """
    Ensure auth user exists in current tenant schema, cloning from public if needed.
    Keeps same primary key to preserve membership mappings.
    
    SECURITY FIX: Only sync users who are already members of this tenant.
    This prevents Host header attacks from syncing users to unauthorized schemas.
    """
    schema = tenant_schema_name()
    if schema == "public":
        return

    User = get_user_model()
    
    # First, find the user in public schema
    with schema_context("public"):
        if by_email:
            source_user = User.objects.filter(email__iexact=user_identifier).first()
        else:
            source_user = User.objects.filter(username__iexact=user_identifier).first()
        if not source_user:
            return
        
        # SECURITY CRITICAL: Check if user is a member of this tenant BEFORE syncing
        # Superadmins can access all tenants, but regular users must have explicit membership
        if not is_platform_superadmin(source_user):
            if not OrganizationUser.objects.filter(
                organization__schema_name=schema,
                user_id=source_user.id
            ).exists():
                # User is not a member of this tenant - do NOT sync
                return
        
        source_data = {
            "id": source_user.id,
            "username": source_user.username,
            "email": source_user.email,
            "password": source_user.password,
            "is_active": source_user.is_active,
            "is_staff": source_user.is_staff,
            "is_superuser": source_user.is_superuser,
            "first_name": source_user.first_name,
            "last_name": source_user.last_name,
        }

    tenant_user = User.objects.filter(pk=source_data["id"]).first()
    if tenant_user:
        dirty = []
        for key in (
            "username",
            "email",
            "password",
            "is_active",
            "is_staff",
            "is_superuser",
            "first_name",
            "last_name",
        ):
            if getattr(tenant_user, key) != source_data[key]:
                setattr(tenant_user, key, source_data[key])
                dirty.append(key)
        if dirty:
            tenant_user.save(update_fields=dirty)
        get_or_create_profile(tenant_user)
        return

    tenant_user = User(
        id=source_data["id"],
        username=source_data["username"],
        email=source_data["email"],
        password=source_data["password"],
        is_active=source_data["is_active"],
        is_staff=source_data["is_staff"],
        is_superuser=source_data["is_superuser"],
        first_name=source_data["first_name"],
        last_name=source_data["last_name"],
    )
    tenant_user.save(force_insert=True)
    get_or_create_profile(tenant_user)


@api_view(["GET"])
@permission_classes([AllowAny])
def health_public(_request):
    return JsonResponse({"status": "ok", "scope": "public"})


@api_view(["GET"])
@permission_classes([AllowAny])
def health_tenant(_request):
    tenant = getattr(connection, "tenant", None)
    schema = getattr(tenant, "schema_name", None) if tenant else connection.schema_name
    return JsonResponse({"status": "ok", "scope": "tenant", "schema": schema})


@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([LoginThrottle])
def login(request):
    email = (request.data.get("email") or "").strip()
    username = (request.data.get("username") or "").strip()
    password = request.data.get("password")

    if email:
        _sync_user_from_public_to_current_schema(email, by_email=True)
    elif username:
        _sync_user_from_public_to_current_schema(username, by_email=False)

    if not password:
        audit_security_event(
            actor=None,
            action="auth_login_rejected_missing_password",
            schema_name=tenant_schema_name(),
            ip_address=request.META.get("REMOTE_ADDR"),
        )
        return Response({"detail": "Contraseña requerida"}, status=400)
    if not email and not username:
        audit_security_event(
            actor=None,
            action="auth_login_rejected_missing_identity",
            schema_name=tenant_schema_name(),
            ip_address=request.META.get("REMOTE_ADDR"),
        )
        return Response({"detail": "Correo o usuario requerido"}, status=400)

    User = get_user_model()
    if email:
        u = User.objects.filter(email__iexact=email).first()
        if not u:
            audit_security_event(
                actor=None,
                action="auth_login_failed",
                schema_name=tenant_schema_name(),
                ip_address=request.META.get("REMOTE_ADDR"),
                metadata={"reason": "email_not_found"},
            )
            return Response({"detail": "Credenciales inválidas"}, status=401)
        user = authenticate(request, username=u.get_username(), password=password)
    else:
        u = User.objects.filter(username__iexact=username).first()
        if not u:
            audit_security_event(
                actor=None,
                action="auth_login_failed",
                schema_name=tenant_schema_name(),
                ip_address=request.META.get("REMOTE_ADDR"),
                metadata={"reason": "username_not_found"},
            )
            return Response({"detail": "Credenciales inválidas"}, status=401)
        user = authenticate(request, username=u.get_username(), password=password)

    if user is None:
        audit_security_event(
            actor=None,
            action="auth_login_failed",
            schema_name=tenant_schema_name(),
            ip_address=request.META.get("REMOTE_ADDR"),
            metadata={"reason": "bad_credentials"},
        )
        return Response({"detail": "Credenciales inválidas"}, status=401)
    if not user.is_active:
        audit_security_event(
            actor=user,
            action="auth_login_failed_inactive",
            schema_name=tenant_schema_name(),
            ip_address=request.META.get("REMOTE_ADDR"),
        )
        return Response({"detail": "Cuenta desactivada"}, status=401)

    schema = (getattr(getattr(connection, "tenant", None), "schema_name", None) or connection.schema_name or "public").strip()
    if schema != "public":
        if not is_platform_superadmin(user):
            belongs = OrganizationUser.objects.filter(
                organization__schema_name=schema, user_id=user.id
            ).exists()
            if not belongs:
                audit_security_event(
                    actor=user,
                    action="auth_login_failed_wrong_tenant",
                    schema_name=schema,
                    ip_address=request.META.get("REMOTE_ADDR"),
                )
                return Response({"detail": "Usuario no pertenece a esta empresa"}, status=401)

    refresh = RefreshToken.for_user(user)
    profile = get_or_create_profile(user)
    role = role_for_profile(user, profile)
    audit_security_event(
        actor=user,
        action="auth_login_success",
        schema_name=schema,
        ip_address=request.META.get("REMOTE_ADDR"),
    )

    # Security: Set tokens in httpOnly cookies instead of returning in body
    # This prevents XSS attacks from stealing tokens
    response = Response({
        "username": user.get_username(),
        "email": user.email or "",
        "is_staff": user.is_staff,
        "is_superuser": user.is_superuser,
        "first_name": user.first_name or "",
        "last_name": user.last_name or "",
        "role": role,
        "platform_role": profile.platform_role,
    })
    
    _attach_jwt_cookies(response, refresh)

    return response


@api_view(["POST"])
@permission_classes([AllowAny])
def refresh_token(request):
    """
    Refresh access token using refresh token from httpOnly cookie.
    Security: Token is read from cookie, not from request body.
    """
    from django.conf import settings as django_settings
    from rest_framework_simplejwt.exceptions import TokenError as JWTTokenError

    refresh_token_raw = request.COOKIES.get('refresh_token')
    
    if not refresh_token_raw:
        return Response(
            {"detail": "Refresh token not found in cookies"},
            status=401
        )
    
    try:
        old_refresh = RefreshToken(refresh_token_raw)
        
        # Rotate: blacklist old token and issue new one for same user
        old_refresh.blacklist()
        
        # Get user from old token to create new one
        User = get_user_model()
        user_id = old_refresh.payload.get("user_id")
        user = User.objects.get(pk=user_id)
        new_refresh = RefreshToken.for_user(user)
        
        response = Response({"success": True})
        _attach_jwt_cookies(response, new_refresh)

        return response
        
    except User.DoesNotExist:
        logger.warning("Token refresh failed: user not found")
        return Response(
            {"detail": "Invalid or expired refresh token"},
            status=401
        )
    except JWTTokenError:
        logger.warning("Token refresh failed: invalid or expired token")
        return Response(
            {"detail": "Invalid or expired refresh token"},
            status=401
        )
    except Exception:
        logger.exception("Token refresh unexpected error")
        return Response(
            {"detail": "Invalid or expired refresh token"},
            status=401
        )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def logout(request):
    """
    Logout user by clearing httpOnly cookies and blacklisting tokens.
    Security: Ensures tokens cannot be reused after logout.
    """
    try:
        # Get tokens from cookies
        access_token_raw = request.COOKIES.get('access_token')
        refresh_token_raw = request.COOKIES.get('refresh_token')
        
        # Blacklist refresh token if present
        if refresh_token_raw:
            try:
                refresh = RefreshToken(refresh_token_raw)
                refresh.blacklist()
            except Exception:
                pass  # Token may already be expired or invalid — safe to ignore
        
        # Audit logout event
        audit_security_event(
            actor=request.user,
            action="auth_logout",
            schema_name=tenant_schema_name(),
            ip_address=request.META.get("REMOTE_ADDR"),
        )
        
    except Exception as e:
        logger.error(f"Logout error: {e}")
    
    # Clear cookies
    response = Response({"success": True})
    response.delete_cookie('access_token', path='/')
    response.delete_cookie('refresh_token', path='/api/token/refresh/')
    
    return response
