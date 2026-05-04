from rest_framework.throttling import UserRateThrottle


class UserManagementRateThrottle(UserRateThrottle):
    """
    Rate limiting específico para operaciones de gestión de usuarios.
    Más restrictivo que el throttle general de usuario.
    """
    rate = "30/hour"  # 30 operaciones por hora para crear/editar/eliminar usuarios


class SuperadminRateThrottle(UserRateThrottle):
    """
    Rate limiting para operaciones superadmin (crear empresas, asignar usuarios).
    """
    rate = "20/hour"  # 20 operaciones por hora


class SupportRequestThrottle(UserRateThrottle):
    """
    Rate limiting para solicitudes de soporte.
    Previene spam en el sistema de soporte.
    """
    rate = "20/hour"  # 20 solicitudes por hora
