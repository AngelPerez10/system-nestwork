"""Superadmin views — thin layer delegating to services."""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from api.modules.users.services import is_platform_superadmin
from api.modules.users.throttling import SuperadminRateThrottle
from api.modules.superadmin import services as superadmin_services


def _require_superadmin(request):
    if not is_platform_superadmin(request.user):
        return Response(
            {"detail": "Solo super administradores pueden acceder."},
            status=403,
        )
    return None


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
@throttle_classes([SuperadminRateThrottle])
def superadmin_companies(request):
    err = _require_superadmin(request)
    if err:
        return err

    if request.method == "GET":
        try:
            rows = superadmin_services.list_companies()
        except Exception:
            return Response({"detail": "Error de base de datos al listar empresas."}, status=500)
        return Response(rows)

    # POST — create company
    data = request.data if isinstance(request.data, dict) else {}
    name = (data.get("name") or "").strip()
    schema_name = (data.get("schema_name") or "").strip().lower()

    if not name:
        return Response({"detail": "El nombre de la empresa es requerido."}, status=400)
    if not schema_name:
        return Response({"detail": "El schema es requerido."}, status=400)

    company, error = superadmin_services.create_company(name=name, schema_name=schema_name)
    if error:
        return Response({"detail": error}, status=400)
    return Response(company, status=201)


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
@throttle_classes([SuperadminRateThrottle])
def superadmin_company_detail(request, company_id: int):
    err = _require_superadmin(request)
    if err:
        return err

    if request.method == "GET":
        company = superadmin_services.get_company_detail(company_id)
        if company is None:
            return Response({"detail": "Empresa no encontrada."}, status=404)
        return Response(company)

    if request.method == "DELETE":
        error = superadmin_services.delete_company(company_id)
        if error:
            status_code = 404 if "no encontrada" in error else 400
            return Response({"detail": error}, status=status_code)
        return Response(status=status.HTTP_204_NO_CONTENT)

    # PATCH
    data = request.data if isinstance(request.data, dict) else {}
    new_name = (data.get("name") or "").strip()
    if not new_name:
        return Response({"detail": "El nombre es requerido."}, status=400)

    company, error = superadmin_services.update_company_name(company_id, new_name)
    if error:
        return Response({"detail": error}, status=404)
    return Response(company)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@throttle_classes([SuperadminRateThrottle])
def superadmin_assign_user(request):
    err = _require_superadmin(request)
    if err:
        return err

    data = request.data if isinstance(request.data, dict) else {}
    user_id = data.get("user_id")
    company_id = data.get("company_id")

    if not user_id or not company_id:
        return Response({"detail": "user_id y company_id son requeridos."}, status=400)

    result, error = superadmin_services.assign_user_to_company(
        user_id=int(user_id),
        company_id=int(company_id),
    )
    if error:
        return Response({"detail": error}, status=404)
    return Response(result)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def superadmin_role_profiles(request):
    err = _require_superadmin(request)
    if err:
        return err
    return Response([])
