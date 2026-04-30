"""Permisos por módulo (CRUD) alineados con el frontend (PermissionsPayload)."""

FULL = {"view": True, "create": True, "edit": True, "delete": True}
VIEW_ONLY = {"view": True, "create": False, "edit": False, "delete": False}
REPORTES_DEFAULT = {"view": True, "create": True, "edit": False, "delete": False}


def default_permissions_admin():
    return {
        "ordenes": dict(FULL),
        "clientes": dict(FULL),
        "productos": dict(FULL),
        "servicios": dict(FULL),
        "cotizaciones": dict(FULL),
        "tareas": dict(FULL),
        "usuarios": dict(FULL),
        "reportes": dict(FULL),
    }


def default_permissions_technician():
    return {
        "ordenes": dict(VIEW_ONLY),
        "clientes": dict(VIEW_ONLY),
        "productos": dict(VIEW_ONLY),
        "servicios": dict(VIEW_ONLY),
        "cotizaciones": dict(VIEW_ONLY),
        "tareas": dict(VIEW_ONLY),
        "usuarios": dict(VIEW_ONLY),
        "reportes": dict(REPORTES_DEFAULT),
    }


def default_permissions_for_user(user) -> dict:
    if user.is_superuser or user.is_staff:
        return default_permissions_admin()
    return default_permissions_technician()


def apply_permission_patch(base: dict, patch: dict) -> dict:
    """Sustituye cada módulo (ordenes, clientes, …) por el dict enviado por el cliente."""
    out = {**base}
    for key, val in (patch or {}).items():
        if isinstance(val, dict):
            out[key] = dict(val)
    return out
