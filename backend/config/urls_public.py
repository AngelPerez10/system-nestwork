"""
Rutas resueltas cuando el request cae en el schema público (sin tenant).
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
