from __future__ import annotations

from datetime import date

from django.core.cache import cache
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from api.modules.users.services import tenant_schema_name, visible_users_queryset


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


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def ordenes_tecnico_opciones(request):
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
    rows = _read_list("ordenes")
    if request.method == "GET":
        return Response(_paginate(request, rows))

    payload = request.data if isinstance(request.data, dict) else {}
    item_id = _next_id(rows)
    item = {"id": item_id, "idx": item_id, **payload}
    rows.append(item)
    _write_list("ordenes", rows)
    return Response(item, status=201)


@api_view(["GET", "PATCH", "PUT", "DELETE"])
@permission_classes([IsAuthenticated])
def ordenes_detail(request, orden_id: int):
    rows = _read_list("ordenes")
    row = next((r for r in rows if int(r.get("id", 0)) == orden_id), None)
    if not row:
        return Response({"detail": "No encontrado"}, status=404)

    if request.method == "GET":
        return Response(row)
    if request.method == "DELETE":
        _write_list("ordenes", [r for r in rows if int(r.get("id", 0)) != orden_id])
        return Response(status=204)

    patch = request.data if isinstance(request.data, dict) else {}
    row.update(patch)
    _write_list("ordenes", rows)
    return Response(row)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def ordenes_reportes_semanales(_request):
    return Response({"results": []})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def ordenes_upload_image(request):
    data = request.data if isinstance(request.data, dict) else {}
    url = (data.get("data_url") or "").strip()
    return Response({"url": url, "public_id": ""}, status=201)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def ordenes_delete_image(_request):
    return Response(status=204)


@api_view(["PATCH", "PUT"])
@permission_classes([IsAuthenticated])
def ordenes_update_photos(request, orden_id: int):
    rows = _read_list("ordenes")
    row = next((r for r in rows if int(r.get("id", 0)) == orden_id), None)
    if not row:
        return Response({"detail": "No encontrado"}, status=404)
    payload = request.data if isinstance(request.data, dict) else {}
    if "fotos_urls" in payload:
        row["fotos_urls"] = payload.get("fotos_urls") or []
    _write_list("ordenes", rows)
    return Response(row)


@api_view(["GET", "PUT", "PATCH"])
@permission_classes([IsAuthenticated])
def ordenes_levantamiento(request, orden_id: int):
    key = f"ordenes_levantamiento:{orden_id}"
    if request.method == "GET":
        return Response(cache.get(_bucket_key(key), {}))
    payload = request.data if isinstance(request.data, dict) else {}
    cache.set(_bucket_key(key), payload, timeout=None)
    return Response(payload)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def ordenes_pdf(_request, orden_id: int):
    return Response({"url": f"/api/ordenes/{orden_id}/pdf/"})


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def servicios_collection(request):
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
    payload = request.data if isinstance(request.data, dict) else {}
    return Response({"ok": True, "preview": payload})

