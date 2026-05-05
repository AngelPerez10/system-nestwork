from .base import *

DEBUG = env.bool("DJANGO_DEBUG", default=True)

# Local dev: session cookies + long JWT (see JWT_ACCESS_MINUTES) so closing the browser drops cookies.
AUTH_JWT_SESSION_COOKIES = env.bool("AUTH_JWT_SESSION_COOKIES", default=True)

# SECRET_KEY is now required in base.py for security
# Set DJANGO_SECRET_KEY in your .env file (even for development)
# python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'

# Strict tenant isolation (also in development):
# if host/domain does not match a tenant, return 404 instead of falling back
# to public schema. This avoids accidental data operations in public schema.
SHOW_PUBLIC_IF_NO_TENANT_FOUND = False

# Stubs allowed by default in local development.
ENABLE_OPS_STUBS = env.bool("ENABLE_OPS_STUBS", default=True)

# Keep explicit local origins always allowed, even when CORS_ALLOWED_ORIGINS
# is provided in .env with a partial list.
_dev_default_origins = {
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "http://nestwork.localtest.me:5173",
    "http://nestwork.localtest.me:8000",
}
CORS_ALLOWED_ORIGINS = sorted(set(CORS_ALLOWED_ORIGINS or []).union(_dev_default_origins))

# Permite frontend/backend en IP local (ej. 192.168.x.x:5173 -> 192.168.x.x:8000).
CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^http://[a-z0-9-]+\.localtest\.me:(5173|4173|8000)$",
    r"^http://192\.168\.\d{1,3}\.\d{1,3}:(5173|4173|8000)$",
    r"^http://10\.\d{1,3}\.\d{1,3}\.\d{1,3}:(5173|4173|8000)$",
    r"^http://172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}:(5173|4173|8000)$",
]

# Avoid CSRF origin mismatches on cookie-auth POST requests in local dev.
CSRF_TRUSTED_ORIGINS = sorted(
    set(globals().get("CSRF_TRUSTED_ORIGINS", [])).union(
        {
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://nestwork.localtest.me:5173",
            "http://netswork.localtest.me:5173",
        }
    )
)

# Development ALLOWED_HOSTS: explicit list, never wildcard.
# Wildcard ("*") enables Host header injection that bypasses multi-tenant resolution.
# If you need to access from LAN IP, set ALLOWED_HOSTS in your .env file.
ALLOWED_HOSTS = env.list(
    "ALLOWED_HOSTS",
    default=[
        "localhost",
        "127.0.0.1",
        "localtest.me",
        "*.localtest.me",
    ],
)

# Fail-fast: reject wildcard in any environment (including dev)
if "*" in ALLOWED_HOSTS:
    raise ImproperlyConfigured(
        "ALLOWED_HOSTS must NOT contain '*'. "
        "Use explicit hostnames (e.g. ['localhost', '127.0.0.1', '192.168.1.100'])."
    )

# Dev-only: Cookies no seguras para desarrollo local
# En production.py se fuerzan a True
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False

# Dev-only: CSP relaxed for Vite HMR (hot module replacement)
# In production, these are restricted to "'self'" only
CSP_SCRIPT_SRC = ["'self'", "'unsafe-inline'", "'unsafe-eval'"]  # Vite HMR needs inline+eval
CSP_STYLE_SRC = ["'self'", "'unsafe-inline'"]  # Tailwind + Vite HMR styles
CSP_CONNECT_SRC = [
    "'self'",
    "ws://localhost:*",  # Vite HMR WebSocket
    "ws://127.0.0.1:*",
    "ws://*.localtest.me:*",
    "http://localhost:*",
    "http://127.0.0.1:*",
    "http://*.localtest.me:*",
]
CSP_UPGRADE_INSECURE = False  # Don't upgrade in dev (HTTP is fine locally)

# Dev-only: do not use in production
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
