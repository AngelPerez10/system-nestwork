"""
Rutas resueltas cuando el request cae en el schema público (sin tenant).
"""
from django.urls import include, path

from api import views

urlpatterns = [
    path("api/health/", views.health_public, name="api-health-public"),
    path("api/", include("api.modules.onboarding.urls")),
    path("api/", include("api.modules.superadmin.urls")),
]
