from django.urls import path

from ContactoNegocio import views

urlpatterns = [
    path("clientes/", views.clientes_collection, name="api-clientes"),
    path("clientes/<int:cliente_id>/", views.cliente_detail, name="api-cliente-detail"),
]

