"""Superadmin business logic — separated from views for testability."""

import logging
from typing import Any

from django.db import DatabaseError, models
from django_tenants.utils import schema_context

from organizations.models import Organization, OrganizationUser

logger = logging.getLogger(__name__)


def list_companies() -> list[dict[str, Any]]:
    """Return all organizations with annotated user counts (no N+1)."""
    with schema_context("public"):
        orgs = (
            Organization.objects.annotate(
                users_count=models.Count("memberships"),
            )
            .order_by("-created_on")
        )
        return [
            {
                "id": org.id,
                "name": org.name,
                "schema_name": org.schema_name,
                "slug": org.slug,
                "users_count": org.users_count,
                "created_on": org.created_on.isoformat() if org.created_on else "",
            }
            for org in orgs
        ]


def get_company_detail(company_id: int) -> dict[str, Any] | None:
    """Return single organization with user count, or None if not found."""
    with schema_context("public"):
        try:
            org = (
                Organization.objects.annotate(
                    users_count=models.Count("memberships"),
                )
                .get(pk=company_id)
            )
        except Organization.DoesNotExist:
            return None
        return {
            "id": org.id,
            "name": org.name,
            "schema_name": org.schema_name,
            "slug": org.slug,
            "users_count": org.users_count,
            "created_on": org.created_on.isoformat() if org.created_on else "",
        }


def create_company(*, name: str, schema_name: str) -> tuple[dict[str, Any] | None, str | None]:
    """
    Create a new organization with a unique slug.
    Returns (company_dict, None) on success or (None, error_message) on failure.
    """
    with schema_context("public"):
        if Organization.objects.filter(schema_name=schema_name).exists():
            return None, "Ya existe una empresa con ese schema."

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
        except DatabaseError as exc:
            logger.exception("Failed to create organization: %s", schema_name)
            return None, "No se pudo crear la empresa. Intenta de nuevo."

        return {
            "id": org.id,
            "name": org.name,
            "schema_name": org.schema_name,
            "slug": org.slug,
            "users_count": 0,
            "created_on": org.created_on.isoformat() if org.created_on else "",
        }, None


def update_company_name(company_id: int, new_name: str) -> tuple[dict[str, Any] | None, str | None]:
    """Update organization name. Returns (company_dict, None) or (None, error)."""
    with schema_context("public"):
        try:
            org = Organization.objects.get(pk=company_id)
        except Organization.DoesNotExist:
            return None, "Empresa no encontrada."

        org.name = new_name
        org.save(update_fields=["name"])

        users_count = OrganizationUser.objects.filter(organization=org).count()
        return {
            "id": org.id,
            "name": org.name,
            "schema_name": org.schema_name,
            "slug": org.slug,
            "users_count": users_count,
            "created_on": org.created_on.isoformat() if org.created_on else "",
        }, None


def delete_company(company_id: int) -> str | None:
    """
    Delete organization if it has no members.
    Returns None on success, or error message.
    """
    with schema_context("public"):
        try:
            org = Organization.objects.get(pk=company_id)
        except Organization.DoesNotExist:
            return "Empresa no encontrada."

        members_count = OrganizationUser.objects.filter(organization=org).count()
        if members_count > 0:
            return "No se puede eliminar una empresa con usuarios activos. Desasigna primero."

        org.delete()
        return None


def assign_user_to_company(user_id: int, company_id: int) -> tuple[dict[str, Any] | None, str | None]:
    """Assign a user to an organization. Returns (result_dict, None) or (None, error)."""
    from django.contrib.auth import get_user_model
    User = get_user_model()

    with schema_context("public"):
        try:
            target_user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return None, "Usuario no encontrado."

        try:
            org = Organization.objects.get(pk=company_id)
        except Organization.DoesNotExist:
            return None, "Empresa no encontrada."

        membership, created = OrganizationUser.objects.get_or_create(
            organization=org,
            user=target_user,
        )

    return {
        "detail": "Usuario asignado correctamente.",
        "user_id": int(user_id),
        "company_id": int(company_id),
        "created": created,
    }, None
