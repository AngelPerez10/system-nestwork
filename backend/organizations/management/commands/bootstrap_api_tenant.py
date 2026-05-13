"""
Link the API hostname to a tenant (Organization + Domain) for django-tenants.

Without a Domain row for the host that Gunicorn serves (e.g. system-nestwork.onrender.com),
requests fall back to the ``public`` schema and tenant-only endpoints return 404.

Usage (Render shell, API service)::

    python manage.py bootstrap_api_tenant \\
        --hostname system-nestwork.onrender.com \\
        --company-name "Mi empresa"

    # Vincular un usuario ya existente en schema public a esta empresa (OrganizationUser),
    # para que el login pueda sincronizarlo al schema del tenant:
    python manage.py bootstrap_api_tenant \\
        --hostname system-nestwork.onrender.com \\
        --grant-email="admin@tu-dominio.com"

Idempotent: if the domain already exists, exits successfully (domain is globally unique).
"""

from __future__ import annotations

import re
from urllib.parse import urlparse

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django_tenants.utils import schema_context

from api.modules.onboarding.services import unique_org_slug, unique_schema_name
from organizations.models import Domain, Organization, OrganizationUser


def _normalize_hostname(raw: str) -> str:
    s = (raw or "").strip()
    if not s:
        raise CommandError("--hostname is required.")
    if "://" in s:
        parsed = urlparse(s)
        host = parsed.hostname
        if not host:
            raise CommandError(f"Could not parse hostname from URL: {raw!r}")
        s = host
    else:
        s = s.split("/")[0].strip()
    s = s.strip().lower().strip(".")
    if not s or ".." in s or "/" in s or " " in s:
        raise CommandError(f"Invalid hostname: {raw!r}")
    if not re.fullmatch(r"[a-z0-9][a-z0-9.-]*", s):
        raise CommandError(
            f"Hostname must be a DNS name (lowercase letters, digits, dots, hyphens): {s!r}"
        )
    return s


def _grant_membership(*, email: str, organization: Organization, stdout, style) -> None:
    """Create OrganizationUser in public schema (idempotent)."""
    raw = (email or "").strip()
    if not raw:
        raise CommandError("--grant-email must be non-empty when provided.")
    User = get_user_model()
    with schema_context("public"):
        user = User.objects.filter(email__iexact=raw).first()
        if not user:
            raise CommandError(
                f"No hay usuario con correo {raw!r} en el schema public. "
                "Crea el usuario primero (createsuperuser / registro) o usa otro correo."
            )
        _, created = OrganizationUser.objects.get_or_create(organization=organization, user=user)
    if created:
        stdout.write(
            style.SUCCESS(
                f"Membresía creada: {raw!r} → organización {organization.slug!r} (schema {organization.schema_name!r}). "
                "El próximo login sincronizará el usuario al schema del tenant."
            )
        )
    else:
        stdout.write(
            style.WARNING(
                f"El usuario {raw!r} ya era miembro de {organization.slug!r}; no se modificó nada."
            )
        )


class Command(BaseCommand):
    help = (
        "Create or reuse an Organization and attach the API hostname as a primary Domain "
        "(django-tenants). Optionally grant an existing public user membership to that org."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--hostname",
            required=True,
            help="API host only, e.g. system-nestwork.onrender.com (https:// is optional)",
        )
        parser.add_argument(
            "--company-name",
            default="Empresa principal",
            help="Display name for a new Organization (ignored if domain already exists).",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show actions without writing to the database.",
        )
        parser.add_argument(
            "--skip-migrate",
            action="store_true",
            help="Do not run migrate_schemas for the tenant after creating a new Organization.",
        )
        parser.add_argument(
            "--grant-email",
            default="",
            help=(
                "Correo de un usuario existente en schema public: crea OrganizationUser "
                "para la organización asociada a --hostname (idempotente)."
            ),
        )

    def handle(self, *args, **options):
        hostname = _normalize_hostname(options["hostname"])
        company_name = (options["company_name"] or "").strip() or "Empresa principal"
        dry_run = bool(options["dry_run"])
        skip_migrate = bool(options["skip_migrate"])
        grant_email = (options.get("grant_email") or "").strip()

        org: Organization | None = None
        created_new = False

        with schema_context("public"):
            existing = Domain.objects.filter(domain__iexact=hostname).select_related("tenant").first()
            if existing:
                org = existing.tenant
                self.stdout.write(
                    self.style.SUCCESS(
                        f"Domain {hostname!r} already maps to organization "
                        f"{org.slug!r} (schema {org.schema_name!r})."
                    )
                )
            elif dry_run:
                schema_guess = unique_schema_name(company_name)
                slug_guess = unique_org_slug(company_name)
                self.stdout.write(
                    self.style.WARNING(
                        f"[dry-run] Would create Organization(schema={schema_guess!r}, "
                        f"slug={slug_guess!r}) and Domain({hostname!r})."
                    )
                )
                if grant_email:
                    self.stdout.write(
                        self.style.WARNING(
                            f"[dry-run] Would grant membership to {grant_email!r} for that organization."
                        )
                    )
                return
            else:
                schema_name = unique_schema_name(company_name)
                slug = unique_org_slug(company_name)
                with transaction.atomic():
                    org = Organization.objects.create(
                        name=company_name[:255],
                        schema_name=schema_name,
                        slug=slug,
                    )
                    Domain.objects.create(domain=hostname, tenant=org, is_primary=True)
                created_new = True

        if org is None:
            raise CommandError("Internal error: organization not resolved.")

        if created_new:
            self.stdout.write(
                self.style.SUCCESS(
                    f"Created organization {org.slug!r} (schema {org.schema_name!r}) "
                    f"with primary domain {hostname!r}."
                )
            )
            if skip_migrate:
                self.stdout.write(
                    self.style.WARNING(
                        "Skipped migrate_schemas. If this is a new schema, run: "
                        f'python manage.py migrate_schemas --schema="{org.schema_name}"'
                    )
                )
            else:
                self.stdout.write(f"Applying migrations to tenant schema {org.schema_name!r} …")
                try:
                    call_command(
                        "migrate_schemas",
                        schema_name=org.schema_name,
                        interactive=False,
                        verbosity=1,
                    )
                except Exception as exc:
                    raise CommandError(
                        f"migrate_schemas failed for {org.schema_name!r}: {exc}. "
                        f'Fix the error, then run: python manage.py migrate_schemas --schema="{org.schema_name}"'
                    ) from exc
                self.stdout.write(self.style.SUCCESS("migrate_schemas completed for the new tenant."))

        if grant_email:
            if dry_run:
                self.stdout.write(
                    self.style.WARNING(
                        f"[dry-run] Would grant {grant_email!r} membership to {org.slug!r}."
                    )
                )
            else:
                _grant_membership(
                    email=grant_email,
                    organization=org,
                    stdout=self.stdout,
                    style=self.style,
                )
