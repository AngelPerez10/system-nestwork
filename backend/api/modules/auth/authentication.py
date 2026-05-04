from __future__ import annotations

from typing import Optional

from rest_framework.request import Request
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken


class CookieOrHeaderJWTAuthentication(JWTAuthentication):
    """
    Authenticate with Bearer header first, then fallback to httpOnly cookie.

    If a token is present but invalid/expired, returns None instead of raising —
    this allows views with AllowAny (like login) to proceed normally even when
    the browser sends a stale cookie.
    """

    cookie_name = "access_token"

    def authenticate(self, request: Request):
        header = self.get_header(request)
        if header is not None:
            # Header present — try to validate, but don't crash on invalid tokens
            try:
                return super().authenticate(request)
            except (TokenError, InvalidToken):
                return None

        raw_token = self._get_cookie_token(request)
        if not raw_token:
            return None

        try:
            validated_token = self.get_validated_token(raw_token)
            return self.get_user(validated_token), validated_token
        except (TokenError, InvalidToken):
            # Token present but invalid/expired — treat as unauthenticated
            return None

    def _get_cookie_token(self, request: Request) -> Optional[str]:
        token = request.COOKIES.get(self.cookie_name)
        if not token:
            return None
        token = token.strip()
        return token or None

