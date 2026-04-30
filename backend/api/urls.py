from django.urls import include, path

urlpatterns = [
    path("", include("api.modules.auth.urls")),
    path("", include("api.modules.onboarding.urls")),
    path("", include("api.modules.users.urls")),
    path("", include("MiEscritorio.urls")),
    path("", include("ContactoNegocio.urls")),
]
