import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("workspace", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name="userprofile",
            name="platform_role",
            field=models.CharField(
                choices=[
                    ("SUPERADMIN", "Superadministrador"),
                    ("ADMIN_EMPRESA", "Administrador empresa"),
                    ("TECNICO", "Tecnico"),
                ],
                default="TECNICO",
                max_length=32,
            ),
        ),
        migrations.CreateModel(
            name="SecurityAuditEvent",
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
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("action", models.CharField(max_length=120)),
                ("target_user_id", models.IntegerField(blank=True, null=True)),
                ("schema_name", models.CharField(blank=True, default="", max_length=63)),
                ("ip_address", models.GenericIPAddressField(blank=True, null=True)),
                ("metadata", models.JSONField(blank=True, default=dict)),
                (
                    "actor",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="security_events",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name": "Evento de seguridad",
                "verbose_name_plural": "Eventos de seguridad",
            },
        ),
    ]

