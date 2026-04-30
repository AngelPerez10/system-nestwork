"""Compatibility wrappers for legacy imports."""

from api.modules.users.services import get_or_create_profile  # noqa: F401
from api.modules.users.views import (  # noqa: F401
    me,
    me_permissions,
    me_signature,
    users_account_detail,
    users_account_permissions,
    users_account_signature,
    users_accounts,
)
