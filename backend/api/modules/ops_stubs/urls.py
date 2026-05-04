from django.urls import path

from api.modules.ops_stubs import views


urlpatterns = [
    path("ordenes/", views.ordenes_collection, name="api-ordenes"),
    path("ordenes/<int:orden_id>/", views.ordenes_detail, name="api-ordenes-detail"),
    path("ordenes/tecnico-opciones/", views.ordenes_tecnico_opciones, name="api-ordenes-tecnico-opciones"),
    path("ordenes/reportes-semanales/", views.ordenes_reportes_semanales, name="api-ordenes-reportes-semanales"),
    path("ordenes/upload-image/", views.ordenes_upload_image, name="api-ordenes-upload-image"),
    path("ordenes/delete-image/", views.ordenes_delete_image, name="api-ordenes-delete-image"),
    path("ordenes/<int:orden_id>/update-photos/", views.ordenes_update_photos, name="api-ordenes-update-photos"),
    path("ordenes/<int:orden_id>/levantamiento/", views.ordenes_levantamiento, name="api-ordenes-levantamiento"),
    path("ordenes/<int:orden_id>/pdf/", views.ordenes_pdf, name="api-ordenes-pdf"),
    path("servicios/", views.servicios_collection, name="api-servicios"),
    path("servicios/<int:servicio_id>/", views.servicios_detail, name="api-servicios-detail"),
    path("conceptos/", views.conceptos_collection, name="api-conceptos"),
    path("conceptos/<int:concepto_id>/", views.conceptos_detail, name="api-conceptos-detail"),
    path("cotizaciones/", views.cotizaciones_collection, name="api-cotizaciones"),
    path("cotizaciones/<int:cotizacion_id>/", views.cotizaciones_detail, name="api-cotizaciones-detail"),
    path("cotizaciones/pdf-preview/", views.cotizaciones_pdf_preview, name="api-cotizaciones-pdf-preview"),
]

