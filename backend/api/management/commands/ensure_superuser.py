"""
Idempotent superuser creation for deploy (Render, etc.).

Set in the hosting environment (never commit secrets to git):

  ENSURE_SUPERUSER=1
  DJANGO_SUPERUSER_USERNAME=...
  DJANGO_SUPERUSER_EMAIL=...
  DJANGO_SUPERUSER_PASSWORD=...

Run after migrations, e.g. Render Pre-Deploy:
  python manage.py migrate --noinput && python manage.py ensure_superuser
"""

from __future__ import annotations

import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import IntegrityError
from django_tenants.utils import schema_context


def _truthy(val: str | None) -> bool:
    if not val:
        return False
    return val.strip().lower() in ("1", "true", "yes", "on")


class Command(BaseCommand):
    help = "Create a superuser from DJANGO_SUPERUSER_* when ENSURE_SUPERUSER is set (idempotent)."

    def handle(self, *args, **options):
        if not _truthy(os.environ.get("ENSURE_SUPERUSER")):
            self.stdout.write("ensure_superuser: ENSURE_SUPERUSER not enabled; skipping.")
            return

        username = (os.environ.get("DJANGO_SUPERUSER_USERNAME") or "").strip()
        email = (os.environ.get("DJANGO_SUPERUSER_EMAIL") or "").strip()
        password = os.environ.get("DJANGO_SUPERUSER_PASSWORD") or ""

        if not username or not email or not password:
            self.stderr.write(
                "ensure_superuser: missing DJANGO_SUPERUSER_USERNAME, "
                "DJANGO_SUPERUSER_EMAIL, or DJANGO_SUPERUSER_PASSWORD."
            )
            raise SystemExit(1)

        User = get_user_model()
        with schema_context("public"):
            if User.objects.filter(username__iexact=username).exists():
                self.stdout.write(self.style.WARNING(f"Superuser '{username}' already exists; skipping."))
                return
            try:
                User.objects.create_superuser(username=username, email=email, password=password)
            except IntegrityError as exc:
                self.stderr.write(f"ensure_superuser: could not create user: {exc}")
                return

        self.stdout.write(self.style.SUCCESS(f"Created superuser '{username}'."))
