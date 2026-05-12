from io import BytesIO

from django.core.files.uploadedfile import InMemoryUploadedFile
from rest_framework import status
from rest_framework.decorators import api_view, parser_classes, permission_classes
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from api.modules.users.services import tenant_schema_name
from api.utils import r2_storage
from api.utils.orden_media import assert_max_fotos, normalize_fotos_refs_list
from MiEscritorio.services.tareas_service import (
    can_access_tarea,
    can_tareas,
    get_assigned_user_id,
    serialize_tarea,
    visible_tareas_queryset,
)
from MiEscritorio.tareas.models import Tarea


def _reject_public_schema():
    if tenant_schema_name() == "public":
        return Response({"detail": "No encontrado"}, status=404)
    return None


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def tareas_collection(request):
    public_guard = _reject_public_schema()
    if public_guard:
        return public_guard

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

    refs_raw = data.get("fotos_refs") if "fotos_refs" in data else data.get("fotos_urls")
    refs = normalize_fotos_refs_list(refs_raw)
    try:
        assert_max_fotos(refs)
    except ValueError as exc:
        return Response({"detail": str(exc)}, status=400)

    tarea = Tarea.objects.create(
        usuario_asignado_id=get_assigned_user_id(request.user, data.get("usuario_asignado")),
        descripcion=descripcion,
        fotos_urls=refs,
        estado=(data.get("estado") or Tarea.Estado.BACKLOG),
        orden=int(data.get("orden") or 0),
        creado_por=request.user,
    )
    return Response(serialize_tarea(tarea), status=status.HTTP_201_CREATED)


@api_view(["PUT", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def tarea_detail(request, tarea_id: int):
    public_guard = _reject_public_schema()
    if public_guard:
        return public_guard

    try:
        tarea = visible_tareas_queryset(request.user).get(pk=tarea_id)
    except Tarea.DoesNotExist:
        return Response({"detail": "No encontrado"}, status=404)
    if not can_access_tarea(request.user, tarea):
        return Response({"detail": "No encontrado"}, status=404)

    if request.method == "DELETE":
        if not can_tareas(request.user, "delete"):
            return Response({"detail": "No autorizado"}, status=403)
        old_refs = normalize_fotos_refs_list(
            tarea.fotos_urls if isinstance(tarea.fotos_urls, list) else []
        )
        r2_storage.delete_tenant_photo_refs(old_refs)
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
    if "fotos_refs" in data or "fotos_urls" in data:
        prev_refs = normalize_fotos_refs_list(
            tarea.fotos_urls if isinstance(tarea.fotos_urls, list) else []
        )
        refs = normalize_fotos_refs_list(
            data.get("fotos_refs") if "fotos_refs" in data else data.get("fotos_urls")
        )
        try:
            assert_max_fotos(refs)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=400)
        new_set = set(refs)
        removed = [r for r in prev_refs if r not in new_set]
        r2_storage.delete_tenant_photo_refs(removed)
        tarea.fotos_urls = refs
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
@parser_classes([MultiPartParser, FormParser, JSONParser])
def tareas_upload_image(request):
    public_guard = _reject_public_schema()
    if public_guard:
        return public_guard

    if not (can_tareas(request.user, "create") or can_tareas(request.user, "edit")):
        return Response({"detail": "No autorizado"}, status=403)

    folder = "tareas/fotos"
    upload_file = request.FILES.get("image")
    if upload_file is not None:
        folder = (request.POST.get("folder") or folder).strip() or folder
        if not r2_storage.r2_enabled():
            return Response(
                {"detail": "Almacenamiento R2 no configurado."},
                status=503,
            )
        raw = upload_file.read()
        mem = InMemoryUploadedFile(
            BytesIO(raw),
            field_name="image",
            name=getattr(upload_file, "name", "photo.jpg") or "photo.jpg",
            content_type=getattr(upload_file, "content_type", "image/jpeg") or "image/jpeg",
            size=len(raw),
            charset=None,
        )
        try:
            key, url = r2_storage.upload_image_for_tenant(file_obj=mem, folder=folder)
        except PermissionError:
            return Response({"detail": "No autorizado"}, status=403)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=400)
        except RuntimeError as exc:
            return Response({"detail": str(exc)}, status=503)
        return Response({"url": url, "key": key, "public_id": ""}, status=201)

    data = request.data if isinstance(request.data, dict) else {}
    data_url = (data.get("data_url") or "").strip()
    folder = (data.get("folder") or folder).strip() or folder
    if not data_url.startswith("data:image/"):
        return Response({"detail": "Imagen inválida"}, status=400)
    if r2_storage.r2_enabled():
        try:
            mem = r2_storage.data_url_to_in_memory_file(data_url)
            key, url = r2_storage.upload_image_for_tenant(file_obj=mem, folder=folder)
            return Response({"url": url, "key": key, "public_id": ""}, status=201)
        except PermissionError:
            return Response({"detail": "No autorizado"}, status=403)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=400)
        except RuntimeError as exc:
            return Response({"detail": str(exc)}, status=503)
    return Response({"url": data_url[:2_000_000], "key": "", "public_id": ""}, status=201)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def tareas_delete_image(request):
    public_guard = _reject_public_schema()
    if public_guard:
        return public_guard

    if not (can_tareas(request.user, "edit") or can_tareas(request.user, "delete")):
        return Response({"detail": "No autorizado"}, status=403)

    data = request.data if isinstance(request.data, dict) else {}
    key = (data.get("key") or "").strip()
    if key and r2_storage.r2_enabled():
        try:
            r2_storage.delete_object_for_tenant(key)
        except PermissionError:
            return Response({"detail": "No autorizado"}, status=403)
    return Response(status=status.HTTP_204_NO_CONTENT)
