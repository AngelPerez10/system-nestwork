from django.contrib import admin
from django_tenants.admin import TenantAdminMixin

from .models import Domain, Organization, OrganizationUser, PublicAuthAuditEvent


@admin.register(Organization)
class OrganizationAdmin(TenantAdminMixin, admin.ModelAdmin):
    list_display = ("name", "slug", "schema_name", "created_on")
    search_fields = ("name", "slug", "schema_name")


@admin.register(Domain)
class DomainAdmin(admin.ModelAdmin):
    list_display = ("domain", "tenant", "is_primary")
    search_fields = ("domain",)


@admin.register(OrganizationUser)
class OrganizationUserAdmin(admin.ModelAdmin):
    list_display = ("organization", "user", "created_on")
    search_fields = ("organization__name", "organization__slug", "user__username", "user__email")


@admin.register(PublicAuthAuditEvent)
class PublicAuthAuditEventAdmin(admin.ModelAdmin):
    """Solo lectura: trazabilidad de auth en schema público (misma semántica que SecurityAuditEvent)."""

    list_display = ("created_at", "action", "actor", "target_user_id", "schema_name", "ip_address")
    list_filter = ("action",)
    search_fields = ("action", "schema_name", "ip_address")
    ordering = ("-created_at",)
    readonly_fields = (
        "created_at",
        "actor",
        "action",
        "target_user_id",
        "schema_name",
        "ip_address",
        "metadata",
    )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
