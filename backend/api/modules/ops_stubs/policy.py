"""
Whether cache-backed ops stub endpoints (órdenes, cotizaciones, servicios, …) are exposed.

Security model
--------------
- **Production** (`config.settings.production`): `ENABLE_OPS_STUBS` defaults to **false**.
  Set `ENABLE_OPS_STUBS=true` in the environment only when you intentionally accept
  cache-backed demo data until a persistence-backed API exists.
- **Development**: `ENABLE_OPS_STUBS` defaults to **true** (see `development.py`).
- **Tenant boundary**: views still reject the `public` schema so unmapped API hosts
  cannot use stub buckets even if stubs were mis-enabled.
"""

from __future__ import annotations

from django.conf import settings


def is_ops_stub_api_enabled() -> bool:
    """Return True if ops_stubs HTTP handlers should run (subject to public-schema guard in views)."""
    return bool(getattr(settings, "ENABLE_OPS_STUBS", False))
