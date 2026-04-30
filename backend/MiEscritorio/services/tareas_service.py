from django.contrib.auth import get_user_model
from django.db.models import Q

from api.modules.users.services import get_or_create_profile, visible_users_queryset
from api.permissions_data import default_permissions_for_user
from MiEscritorio.tareas.models import Tarea

User = get_user_model()


def can_tareas(user, action: str) -> bool:
    profile = get_or_create_profile(user)
    permissions = profile.permissions or default_permissions_for_user(user)
    mod = permissions.get("tareas") if isinstance(permissions, dict) else {}
    if not isinstance(mod, dict):
        return False
    return bool(mod.get(action, False))


def is_staff_like(user) -> bool:
    return bool(getattr(user, "is_staff", False) or getattr(user, "is_superuser", False))


def visible_tareas_queryset(request_user):
    qs = Tarea.objects.select_related("usuario_asignado", "creado_por").all()
    if is_staff_like(request_user):
        return qs
    # Non-staff users can only access tasks they created or are assigned to.
    return qs.filter(Q(usuario_asignado_id=request_user.id) | Q(creado_por_id=request_user.id))


def can_access_tarea(request_user, tarea: Tarea) -> bool:
    if is_staff_like(request_user):
        return True
    return bool(
        tarea.usuario_asignado_id == request_user.id or tarea.creado_por_id == request_user.id
    )


def serialize_tarea(tarea: Tarea) -> dict:
    usuario = tarea.usuario_asignado
    creador = tarea.creado_por
    full_name = ""
    if usuario:
        full_name = f"{(usuario.first_name or '').strip()} {(usuario.last_name or '').strip()}".strip()
    return {
        "id": tarea.id,
        "usuario_asignado": usuario.id if usuario else None,
        "usuario_asignado_username": usuario.get_username() if usuario else "",
        "usuario_asignado_full_name": full_name,
        "estado": tarea.estado,
        "orden": tarea.orden,
        "descripcion": tarea.descripcion or "",
        "fotos_urls": tarea.fotos_urls if isinstance(tarea.fotos_urls, list) else [],
        "fecha_creacion": tarea.fecha_creacion.isoformat() if tarea.fecha_creacion else "",
        "fecha_actualizacion": (
            tarea.fecha_actualizacion.isoformat() if tarea.fecha_actualizacion else ""
        ),
        "creado_por": creador.id if creador else None,
        "creado_por_username": creador.get_username() if creador else "",
    }


def get_assigned_user_id(request_user, raw_user_id):
    if request_user.is_staff or request_user.is_superuser:
        if raw_user_id in (None, "", 0):
            return None
        try:
            uid = int(raw_user_id)
            allowed_qs = visible_users_queryset(
                requesting_user=request_user, include_superusers=False
            )
            return allowed_qs.filter(pk=uid).values_list("id", flat=True).first()
        except (TypeError, ValueError):
            return None
    return request_user.id
