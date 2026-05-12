# Public-schema auth audit (SHARED_APPS); mirrors workspace.SecurityAuditEvent semantics.

from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("organizations", "0006_organizationlead_custom_requirements"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="PublicAuthAuditEvent",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
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
                        on_delete=models.SET_NULL,
                        related_name="public_auth_audit_events",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name": "Auditoría de auth (público)",
                "verbose_name_plural": "Auditorías de auth (público)",
                "indexes": [
                    models.Index(fields=["-created_at"], name="orgs_pubaudit_c_at"),
                    models.Index(fields=["action", "-created_at"], name="orgs_pubaudit_act_ct"),
                ],
            },
        ),
    ]
