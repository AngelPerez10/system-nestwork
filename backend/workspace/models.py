from django.conf import settings
from django.db import models


class UserProfile(models.Model):
    """
    Per usuario en el schema actual (público o tenant): permisos JSON, firma y avatar.
    """

    class PlatformRole(models.TextChoices):
        SUPERADMIN = "SUPERADMIN", "Superadministrador"
        ADMIN_EMPRESA = "ADMIN_EMPRESA", "Administrador empresa"
        TECNICO = "TECNICO", "Tecnico"

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="profile",
    )
    platform_role = models.CharField(
        max_length=32,
        choices=PlatformRole.choices,
        default=PlatformRole.TECNICO,
    )
    permissions = models.JSONField(default=dict, blank=True)
    signature_data = models.TextField(blank=True, default="")
    signature_updated_at = models.DateTimeField(null=True, blank=True)
    avatar_url = models.TextField(blank=True, default="")

    class Meta:
        verbose_name = "Perfil de usuario"
        verbose_name_plural = "Perfiles de usuario"

    def __str__(self) -> str:
        return f"Profile({self.user_id})"


class SecurityAuditEvent(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="security_events",
    )
    action = models.CharField(max_length=120)
    target_user_id = models.IntegerField(null=True, blank=True)
    schema_name = models.CharField(max_length=63, blank=True, default="")
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        verbose_name = "Evento de seguridad"
        verbose_name_plural = "Eventos de seguridad"
