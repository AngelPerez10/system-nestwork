from django.urls import path

from MiEscritorio.views import tareas

urlpatterns = [
    path("tareas/", tareas.tareas_collection, name="api-tareas"),
    path("tareas/<int:tarea_id>/", tareas.tarea_detail, name="api-tarea-detail"),
    path("tareas/upload-image/", tareas.tareas_upload_image, name="api-tareas-upload-image"),
    path("tareas/delete-image/", tareas.tareas_delete_image, name="api-tareas-delete-image"),
]
