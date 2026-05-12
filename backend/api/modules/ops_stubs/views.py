from __future__ import annotations

from datetime import date

from django.conf import settings
from django.core.cache import cache
from django.core.files.uploadedfile import InMemoryUploadedFile
from io import BytesIO
from rest_framework.decorators import api_view, parser_classes, permission_classes
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from api.modules.users.services import tenant_schema_name, visible_users_queryset
from api.utils.orden_media import (
    assert_max_fotos,
    migrate_row_fotos_refs,
    normalize_fotos_refs_list,
    orden_public_dict,
    strip_legacy_fotos_urls_from_store,
)
from api.utils import r2_storage


def _bucket_key(name: str) -> str:
    return f"ops_stub:{tenant_schema_name()}:{name}"


def _read_list(name: str) -> list[dict]:
    value = cache.get(_bucket_key(name), [])
    return value if isinstance(value, list) else []


def _write_list(name: str, rows: list[dict]) -> None:
    cache.set(_bucket_key(name), rows, timeout=None)


def _next_id(rows: list[dict]) -> int:
    return max([int(r.get("id", 0)) for r in rows] + [0]) + 1


def _paginate(request, rows: list[dict]) -> dict:
    try:
        page = max(1, int(request.query_params.get("page", "1")))
    except Exception:
        page = 1
    try:
        page_size = max(1, int(request.query_params.get("page_size", "20")))
    except Exception:
        page_size = 20
    start = (page - 1) * page_size
    end = start + page_size
    return {"count": len(rows), "results": rows[start:end]}


def _reject_stub_surface():
    if not getattr(settings, "ENABLE_OPS_STUBS", False):
        return Response({"detail": "No encontrado"}, status=404)
    if tenant_schema_name() == "public":
        return Response({"detail": "No encontrado"}, status=404)
    return None


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def ordenes_tecnico_opciones(request):
    guard = _reject_stub_surface()
    if guard:
        return guard
    users = visible_users_queryset(requesting_user=request.user).order_by("id")[:200]
    rows = []
    for u in users:
        rows.append(
            {
                "id": u.id,
                "username": u.username,
                "email": u.email or "",
                "first_name": u.first_name or "",
                "last_name": u.last_name or "",
            }
        )
    return Response(rows)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def ordenes_collection(request):
    guard = _reject_stub_surface()
    if guard:
        return guard
    rows = _read_list("ordenes")
    if request.method == "GET":
        page = _paginate(request, rows)
        page["results"] = [orden_public_dict(dict(r)) for r in page["results"]]
        return Response(page)

    payload = dict(request.data) if isinstance(request.data, dict) else {}
    refs_in = None
    if "fotos_refs" in payload:
        refs_in = normalize_fotos_refs_list(payload.pop("fotos_refs", []))
    elif "fotos_urls" in payload:
        refs_in = normalize_fotos_refs_list(payload.pop("fotos_urls", []))
    payload.pop("fotos_urls", None)

    if refs_in is not None:
        try:
            assert_max_fotos(refs_in)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=400)

    item_id = _next_id(rows)
    item = {"id": item_id, "idx": item_id, **payload}
    if refs_in is not None:
        item["fotos_refs"] = refs_in
    migrate_row_fotos_refs(item)
    strip_legacy_fotos_urls_from_store(item)
    rows.append(item)
    _write_list("ordenes", rows)
    return Response(orden_public_dict(item), status=201)


@api_view(["GET", "PATCH", "PUT", "DELETE"])
@permission_classes([IsAuthenticated])
def ordenes_detail(request, orden_id: int):
    guard = _reject_stub_surface()
    if guard:
        return guard
    rows = _read_list("ordenes")
    row = next((r for r in rows if int(r.get("id", 0)) == orden_id), None)
    if not row:
        return Response({"detail": "No encontrado"}, status=404)

    migrate_row_fotos_refs(row)

    if request.method == "GET":
        return Response(orden_public_dict(row))
    if request.method == "DELETE":
        old_refs = normalize_fotos_refs_list(row.get("fotos_refs") if isinstance(row.get("fotos_refs"), list) else [])
        r2_storage.delete_tenant_photo_refs(old_refs)
        _write_list("ordenes", [r for r in rows if int(r.get("id", 0)) != orden_id])
        return Response(status=204)

    patch = dict(request.data) if isinstance(request.data, dict) else {}
    refs_updated = False
    refs: list[str] = []
    if "fotos_refs" in patch:
        refs = normalize_fotos_refs_list(patch.pop("fotos_refs", []))
        refs_updated = True
    elif "fotos_urls" in patch:
        refs = normalize_fotos_refs_list(patch.pop("fotos_urls", []))
        refs_updated = True

    patch.pop("fotos_urls", None)

    if refs_updated:
        try:
            assert_max_fotos(refs)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=400)
        old_refs = normalize_fotos_refs_list(row.get("fotos_refs") if isinstance(row.get("fotos_refs"), list) else [])
        new_set = set(refs)
        removed = [r for r in old_refs if r not in new_set]
        r2_storage.delete_tenant_photo_refs(removed)
        row["fotos_refs"] = refs

    row.update(patch)
    migrate_row_fotos_refs(row)
    strip_legacy_fotos_urls_from_store(row)
    _write_list("ordenes", rows)
    return Response(orden_public_dict(row))


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def ordenes_reportes_semanales(_request):
    guard = _reject_stub_surface()
    if guard:
        return guard
    return Response({"results": []})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def ordenes_upload_image(request):
    guard = _reject_stub_surface()
    if guard:
        return guard

    folder = "ordenes/fotos"
    upload_file = request.FILES.get("image")

    if upload_file is not None:
        folder = (request.POST.get("folder") or folder).strip() or folder
        if not r2_storage.r2_enabled():
            return Response(
                {"detail": "Almacenamiento R2 no configurado. Define R2_ACCOUNT_ID, R2_BUCKET, R2_ACCESS_KEY_ID y R2_SECRET_ACCESS_KEY."},
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
def ordenes_delete_image(request):
    guard = _reject_stub_surface()
    if guard:
        return guard
    data = request.data if isinstance(request.data, dict) else {}
    key = (data.get("key") or "").strip()
    if key and r2_storage.r2_enabled():
        try:
            r2_storage.delete_object_for_tenant(key)
        except PermissionError:
            return Response({"detail": "No autorizado"}, status=403)
    return Response(status=204)


@api_view(["PATCH", "PUT"])
@permission_classes([IsAuthenticated])
def ordenes_update_photos(request, orden_id: int):
    guard = _reject_stub_surface()
    if guard:
        return guard
    rows = _read_list("ordenes")
    row = next((r for r in rows if int(r.get("id", 0)) == orden_id), None)
    if not row:
        return Response({"detail": "No encontrado"}, status=404)
    migrate_row_fotos_refs(row)
    payload = dict(request.data) if isinstance(request.data, dict) else {}
    if "fotos_refs" in payload:
        refs = normalize_fotos_refs_list(payload.get("fotos_refs"))
    elif "fotos_urls" in payload:
        refs = normalize_fotos_refs_list(payload.get("fotos_urls"))
    else:
        return Response({"detail": "fotos_refs o fotos_urls requerido"}, status=400)
    try:
        assert_max_fotos(refs)
    except ValueError as exc:
        return Response({"detail": str(exc)}, status=400)
    old_refs = normalize_fotos_refs_list(row.get("fotos_refs") if isinstance(row.get("fotos_refs"), list) else [])
    new_set = set(refs)
    removed = [r for r in old_refs if r not in new_set]
    r2_storage.delete_tenant_photo_refs(removed)
    row["fotos_refs"] = refs
    strip_legacy_fotos_urls_from_store(row)
    _write_list("ordenes", rows)
    return Response(orden_public_dict(row))


@api_view(["GET", "PUT", "PATCH"])
@permission_classes([IsAuthenticated])
def ordenes_levantamiento(request, orden_id: int):
    guard = _reject_stub_surface()
    if guard:
        return guard
    key = f"ordenes_levantamiento:{orden_id}"
    if request.method == "GET":
        return Response(cache.get(_bucket_key(key), {}))
    payload = request.data if isinstance(request.data, dict) else {}
    cache.set(_bucket_key(key), payload, timeout=None)
    return Response(payload)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def ordenes_pdf(_request, orden_id: int):
    guard = _reject_stub_surface()
    if guard:
        return guard
    return Response({"url": f"/api/ordenes/{orden_id}/pdf/"})


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def servicios_collection(request):
    guard = _reject_stub_surface()
    if guard:
        return guard
    rows = _read_list("servicios")
    if request.method == "GET":
        q = (request.query_params.get("search") or "").strip().lower()
        filtered = rows if not q else [r for r in rows if q in str(r.get("nombre", "")).lower()]
        return Response(_paginate(request, filtered))

    payload = request.data if isinstance(request.data, dict) else {}
    item_id = _next_id(rows)
    item = {"id": item_id, "idx": item_id, "activo": True, **payload}
    rows.append(item)
    _write_list("servicios", rows)
    return Response(item, status=201)


@api_view(["GET", "PATCH", "PUT", "DELETE"])
@permission_classes([IsAuthenticated])
def servicios_detail(request, servicio_id: int):
    guard = _reject_stub_surface()
    if guard:
        return guard
    rows = _read_list("servicios")
    row = next((r for r in rows if int(r.get("id", 0)) == servicio_id), None)
    if not row:
        return Response({"detail": "No encontrado"}, status=404)
    if request.method == "GET":
        return Response(row)
    if request.method == "DELETE":
        _write_list("servicios", [r for r in rows if int(r.get("id", 0)) != servicio_id])
        return Response(status=204)
    patch = request.data if isinstance(request.data, dict) else {}
    row.update(patch)
    _write_list("servicios", rows)
    return Response(row)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def conceptos_collection(request):
    guard = _reject_stub_surface()
    if guard:
        return guard
    rows = _read_list("conceptos")
    if request.method == "GET":
        return Response(_paginate(request, rows))
    payload = request.data if isinstance(request.data, dict) else {}
    item_id = _next_id(rows)
    item = {"id": item_id, "folio": str(item_id), **payload}
    rows.append(item)
    _write_list("conceptos", rows)
    return Response(item, status=201)


@api_view(["GET", "PATCH", "PUT", "DELETE"])
@permission_classes([IsAuthenticated])
def conceptos_detail(request, concepto_id: int):
    guard = _reject_stub_surface()
    if guard:
        return guard
    rows = _read_list("conceptos")
    row = next((r for r in rows if int(r.get("id", 0)) == concepto_id), None)
    if not row:
        return Response({"detail": "No encontrado"}, status=404)
    if request.method == "GET":
        return Response(row)
    if request.method == "DELETE":
        _write_list("conceptos", [r for r in rows if int(r.get("id", 0)) != concepto_id])
        return Response(status=204)
    patch = request.data if isinstance(request.data, dict) else {}
    row.update(patch)
    _write_list("conceptos", rows)
    return Response(row)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def cotizaciones_collection(request):
    guard = _reject_stub_surface()
    if guard:
        return guard
    rows = _read_list("cotizaciones")
    if request.method == "GET":
        q = (request.query_params.get("search") or "").strip().lower()
        filtered = rows
        if q:
            filtered = [r for r in rows if q in str(r.get("cliente_nombre") or r.get("cliente") or "").lower()]
        return Response(_paginate(request, filtered))

    payload = request.data if isinstance(request.data, dict) else {}
    item_id = _next_id(rows)
    item = {
        "id": item_id,
        "idx": item_id,
        "fecha": payload.get("fecha") or date.today().isoformat(),
        "items": payload.get("items") if isinstance(payload.get("items"), list) else [],
        **payload,
    }
    rows.append(item)
    _write_list("cotizaciones", rows)
    return Response(item, status=201)


@api_view(["GET", "PATCH", "PUT", "DELETE"])
@permission_classes([IsAuthenticated])
def cotizaciones_detail(request, cotizacion_id: int):
    guard = _reject_stub_surface()
    if guard:
        return guard
    rows = _read_list("cotizaciones")
    row = next((r for r in rows if int(r.get("id", 0)) == cotizacion_id), None)
    if not row:
        return Response({"detail": "No encontrado"}, status=404)
    if request.method == "GET":
        return Response(row)
    if request.method == "DELETE":
        _write_list("cotizaciones", [r for r in rows if int(r.get("id", 0)) != cotizacion_id])
        return Response(status=204)
    patch = request.data if isinstance(request.data, dict) else {}
    row.update(patch)
    _write_list("cotizaciones", rows)
    return Response(row)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def cotizaciones_pdf_preview(request):
    guard = _reject_stub_surface()
    if guard:
        return guard
    payload = request.data if isinstance(request.data, dict) else {}
    return Response({"ok": True, "preview": payload})

