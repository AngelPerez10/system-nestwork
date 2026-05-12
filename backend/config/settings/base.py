"""
Base settings: multi-tenant (PostgreSQL schemas), DRF + JWT, security-oriented defaults.
See Django 5.2 deployment checklist: https://docs.djangoproject.com/en/5.2/howto/deployment/checklist/
"""
from datetime import timedelta
from decimal import Decimal
from pathlib import Path

from django.core.exceptions import ImproperlyConfigured
import environ

BASE_DIR = Path(__file__).resolve().parent.parent.parent

env = environ.Env(
    DJANGO_DEBUG=(bool, False),
)

if (BASE_DIR / ".env").exists():
    environ.Env.read_env(BASE_DIR / ".env")

# Filled in development/production; production must validate a strong secret.
SECRET_KEY = env.str("DJANGO_SECRET_KEY")
if not SECRET_KEY:
    raise ImproperlyConfigured(
        "DJANGO_SECRET_KEY environment variable is required. "
        "Set a long random string (min 50 chars) and keep it secret. "
        "Example: python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'"
    )

# Hosts / CORS (override per environment)
ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=["localhost", "127.0.0.1"])

CORS_ALLOWED_ORIGINS = env.list("CORS_ALLOWED_ORIGINS", default=[])
CORS_ALLOW_CREDENTIALS = True

# --- Multi-tenant (schema per empresa) — django-tenants + PostgreSQL only ---
SHARED_APPS = [
    "django_tenants",
    "organizations",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.admin",
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
]

TENANT_APPS = [
    "api",
    "workspace",
    "MiEscritorio.tareas",
    "django.contrib.contenttypes",
    "django.contrib.auth",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.admin",
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "ContactoNegocio",
]

INSTALLED_APPS = list(SHARED_APPS) + [app for app in TENANT_APPS if app not in SHARED_APPS]

TENANT_MODEL = "organizations.Organization"
TENANT_DOMAIN_MODEL = "organizations.Domain"

DATABASE_ROUTERS = ("django_tenants.routers.TenantSyncRouter",)

# Render / Heroku: linked PostgreSQL often exposes DATABASE_URL only.
_database_url = env.str("DATABASE_URL", default="").strip()
if _database_url:
    _db = env.db_url("DATABASE_URL", engine="django_tenants.postgresql_backend")
    _db["CONN_MAX_AGE"] = env.int("POSTGRES_CONN_MAX_AGE", default=60)
    DATABASES = {"default": _db}
else:
    DATABASES = {
        "default": {
            "ENGINE": "django_tenants.postgresql_backend",
            "NAME": env("POSTGRES_DB", default="erp"),
            "USER": env("POSTGRES_USER", default="erp"),
            "PASSWORD": env("POSTGRES_PASSWORD", default="erp"),
            "HOST": env("POSTGRES_HOST", default="localhost"),
            "PORT": env("POSTGRES_PORT", default="5432"),
            "CONN_MAX_AGE": env.int("POSTGRES_CONN_MAX_AGE", default=60),
        }
    }

# Security: Reject default DB credentials in production
_db_password = DATABASES["default"]["PASSWORD"]
_default_db_passwords = {"erp", "password", "postgres", "admin", "root", "123456"}
if _db_password in _default_db_passwords and not env.bool("DJANGO_DEBUG", default=False):
    raise ImproperlyConfigured(
        f"POSTGRES_PASSWORD must not be a known default ('{_db_password}'). "
        "Generate a strong password and set it in your .env file."
    )

MIDDLEWARE = [
    "config.middleware.HostHeaderValidationMiddleware",  # Security: Validate Host BEFORE tenant resolution
    "django_tenants.middleware.main.TenantMainMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "config.middleware.ContentSecurityPolicyMiddleware",  # Security: CSP headers (OWASP 2025: A02)
    "django.contrib.sessions.middleware.SessionMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"
PUBLIC_SCHEMA_URLCONF = "config.urls_public"

WSGI_APPLICATION = "config.wsgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "es-es"
TIME_ZONE = "America/Mexico_City"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Security: Validate ALLOWED_HOSTS in both development and production
# This prevents Host header attacks that could bypass tenant resolution
if not ALLOWED_HOSTS:
    raise ImproperlyConfigured(
        "ALLOWED_HOSTS must be set to at least one valid hostname. "
        "In development use ['localhost', '127.0.0.1']. "
        "In production use your real domain names."
    )

# Fail-fast: wildcard hosts enable Host header injection
if "*" in ALLOWED_HOSTS:
    raise ImproperlyConfigured(
        "ALLOWED_HOSTS must NOT contain '*' (wildcard). "
        "This enables Host header injection attacks that bypass multi-tenant resolution. "
        "Use explicit hostnames instead."
    )

# If no tenant matches Host, fall back to public (dev convenience; disable in production)
SHOW_PUBLIC_IF_NO_TENANT_FOUND = False

# Development stubs for ops endpoints must stay disabled unless explicitly enabled.
# This avoids exposing non-domain/test surfaces in production by mistake.
ENABLE_OPS_STUBS = env.bool("ENABLE_OPS_STUBS", default=env.bool("DJANGO_DEBUG", default=False))

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "api.modules.auth.authentication.CookieOrHeaderJWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticated",),
    "DEFAULT_THROTTLE_CLASSES": (
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ),
    "DEFAULT_THROTTLE_RATES": {
        "anon": env("DRF_THROTTLE_ANON", default="60/hour"),  # Reduced from 100 for security
        "user": env("DRF_THROTTLE_USER", default="500/hour"),  # Reduced from 1000 for security
        "onboarding_register": env("DRF_THROTTLE_ONBOARDING_REGISTER", default="5/hour"),  # Reduced from 10
        "onboarding_set_password": env("DRF_THROTTLE_ONBOARDING_SET_PASSWORD", default="10/hour"),  # Reduced from 30
        "onboarding_lead": env("DRF_THROTTLE_ONBOARDING_LEAD", default="10/hour"),  # Reduced from 20
        "support_request": env("DRF_THROTTLE_SUPPORT_REQUEST", default="10/hour"),  # Reduced from 20
        "login": env("DRF_THROTTLE_LOGIN", default="5/hour"),  # Security: Reduced from 20 to prevent brute force
        "superadmin": env("DRF_THROTTLE_SUPERADMIN", default="120/hour"),
    },
}

# Cookie max_age (when not using session cookies) must match JWT exp — see auth views _attach_jwt_cookies.
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=env.int("JWT_ACCESS_MINUTES", default=1440)),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=env.int("JWT_REFRESH_DAYS", default=14)),
    "ROTATE_REFRESH_TOKENS": True,  # Security: Rotate refresh tokens on use
    "BLACKLIST_AFTER_ROTATION": True,  # Security: Blacklist used refresh tokens
    "UPDATE_LAST_LOGIN": True,
    "ALGORITHM": "HS256",
    "SIGNING_KEY": env.str("JWT_SIGNING_KEY", default=""),  # Separated from SECRET_KEY
    "VERIFYING_KEY": None,
    "AUDIENCE": None,
    "ISSUER": None,
    "JSON_ENCODER": None,
    "JWK_URL": None,
    "LEEWAY": 0,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "AUTH_HEADER_NAME": "HTTP_AUTHORIZATION",
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
    "TOKEN_TYPE_CLAIM": "token_type",
    "JTI_CLAIM": "jti",
    "SLIDING_TOKEN_REFRESH_EXP_CLAIM": "refresh_exp",
    "SLIDING_TOKEN_LIFETIME": timedelta(minutes=5),
    "SLIDING_TOKEN_REFRESH_LIFETIME": timedelta(days=1),
    # Cookie settings for httpOnly tokens (security enhancement)
    "AUTH_COOKIE": "access_token",
    "AUTH_COOKIE_REFRESH": "refresh_token",
    "AUTH_COOKIE_SECURE": env.bool("AUTH_COOKIE_SECURE", default=False),  # True in production
    "AUTH_COOKIE_HTTP_ONLY": True,  # Security: Prevent XSS token theft
    "AUTH_COOKIE_PATH": "/",
    "AUTH_COOKIE_SAMESITE": "Lax",  # Security: CSRF protection
}

# If True: access/refresh cookies omit max_age (browser session — cleared when user closes the browser).
# JWT exp inside the token still applies while the tab stays open; set JWT_ACCESS_MINUTES accordingly.
AUTH_JWT_SESSION_COOKIES = env.bool("AUTH_JWT_SESSION_COOKIES", default=False)

# Validate JWT_SIGNING_KEY: separate from SECRET_KEY to limit blast radius.
# If compromised, only JWT tokens are affected — Django sessions, CSRF, and
# password reset tokens remain protected by SECRET_KEY.
# SECURITY: In production, JWT_SIGNING_KEY must be explicitly set — no fallback to SECRET_KEY.
_jwt_key = SIMPLE_JWT["SIGNING_KEY"]
if not _jwt_key:
    if env.bool("DJANGO_DEBUG", default=False):
        import warnings
        warnings.warn(
            "JWT_SIGNING_KEY is not set. Falling back to DJANGO_SECRET_KEY in DEBUG mode. "
            "Set a separate JWT_SIGNING_KEY in your .env file for proper secret isolation.",
            stacklevel=2,
        )
        SIMPLE_JWT["SIGNING_KEY"] = SECRET_KEY
    else:
        raise ImproperlyConfigured(
            "JWT_SIGNING_KEY environment variable is required in production. "
            "It must be a separate secret from DJANGO_SECRET_KEY for proper secret isolation. "
            "Generate one with: python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'"
        )

# Security: Cookie settings for JWT tokens
# These ensure httpOnly cookies work correctly in production
SESSION_COOKIE_SECURE = env.bool("SESSION_COOKIE_SECURE", default=False)
CSRF_COOKIE_SECURE = env.bool("CSRF_COOKIE_SECURE", default=False)

# OWASP 2025: A02: Security Misconfiguration - Content Security Policy
# CSP headers to prevent XSS and data injection attacks
CSP_REPORT_ONLY = env.bool("CSP_REPORT_ONLY", default=False)  # Set True for testing
CSP_REPORT_URI = env.str("CSP_REPORT_URI", default="")  # Optional: CSP violation reports

# CSP Default Policy (restrictive, adjust per environment)
CSP_DEFAULT_SRC = ["'self'"]
CSP_SCRIPT_SRC = ["'self'"]  # No inline scripts, no eval - React bundles everything
CSP_STYLE_SRC = ["'self'", "'unsafe-inline'"]  # Tailwind CSS requires unsafe-inline
CSP_IMG_SRC = ["'self'", "data:", "https:", "blob:"]  # data: for base64, blob: for previews
CSP_FONT_SRC = ["'self'", "data:"]  # data: for embedded fonts
CSP_CONNECT_SRC = ["'self'"]  # API calls to same origin
CSP_MEDIA_SRC = ["'self'"]
CSP_OBJECT_SRC = ["'none'"]  # Block plugins (Flash, Java, etc.)
CSP_FRAME_ANCESTORS = ["'none'"]  # Prevent clickjacking
CSP_BASE_URI = ["'self'"]
CSP_FORM_ACTION = ["'self'"]
CSP_FRAME_SRC = ["'none'"]
CSP_WORKER_SRC = ["'self'", "blob:"]
CSP_NAVIGATE_TO = None  # Don't restrict navigation (links can go anywhere)
CSP_UPGRADE_INSECURE = env.bool("CSP_UPGRADE_INSECURE", default=False)  # True in production

# Security headers (tightened further in production settings)
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "same-origin"
X_FRAME_OPTIONS = "DENY"

DEFAULT_FROM_EMAIL = env.str("DEFAULT_FROM_EMAIL", default="webmaster@localhost")
SUPPORT_INBOX_EMAIL = env.str("SUPPORT_INBOX_EMAIL", default="")

FRONTEND_BASE_URL = env("FRONTEND_BASE_URL", default="http://localhost:5173")
ONBOARDING_BASE_DOMAIN = env("ONBOARDING_BASE_DOMAIN", default="localtest.me")
ONBOARDING_TOKEN_TTL_HOURS = env.int("ONBOARDING_TOKEN_TTL_HOURS", default=24)

# Mercado Pago (suscripción plan starter). Si ACCESS_TOKEN está definido, el registro
# starter debe usar create-checkout; register-company directo queda deshabilitado salvo ALLOW_REGISTER_WITHOUT_PAYMENT.
MERCADOPAGO_ACCESS_TOKEN = env.str("MERCADOPAGO_ACCESS_TOKEN", default="")
BACKEND_PUBLIC_URL = env.str("BACKEND_PUBLIC_URL", default="http://127.0.0.1:8000")
ALLOW_REGISTER_WITHOUT_PAYMENT = env.bool("ALLOW_REGISTER_WITHOUT_PAYMENT", default=False)

# Precio mostrado: base + IVA 16% (MXN), cobro mensual recurrente vía preapproval.
STARTER_PLAN_BASE_MXN = Decimal(str(env.str("STARTER_PLAN_BASE_MXN", default="200.00")))
STARTER_PLAN_IVA_RATE = Decimal(str(env.str("STARTER_PLAN_IVA_RATE", default="0.16")))

# --- Cloudflare R2 (S3-compatible) — fotos de órdenes / tareas (opcional) ---
# Si falta alguna variable, el backend puede seguir usando refs legacy (data URLs)
# cuando ENABLE_OPS_STUBS u otros stubs están activos; en producción configura R2.
R2_ACCOUNT_ID = env.str("R2_ACCOUNT_ID", default="").strip()
R2_BUCKET_NAME = (env.str("R2_BUCKET", default="") or env.str("R2_BUCKET_NAME", default="")).strip()
R2_ACCESS_KEY_ID = env.str("R2_ACCESS_KEY_ID", default="").strip()
R2_SECRET_ACCESS_KEY = env.str("R2_SECRET_ACCESS_KEY", default="").strip()
