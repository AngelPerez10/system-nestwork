from __future__ import annotations

from rest_framework.permissions import BasePermission, SAFE_METHODS
from rest_framework.request import Request

from workspace.models import UserProfile


class IsPlatformSuperadmin(BasePermission):
    message = "Se requiere rol de superadministrador."

    def has_permission(self, request: Request, view) -> bool:
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        profile = getattr(request.user, "profile", None)
        return bool(profile and profile.platform_role == UserProfile.PlatformRole.SUPERADMIN)


class IsPlatformAdmin(BasePermission):
    message = "Se requiere rol de administrador o superior."

    def has_permission(self, request: Request, view) -> bool:
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        profile = getattr(request.user, "profile", None)
        if not profile:
            return False
        return profile.platform_role in (
            UserProfile.PlatformRole.SUPERADMIN,
            UserProfile.PlatformRole.ADMIN_EMPRESA,
        )


class IsPlatformAdminOrSuperadmin(BasePermission):
    message = "Se requiere rol de administrador de empresa o superior."

    def has_permission(self, request: Request, view) -> bool:
        return IsPlatformAdmin().has_permission(request, view)


class CanManageUsers(BasePermission):
    message = "No tienes permiso para gestionar usuarios."

    def has_permission(self, request: Request, view) -> bool:
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        profile = getattr(request.user, "profile", None)
        if not profile:
            return False
        if profile.platform_role in (
            UserProfile.PlatformRole.SUPERADMIN,
            UserProfile.PlatformRole.ADMIN_EMPRESA,
        ):
            return True
        if profile.permissions and isinstance(profile.permissions, dict):
            usuarios = profile.permissions.get("usuarios", {})
            if isinstance(usuarios, dict):
                return usuarios.get("view", False)
        return False


class HasModulePermission(BasePermission):
    message = "No tienes permiso para acceder a este módulo."

    def __init__(self, module: str, action: str = "view"):
        self._module = module
        self._action = action

    def has_permission(self, request: Request, view) -> bool:
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        profile = getattr(request.user, "profile", None)
        if not profile:
            return False
        if profile.platform_role in (
            UserProfile.PlatformRole.SUPERADMIN,
            UserProfile.PlatformRole.ADMIN_EMPRESA,
        ):
            return True
        if profile.permissions and isinstance(profile.permissions, dict):
            module_perms = profile.permissions.get(self._module, {})
            if isinstance(module_perms, dict):
                return module_perms.get(self._action, False)
        return False

    def __call__(self):
        return self


def require_module(module: str, action: str = "view") -> HasModulePermission:
    return HasModulePermission(module, action)


class IsTenantMember(BasePermission):
    message = "Usuario no pertenece a esta empresa."

    def has_permission(self, request: Request, view) -> bool:
        if not request.user or not request.user.is_authenticated:
            return False
        from api.modules.users.services import (
            is_platform_superadmin,
            tenant_membership_exists,
            tenant_schema_name,
        )
        if is_platform_superadmin(request.user):
            return True
        schema = tenant_schema_name()
        if schema == "public":
            return False
        return tenant_membership_exists(schema_name=schema, user_id=request.user.id)
