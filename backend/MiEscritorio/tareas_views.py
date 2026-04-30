"""Compat layer: keep old imports working while project moves to MiEscritorio.views."""

from MiEscritorio.views.tareas import (  # noqa: F401
    tarea_detail,
    tareas_collection,
    tareas_delete_image,
    tareas_upload_image,
)
