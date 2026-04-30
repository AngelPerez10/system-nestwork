from .base import *

DEBUG = env.bool("DJANGO_DEBUG", default=True)

# SECRET_KEY is now required in base.py for security
# Set DJANGO_SECRET_KEY in your .env file (even for development)
# python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'

# django-tenants: local dev often hits localhost without a tenant domain match
SHOW_PUBLIC_IF_NO_TENANT_FOUND = True

if not CORS_ALLOWED_ORIGINS:
    CORS_ALLOWED_ORIGINS = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]

# Permite frontend/backend en IP local (ej. 192.168.x.x:5173 -> 192.168.x.x:8000).
CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^http://[a-z0-9-]+\.localtest\.me:(5173|4173|8000)$",
    r"^http://192\.168\.\d{1,3}\.\d{1,3}:(5173|4173|8000)$",
    r"^http://10\.\d{1,3}\.\d{1,3}\.\d{1,3}:(5173|4173|8000)$",
    r"^http://172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}:(5173|4173|8000)$",
]

# En desarrollo permite acceder por IP LAN sin romper por DisallowedHost.
ALLOWED_HOSTS = ["*"]

# Dev-only: Cookies no seguras para desarrollo local
# En production.py se fuerzan a True
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False

# Dev-only: do not use in production
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
