from .base import *

DEBUG = False

if not SECRET_KEY:
    raise ValueError(
        "DJANGO_SECRET_KEY must be set in production (long random string, keep secret)."
    )

# Required when DEBUG is False (Django deployment checklist)
if not ALLOWED_HOSTS or ALLOWED_HOSTS == ["localhost", "127.0.0.1"]:
    raise ValueError(
        "Production requires ALLOWED_HOSTS to be set to your real API hostnames."
    )

SHOW_PUBLIC_IF_NO_TENANT_FOUND = False

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

if not CORS_ALLOWED_ORIGINS:
    raise ValueError(
        "Production requires CORS_ALLOWED_ORIGINS (exact frontend origins), not wildcards."
    )

CSRF_TRUSTED_ORIGINS = env.list("CSRF_TRUSTED_ORIGINS", default=CORS_ALLOWED_ORIGINS)
