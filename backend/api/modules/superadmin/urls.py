from django.urls import path

from api.modules.superadmin import views

urlpatterns = [
    path("superadmin/companies/", views.superadmin_companies, name="api-superadmin-companies"),
    path(
        "superadmin/companies/<int:company_id>/",
        views.superadmin_company_detail,
        name="api-superadmin-company-detail",
    ),
    path(
        "superadmin/company-memberships/assign/",
        views.superadmin_assign_user,
        name="api-superadmin-assign-user",
    ),
    path(
        "superadmin/role-profiles/",
        views.superadmin_role_profiles,
        name="api-superadmin-role-profiles",
    ),
]
