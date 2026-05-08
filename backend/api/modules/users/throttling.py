from rest_framework.throttling import UserRateThrottle


class UserManagementRateThrottle(UserRateThrottle):
    """
    Rate limiting para /api/users/accounts/ (GET list y mutaciones).
    El GET se usa en dashboards (p. ej. historial global); 30/hour provocaba 429 con Strict Mode + hot reload.
    """
    rate = "120/minute"


class SuperadminRateThrottle(UserRateThrottle):
    """
    Rate limiting para operaciones superadmin (crear empresas, asignar usuarios).
    """
    scope = "superadmin"


class SupportRequestThrottle(UserRateThrottle):
    """
    Rate limiting para solicitudes de soporte.
    Previene spam en el sistema de soporte.
    """
    rate = "20/hour"  # 20 solicitudes por hora
