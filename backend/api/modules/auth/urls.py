from django.urls import path

from api.modules.auth import views

urlpatterns = [
    path("health/", views.health_tenant, name="api-health-tenant"),
    path("login/", views.login, name="api-login"),
    path("token/refresh/", views.refresh_token, name="token-refresh"),
    path("logout/", views.logout, name="api-logout"),
]
