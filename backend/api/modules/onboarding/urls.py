from django.urls import path

from api.modules.onboarding import views

urlpatterns = [
    path(
        "onboarding/starter-pricing/",
        views.starter_pricing,
        name="api-onboarding-starter-pricing",
    ),
    path(
        "onboarding/create-checkout/",
        views.create_checkout_preference,
        name="api-onboarding-create-checkout",
    ),
    path(
        "onboarding/mercadopago-webhook/",
        views.mercadopago_webhook,
        name="api-onboarding-mercadopago-webhook",
    ),
    path(
        "onboarding/register-company/",
        views.register_company,
        name="api-onboarding-register-company",
    ),
    path(
        "onboarding/set-password/",
        views.set_password,
        name="api-onboarding-set-password",
    ),
    path(
        "onboarding/custom-plan-lead/",
        views.custom_plan_lead,
        name="api-onboarding-custom-plan-lead",
    ),
]
