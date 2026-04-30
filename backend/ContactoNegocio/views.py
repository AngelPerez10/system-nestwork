from decimal import Decimal, InvalidOperation

from django.db import transaction
from django.db.models import Q
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from api.modules.users.services import tenant_schema_name
from ContactoNegocio.models import Cliente, ClienteContacto
from ContactoNegocio.services import can_clientes, serialize_cliente, visible_clientes_queryset


def _to_decimal(value, default=None):
    if value in (None, ""):
        return default
    try:
        return Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        return default


def _to_int(value, default=0):
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _apply_cliente_payload(cliente: Cliente, data: dict):
    field_names = {
        "no_cliente",
        "clave",
        "representante",
        "nombre",
        "telefono",
        "celular",
        "direccion",
        "correo",
        "calle",
        "numero_exterior",
        "interior",
        "colonia",
        "codigo_postal",
        "ciudad",
        "pais",
        "estado",
        "localidad",
        "municipio",
        "rfc",
        "curp",
        "notas",
        "portal_web",
        "nombre_facturacion",
        "numero_facturacion",
        "domicilio_facturacion",
        "calle_envio",
        "numero_envio",
        "colonia_envio",
        "codigo_postal_envio",
        "pais_envio",
        "estado_envio",
        "ciudad_envio",
    }
    for key in field_names:
        if key in data:
            setattr(cliente, key, (data.get(key) or "").strip())

    if "tipo" in data and data.get("tipo") in {
        Cliente.Tipo.EMPRESA,
        Cliente.Tipo.PERSONA_FISICA,
        Cliente.Tipo.PROVEEDOR,
    }:
        cliente.tipo = data.get("tipo")

    if "is_prospecto" in data:
        cliente.is_prospecto = bool(data.get("is_prospecto"))
    if "aplica_retenciones" in data:
        cliente.aplica_retenciones = bool(data.get("aplica_retenciones"))
    if "desglosar_ieps" in data:
        cliente.desglosar_ieps = bool(data.get("desglosar_ieps"))
    if "numero_precio" in data:
        cliente.numero_precio = str(data.get("numero_precio") or "1").strip()[:10]
    if "limite_credito" in data:
        cliente.limite_credito = _to_decimal(data.get("limite_credito"), Decimal("0")) or Decimal(
            "0"
        )
    if "descuento_pct" in data:
        cliente.descuento_pct = _to_decimal(data.get("descuento_pct"), None)
    if "dias_credito" in data:
        raw = _to_int(data.get("dias_credito"), 0)
        cliente.dias_credito = max(raw, 0)

    if not (cliente.nombre or "").strip():
        raise ValueError("nombre: Este campo es requerido.")


def _update_contactos(cliente: Cliente, data: dict):
    if "contactos" not in data:
        return
    raw = data.get("contactos")
    if not isinstance(raw, list):
        return
    cliente.contactos.all().delete()
    new_rows = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        new_rows.append(
            ClienteContacto(
                cliente=cliente,
                nombre_apellido=(item.get("nombre_apellido") or "").strip(),
                titulo=(item.get("titulo") or "").strip(),
                area_puesto=(item.get("area_puesto") or "").strip(),
                celular=(item.get("celular") or "").strip(),
                correo=(item.get("correo") or "").strip(),
                is_principal=bool(item.get("is_principal")),
            )
        )
    if new_rows:
        ClienteContacto.objects.bulk_create(new_rows)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def clientes_collection(request):
    if tenant_schema_name() == "public":
        return Response({"detail": "No encontrado"}, status=404)

    if request.method == "GET":
        if not can_clientes(request.user, "view"):
            return Response({"detail": "No autorizado"}, status=403)

        qs = visible_clientes_queryset(request.user).prefetch_related("contactos", "documento")
        search = (request.query_params.get("search") or "").strip().lower()
        tipo = (request.query_params.get("tipo") or "").strip()
        ordering = (request.query_params.get("ordering") or "idx").strip()
        page = _to_int(request.query_params.get("page"), 1)
        page_size = 50

        if search:
            qs = qs.filter(Q(nombre__icontains=search) | Q(correo__icontains=search))
        if tipo in {Cliente.Tipo.EMPRESA, Cliente.Tipo.PERSONA_FISICA, Cliente.Tipo.PROVEEDOR}:
            qs = qs.filter(tipo=tipo)
        if ordering in {"idx", "-idx", "id", "-id", "nombre", "-nombre"}:
            qs = qs.order_by(ordering)
        else:
            qs = qs.order_by("idx")

        page = max(page, 1)
        start = (page - 1) * page_size
        end = start + page_size
        count = qs.count()
        rows = list(qs[start:end])
        return Response(
            {"count": count, "next": None, "previous": None, "results": [serialize_cliente(c) for c in rows]}
        )

    if not can_clientes(request.user, "create"):
        return Response({"detail": "No autorizado"}, status=403)

    data = request.data if isinstance(request.data, dict) else {}
    try:
        with transaction.atomic():
            cliente = Cliente()
            _apply_cliente_payload(cliente, data)
            cliente.save()
            _update_contactos(cliente, data)
            cliente.refresh_from_db()
    except ValueError as exc:
        return Response({"detail": str(exc)}, status=400)
    return Response(serialize_cliente(cliente), status=status.HTTP_201_CREATED)


@api_view(["GET", "PUT", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def cliente_detail(request, cliente_id: int):
    if tenant_schema_name() == "public":
        return Response({"detail": "No encontrado"}, status=404)

    try:
        cliente = visible_clientes_queryset(request.user).prefetch_related("contactos", "documento").get(
            pk=cliente_id
        )
    except Cliente.DoesNotExist:
        return Response({"detail": "No encontrado"}, status=404)

    if request.method == "GET":
        if not can_clientes(request.user, "view"):
            return Response({"detail": "No autorizado"}, status=403)
        return Response(serialize_cliente(cliente))

    if request.method == "DELETE":
        if not can_clientes(request.user, "delete"):
            return Response({"detail": "No autorizado"}, status=403)
        cliente.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    if not can_clientes(request.user, "edit"):
        return Response({"detail": "No autorizado"}, status=403)

    data = request.data if isinstance(request.data, dict) else {}
    try:
        with transaction.atomic():
            _apply_cliente_payload(cliente, data)
            cliente.save()
            _update_contactos(cliente, data)
            cliente.refresh_from_db()
    except ValueError as exc:
        return Response({"detail": str(exc)}, status=400)
    return Response(serialize_cliente(cliente))

