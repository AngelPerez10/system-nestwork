import uuid

from django.conf import settings
from django.db import models
from django_tenants.models import DomainMixin, TenantMixin


class Organization(TenantMixin):
    """
    Una fila por empresa. Cada una recibe un schema PostgreSQL propio (aislamiento fuerte).
    """

    name = models.CharField("Nombre", max_length=255)
    # Slug estable para logging / integraciones (no sustituye schema_name)
    slug = models.SlugField(max_length=63, unique=True)
    created_on = models.DateTimeField(auto_now_add=True)

    auto_create_schema = True
    auto_drop_schema = False

    class Meta:
        verbose_name = "Organización"
        verbose_name_plural = "Organizaciones"

    def __str__(self) -> str:
        return self.name


class Domain(DomainMixin):
    class Meta:
        verbose_name = "Dominio"
        verbose_name_plural = "Dominios"


class OrganizationUser(models.Model):
    """Membresía de usuarios globales a una organización (tenant)."""

    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="memberships",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="organization_memberships",
    )
    created_on = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Membresía de organización"
        verbose_name_plural = "Membresías de organización"
        unique_together = ("organization", "user")

    def __str__(self) -> str:
        return f"{self.organization_id}:{self.user_id}"


class OrganizationLead(models.Model):
    class Plan(models.TextChoices):
        CUSTOM = "custom", "Sistema personalizado"

    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    email = models.EmailField(max_length=254)
    company_name = models.CharField(max_length=255)
    plan = models.CharField(max_length=20, choices=Plan.choices, default=Plan.CUSTOM)
    custom_requirements = models.TextField(
        blank=True,
        default="",
        help_text="Funcionalidades o alcance del sistema que solicita el cliente (plan personalizado).",
    )
    created_on = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Lead de organización"
        verbose_name_plural = "Leads de organización"

    def __str__(self) -> str:
        return f"{self.company_name} <{self.email}>"


class PendingCompanyRegistration(models.Model):
    """
    Registro starter pendiente de pago (Mercado Pago preapproval / suscripción).
    Tras autorización, el webhook provisiona el tenant (idempotente).
    """

    class Status(models.TextChoices):
        PENDING_PAYMENT = "pending_payment", "Pago pendiente"
        AUTHORIZED = "authorized", "Suscripción autorizada"
        PROVISIONED = "provisioned", "Empresa creada"
        FAILED = "failed", "Fallido"
        CANCELLED = "cancelled", "Cancelado"

    external_reference = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    email = models.EmailField(max_length=254, db_index=True)
    company_name = models.CharField(max_length=255)
    plan = models.CharField(max_length=32, default="starter_2_users")

    status = models.CharField(
        max_length=32,
        choices=Status.choices,
        default=Status.PENDING_PAYMENT,
        db_index=True,
    )
    preapproval_id = models.CharField(max_length=64, blank=True, null=True, db_index=True)
    last_notified_payment_id = models.CharField(max_length=64, blank=True, null=True)

    created_on = models.DateTimeField(auto_now_add=True)
    updated_on = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Registro de empresa pendiente"
        verbose_name_plural = "Registros de empresa pendientes"
        indexes = [
            models.Index(fields=["email", "status"]),
        ]

    def __str__(self) -> str:
        return f"{self.company_name} <{self.email}> [{self.status}]"


class OnboardingToken(models.Model):
    class Purpose(models.TextChoices):
        ACTIVATE = "activate", "Activar cuenta"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="onboarding_tokens",
    )
    purpose = models.CharField(max_length=32, choices=Purpose.choices)
    token_hash = models.CharField(max_length=64, unique=True)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)
    created_on = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Token de onboarding"
        verbose_name_plural = "Tokens de onboarding"
        indexes = [
            models.Index(fields=["purpose", "expires_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.user_id}:{self.purpose}"
