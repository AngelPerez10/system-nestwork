from __future__ import annotations

import os
from urllib.parse import urlparse

from .base import *

DEBUG = False

if not SECRET_KEY:
    raise ValueError(
        "DJANGO_SECRET_KEY must be set in production (long random string, keep secret)."
    )


def _render_external_url_parts() -> tuple[str | None, str | None]:
    """Render sets RENDER and RENDER_EXTERNAL_URL (e.g. https://name.onrender.com).

    Returns (hostname, base_origin) for ALLOWED_HOSTS / CORS / CSRF defaults.
    """
    if (os.environ.get("RENDER") or "").strip().lower() not in ("1", "true", "yes", "on"):
        return None, None
    url = (os.environ.get("RENDER_EXTERNAL_URL") or "").strip()
    if not url:
        return None, None
    try:
        p = urlparse(url)
        host = p.hostname
        if p.scheme in ("http", "https") and p.netloc:
            origin = f"{p.scheme}://{p.netloc}".rstrip("/")
        else:
            origin = None
        return host, origin
    except Exception:
        return None, None


_rh, _render_base_origin = _render_external_url_parts()
if _rh:
    _hosts = list(ALLOWED_HOSTS)
    if _rh not in _hosts:
        _hosts.append(_rh)
    ALLOWED_HOSTS = _hosts

# Required when DEBUG is False (Django deployment checklist)
if not ALLOWED_HOSTS or ALLOWED_HOSTS == ["localhost", "127.0.0.1"]:
    raise ValueError(
        "Production requires ALLOWED_HOSTS to be set to your real API hostnames."
    )

SHOW_PUBLIC_IF_NO_TENANT_FOUND = env.bool(
    "SHOW_PUBLIC_IF_NO_TENANT_FOUND",
    default=False,
)

# Hard-stop stubs in production unless there is an explicit temporary override.
ENABLE_OPS_STUBS = env.bool("ENABLE_OPS_STUBS", default=False)

# HTTPS / cookies — see https://docs.djangoproject.com/en/5.2/howto/deployment/checklist/
SECURE_SSL_REDIRECT = env.bool("SECURE_SSL_REDIRECT", default=True)
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_HTTPONLY = True
CSRF_COOKIE_SAMESITE = "Lax"
SESSION_COOKIE_SAMESITE = "Lax"

# JWT Cookie security - MUST be True in production
# This ensures tokens are only sent over HTTPS
AUTH_COOKIE_SECURE = True

# Production: explicit max_age on cookies (aligns with SIMPLE_JWT); do not use session-only cookies here.
AUTH_JWT_SESSION_COOKIES = env.bool("AUTH_JWT_SESSION_COOKIES", default=False)

# Additional security headers (OWASP 2025)
SECURE_HSTS_SECONDS = env.int("SECURE_HSTS_SECONDS", default=31536000)
SECURE_HSTS_INCLUDE_SUBDOMAINS = env.bool("SECURE_HSTS_INCLUDE_SUBDOMAINS", default=True)
SECURE_HSTS_PRELOAD = env.bool("SECURE_HSTS_PRELOAD", default=True)
SECURE_CROSS_ORIGIN_OPENER_POLICY = "same-origin"  # Security: Prevent popup attacks

# CSP: Upgrade HTTP to HTTPS in production
CSP_UPGRADE_INSECURE = True

# On Render, bootstrap CORS/CSRF from the service URL if env is unset (no wildcards).
if _render_base_origin:
    _cors = list(CORS_ALLOWED_ORIGINS) if CORS_ALLOWED_ORIGINS else []
    if _render_base_origin not in _cors:
        _cors.append(_render_base_origin)
    CORS_ALLOWED_ORIGINS = _cors

if not CORS_ALLOWED_ORIGINS:
    raise ValueError(
        "Production requires CORS_ALLOWED_ORIGINS (exact frontend origins), not wildcards. "
        "On Render, set CORS_ALLOWED_ORIGINS or ensure RENDER_EXTERNAL_URL is set."
    )

CSRF_TRUSTED_ORIGINS = env.list("CSRF_TRUSTED_ORIGINS", default=[])
if _render_base_origin:
    _csrf = list(CSRF_TRUSTED_ORIGINS)
    if _render_base_origin not in _csrf:
        _csrf.append(_render_base_origin)
    CSRF_TRUSTED_ORIGINS = _csrf

if not CSRF_TRUSTED_ORIGINS:
    raise ValueError(
        "Production requires CSRF_TRUSTED_ORIGINS. "
        "Set the exact frontend origin URLs (e.g., ['https://app.nestwork.mx']). "
        "On Render, set CSRF_TRUSTED_ORIGINS or ensure RENDER_EXTERNAL_URL is set. "
        "This prevents CSRF attacks on cookie-based auth endpoints."
    )

SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"
