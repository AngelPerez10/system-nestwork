from django.urls import path

from api.modules.users import views

urlpatterns = [
    path("me/support/", views.me_support, name="api-me-support"),
    path("me/", views.me, name="api-me"),
    path("me/permissions/", views.me_permissions, name="api-me-permissions"),
    path("me/signature/", views.me_signature, name="api-me-signature"),
    path("users/accounts/", views.users_accounts, name="api-users-accounts"),
    path(
        "users/accounts/<int:user_id>/",
        views.users_account_detail,
        name="api-users-account-detail",
    ),
    path(
        "users/accounts/<int:user_id>/permissions/",
        views.users_account_permissions,
        name="api-users-account-permissions",
    ),
    path(
        "users/accounts/<int:user_id>/signature/",
        views.users_account_signature,
        name="api-users-account-signature",
    ),
]
