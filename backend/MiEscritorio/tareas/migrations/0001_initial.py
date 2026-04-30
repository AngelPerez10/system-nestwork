import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Tarea",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "estado",
                    models.CharField(
                        choices=[
                            ("BACKLOG", "Backlog"),
                            ("TODO", "Por hacer"),
                            ("EN_PROGRESO", "En progreso"),
                            ("HECHO", "Hecho"),
                        ],
                        default="BACKLOG",
                        max_length=20,
                    ),
                ),
                ("orden", models.IntegerField(default=0)),
                ("descripcion", models.TextField(blank=True, default="")),
                ("fotos_urls", models.JSONField(blank=True, default=list)),
                ("fecha_creacion", models.DateTimeField(auto_now_add=True)),
                ("fecha_actualizacion", models.DateTimeField(auto_now=True)),
                (
                    "creado_por",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="tareas_creadas",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "usuario_asignado",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="tareas_asignadas",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name": "Tarea",
                "verbose_name_plural": "Tareas",
                "ordering": ["estado", "orden", "-fecha_creacion"],
            },
        ),
    ]
