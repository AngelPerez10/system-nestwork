"""
Rutas que antes se usaban solo con PUBLIC_SCHEMA_URLCONF.

Ahora `PUBLIC_SCHEMA_URLCONF` y `ROOT_URLCONF` apuntan a `config.urls` (misma lista de rutas en
público y en tenant). Este módulo se conserva como referencia o para pruebas locales si se vuelve
a separar la URLconf pública.
"""
from django.urls import include, path

from api import views

urlpatterns = [
    path("healthz", views.health_public, name="healthz"),
    path("api/health/", views.health_public, name="api-health-public"),
    # Auth + sesión (login, refresh, logout) y /api/me/* deben existir en público cuando el host
    # cae en schema public (p. ej. SHOW_PUBLIC_IF_NO_TENANT_FOUND o API sin Domain de empresa).
    path("api/", include("api.modules.auth.urls")),
    path("api/", include("api.modules.users.urls")),
    path("api/", include("api.modules.onboarding.urls")),
    path("api/", include("api.modules.superadmin.urls")),
]
