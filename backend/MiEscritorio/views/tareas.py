from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from MiEscritorio.services.tareas_service import (
    can_access_tarea,
    can_tareas,
    get_assigned_user_id,
    serialize_tarea,
    visible_tareas_queryset,
)
from MiEscritorio.tareas.models import Tarea


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def tareas_collection(request):
    if request.method == "GET":
        if not can_tareas(request.user, "view"):
            return Response({"detail": "No autorizado"}, status=403)
        qs = visible_tareas_queryset(request.user).order_by("estado", "orden", "-fecha_creacion")
        return Response([serialize_tarea(t) for t in qs])

    if not can_tareas(request.user, "create"):
        return Response({"detail": "No autorizado"}, status=403)

    data = request.data if isinstance(request.data, dict) else {}
    descripcion = (data.get("descripcion") or "").strip()
    if not descripcion:
        return Response({"detail": "Descripción requerida"}, status=400)

    tarea = Tarea.objects.create(
        usuario_asignado_id=get_assigned_user_id(request.user, data.get("usuario_asignado")),
        descripcion=descripcion,
        fotos_urls=data.get("fotos_urls") if isinstance(data.get("fotos_urls"), list) else [],
        estado=(data.get("estado") or Tarea.Estado.BACKLOG),
        orden=int(data.get("orden") or 0),
        creado_por=request.user,
    )
    return Response(serialize_tarea(tarea), status=status.HTTP_201_CREATED)


@api_view(["PUT", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def tarea_detail(request, tarea_id: int):
    try:
        tarea = visible_tareas_queryset(request.user).get(pk=tarea_id)
    except Tarea.DoesNotExist:
        return Response({"detail": "No encontrado"}, status=404)
    if not can_access_tarea(request.user, tarea):
        return Response({"detail": "No encontrado"}, status=404)

    if request.method == "DELETE":
        if not can_tareas(request.user, "delete"):
            return Response({"detail": "No autorizado"}, status=403)
        tarea.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    if not can_tareas(request.user, "edit"):
        return Response({"detail": "No autorizado"}, status=403)

    data = request.data if isinstance(request.data, dict) else {}
    if "descripcion" in data:
        desc = (data.get("descripcion") or "").strip()
        if not desc:
            return Response({"detail": "Descripción requerida"}, status=400)
        tarea.descripcion = desc
    if "usuario_asignado" in data:
        tarea.usuario_asignado_id = get_assigned_user_id(request.user, data.get("usuario_asignado"))
    if "fotos_urls" in data and isinstance(data.get("fotos_urls"), list):
        tarea.fotos_urls = data.get("fotos_urls")
    if "estado" in data and data.get("estado") in {
        Tarea.Estado.BACKLOG,
        Tarea.Estado.TODO,
        Tarea.Estado.EN_PROGRESO,
        Tarea.Estado.HECHO,
    }:
        tarea.estado = data.get("estado")
    if "orden" in data:
        try:
            tarea.orden = int(data.get("orden") or 0)
        except (TypeError, ValueError):
            pass

    tarea.save()
    return Response(serialize_tarea(tarea))


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def tareas_upload_image(request):
    if not (can_tareas(request.user, "create") or can_tareas(request.user, "edit")):
        return Response({"detail": "No autorizado"}, status=403)
    data = request.data if isinstance(request.data, dict) else {}
    data_url = (data.get("data_url") or "").strip()
    if not data_url.startswith("data:image/"):
        return Response({"detail": "Imagen inválida"}, status=400)
    return Response({"url": data_url[:2_000_000], "public_id": ""}, status=201)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def tareas_delete_image(_request):
    return Response(status=status.HTTP_204_NO_CONTENT)
