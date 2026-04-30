from django.conf import settings
from django.db import models


class Tarea(models.Model):
    """Tareas Kanban por empresa (schema tenant / público según migraciones)."""

    class Estado(models.TextChoices):
        BACKLOG = "BACKLOG", "Backlog"
        TODO = "TODO", "Por hacer"
        EN_PROGRESO = "EN_PROGRESO", "En progreso"
        HECHO = "HECHO", "Hecho"

    usuario_asignado = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="tareas_asignadas",
    )
    estado = models.CharField(
        max_length=20,
        choices=Estado.choices,
        default=Estado.BACKLOG,
    )
    orden = models.IntegerField(default=0)
    descripcion = models.TextField(blank=True, default="")
    fotos_urls = models.JSONField(default=list, blank=True)
    creado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="tareas_creadas",
    )
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["estado", "orden", "-fecha_creacion"]
        verbose_name = "Tarea"
        verbose_name_plural = "Tareas"

    def __str__(self) -> str:
        return f"Tarea({self.pk}) {self.descripcion[:40]}"
