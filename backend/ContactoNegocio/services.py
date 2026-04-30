from api.modules.users.services import get_or_create_profile
from api.permissions_data import default_permissions_for_user
from ContactoNegocio.models import Cliente


def can_clientes(user, action: str) -> bool:
    profile = get_or_create_profile(user)
    permissions = profile.permissions or default_permissions_for_user(user)
    mod = permissions.get("clientes") if isinstance(permissions, dict) else {}
    if not isinstance(mod, dict):
        return False
    return bool(mod.get(action, False))


def visible_clientes_queryset(_request_user):
    # Model lives in tenant schema; queryset already isolated by tenant.
    return Cliente.objects.all()


def serialize_cliente(cliente: Cliente) -> dict:
    contactos = [
        {
            "id": c.id,
            "cliente": cliente.id,
            "nombre_apellido": c.nombre_apellido or "",
            "titulo": c.titulo or "",
            "area_puesto": c.area_puesto or "",
            "celular": c.celular or "",
            "correo": c.correo or "",
            "is_principal": bool(c.is_principal),
        }
        for c in cliente.contactos.all()
    ]
    documento = None
    doc = getattr(cliente, "documento", None)
    if doc:
        documento = {
            "id": doc.id,
            "cliente": cliente.id,
            "url": doc.url or "",
            "public_id": doc.public_id or "",
            "nombre_original": doc.nombre_original or "",
            "size_bytes": doc.size_bytes,
        }
    return {
        "id": cliente.id,
        "idx": cliente.idx,
        "no_cliente": cliente.no_cliente or "",
        "clave": cliente.clave or "",
        "representante": cliente.representante or "",
        "nombre": cliente.nombre or "",
        "telefono": cliente.telefono or "",
        "celular": cliente.celular or "",
        "direccion": cliente.direccion or "",
        "correo": cliente.correo or "",
        "calle": cliente.calle or "",
        "numero_exterior": cliente.numero_exterior or "",
        "interior": cliente.interior or "",
        "colonia": cliente.colonia or "",
        "codigo_postal": cliente.codigo_postal or "",
        "ciudad": cliente.ciudad or "",
        "pais": cliente.pais or "",
        "estado": cliente.estado or "",
        "localidad": cliente.localidad or "",
        "municipio": cliente.municipio or "",
        "rfc": cliente.rfc or "",
        "curp": cliente.curp or "",
        "aplica_retenciones": bool(cliente.aplica_retenciones),
        "desglosar_ieps": bool(cliente.desglosar_ieps),
        "numero_precio": cliente.numero_precio or "",
        "limite_credito": str(cliente.limite_credito) if cliente.limite_credito is not None else None,
        "dias_credito": cliente.dias_credito,
        "descuento_pct": (
            str(cliente.descuento_pct) if cliente.descuento_pct is not None else None
        ),
        "notas": cliente.notas or "",
        "portal_web": cliente.portal_web or "",
        "nombre_facturacion": cliente.nombre_facturacion or "",
        "numero_facturacion": cliente.numero_facturacion or "",
        "domicilio_facturacion": cliente.domicilio_facturacion or "",
        "calle_envio": cliente.calle_envio or "",
        "numero_envio": cliente.numero_envio or "",
        "colonia_envio": cliente.colonia_envio or "",
        "codigo_postal_envio": cliente.codigo_postal_envio or "",
        "pais_envio": cliente.pais_envio or "",
        "estado_envio": cliente.estado_envio or "",
        "ciudad_envio": cliente.ciudad_envio or "",
        "tipo": cliente.tipo,
        "is_prospecto": bool(cliente.is_prospecto),
        "fecha_creacion": cliente.fecha_creacion.isoformat() if cliente.fecha_creacion else "",
        "fecha_actualizacion": (
            cliente.fecha_actualizacion.isoformat() if cliente.fecha_actualizacion else ""
        ),
        "contactos": contactos,
        "documento": documento,
    }

