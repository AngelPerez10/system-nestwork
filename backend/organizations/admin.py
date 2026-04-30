from django.contrib import admin
from django_tenants.admin import TenantAdminMixin

from .models import Domain, Organization, OrganizationUser


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
