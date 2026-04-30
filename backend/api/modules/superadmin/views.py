from django.contrib.auth import get_user_model
from django.db import DatabaseError, connection
from django_tenants.utils import schema_context
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from api.modules.users.services import is_platform_superadmin
from api.modules.users.throttling import SuperadminRateThrottle
from organizations.models import Organization, OrganizationUser

User = get_user_model()


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

    # Force public schema — organizations live exclusively in the shared schema
    with schema_context("public"):
        if request.method == "GET":
            rows = []
            try:
                for org in Organization.objects.order_by("-created_on"):
                    users_count = OrganizationUser.objects.filter(organization=org).count()
                    rows.append({
                        "id": org.id,
                        "name": org.name,
                        "schema_name": org.schema_name,
                        "slug": org.slug,
                        "users_count": users_count,
                        "created_on": org.created_on.isoformat() if org.created_on else "",
                    })
            except DatabaseError:
                return Response({"detail": "Error de base de datos al listar empresas."}, status=500)

            return Response(rows)

        data = request.data if isinstance(request.data, dict) else {}
        name = (data.get("name") or "").strip()
        schema_name = (data.get("schema_name") or "").strip().lower()

        if not name:
            return Response({"detail": "El nombre de la empresa es requerido."}, status=400)
        if not schema_name:
            return Response({"detail": "El schema es requerido."}, status=400)

        if Organization.objects.filter(schema_name=schema_name).exists():
            return Response({"detail": "Ya existe una empresa con ese schema."}, status=400)

        slug_base = schema_name.replace("_", "-")
        slug = slug_base
        counter = 1
        while Organization.objects.filter(slug=slug).exists():
            counter += 1
            slug = f"{slug_base}-{counter}"

        try:
            org = Organization.objects.create(
                name=name,
                schema_name=schema_name,
                slug=slug,
            )
        except Exception as exc:
            return Response({"detail": f"No se pudo crear la empresa: {exc}"}, status=500)

        return Response({
            "id": org.id,
            "name": org.name,
            "schema_name": org.schema_name,
            "slug": org.slug,
            "users_count": 0,
            "created_on": org.created_on.isoformat() if org.created_on else "",
        }, status=201)


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
@throttle_classes([SuperadminRateThrottle])
def superadmin_company_detail(request, company_id: int):
    err = _require_superadmin(request)
    if err:
        return err

    with schema_context("public"):
        try:
            org = Organization.objects.get(pk=company_id)
        except Organization.DoesNotExist:
            return Response({"detail": "Empresa no encontrada."}, status=404)

        if request.method == "GET":
            users_count = OrganizationUser.objects.filter(organization=org).count()
            return Response({
                "id": org.id,
                "name": org.name,
                "schema_name": org.schema_name,
                "slug": org.slug,
                "users_count": users_count,
                "created_on": org.created_on.isoformat() if org.created_on else "",
            })

        if request.method == "DELETE":
            members_count = OrganizationUser.objects.filter(organization=org).count()
            if members_count > 0:
                return Response(
                    {"detail": "No se puede eliminar una empresa con usuarios activos. Desasigna primero."},
                    status=400,
                )
            org.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

        data = request.data if isinstance(request.data, dict) else {}
        if "name" in data:
            new_name = (data.get("name") or "").strip()
            if new_name:
                org.name = new_name

        org.save()

        users_count = OrganizationUser.objects.filter(organization=org).count()
        return Response({
            "id": org.id,
            "name": org.name,
            "schema_name": org.schema_name,
            "slug": org.slug,
            "users_count": users_count,
            "created_on": org.created_on.isoformat() if org.created_on else "",
        })


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

    with schema_context("public"):
        try:
            target_user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response({"detail": "Usuario no encontrado."}, status=404)

        try:
            org = Organization.objects.get(pk=company_id)
        except Organization.DoesNotExist:
            return Response({"detail": "Empresa no encontrada."}, status=404)

        membership, created = OrganizationUser.objects.get_or_create(
            organization=org,
            user=target_user,
        )

    return Response({
        "detail": "Usuario asignado correctamente.",
        "user_id": int(user_id),
        "company_id": int(company_id),
        "created": created,
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def superadmin_role_profiles(request):
    err = _require_superadmin(request)
    if err:
        return err
    return Response([])
