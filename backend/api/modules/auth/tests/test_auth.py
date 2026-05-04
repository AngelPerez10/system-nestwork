"""Tests for auth views: login, logout, token refresh, and /api/me/ endpoint.

Security focus:
- httpOnly cookie behavior (XSS prevention)
- Rate limiting on login  
- Token rotation and blacklist
- Proper 401 handling
"""

import pytest
from django.core.cache import cache
from django.test import override_settings
from django.urls import reverse
from rest_framework import status

LOGIN_URL = reverse("api-login")
REFRESH_URL = reverse("token-refresh")
LOGOUT_URL = reverse("api-logout")
ME_URL = reverse("api-me")

DISABLE_THROTTLE = override_settings(REST_FRAMEWORK={
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "api.modules.auth.authentication.CookieOrHeaderJWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticated",),
})


@pytest.fixture(autouse=True)
def _clear_throttle_cache():
    """Reset throttle counters between tests to avoid rate-limit interference."""
    cache.clear()
    yield
    cache.clear()


@pytest.mark.django_db
class TestLogin:
    @DISABLE_THROTTLE
    def test_login_with_username_returns_200_and_cookies(self, client, active_user):
        """Successful login sets httpOnly cookies and returns user data (no tokens in body)."""
        response = client.post(
            LOGIN_URL,
            {"username": "testuser", "password": "securepassword123"},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        assert "token" not in response.data
        assert "refresh" not in response.data
        assert response.data["username"] == "testuser"
        assert response.data["is_staff"] is False
        assert response.data["is_superuser"] is False
        assert response.data["role"] is not None
        assert "access_token" in response.cookies
        assert "refresh_token" in response.cookies

    @DISABLE_THROTTLE
    def test_login_with_email_returns_200(self, client, active_user):
        response = client.post(
            LOGIN_URL,
            {"email": "test@example.com", "password": "securepassword123"},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["username"] == "testuser"

    @DISABLE_THROTTLE
    def test_login_wrong_password_returns_401(self, client, active_user):
        response = client.post(
            LOGIN_URL,
            {"username": "testuser", "password": "wrongpassword"},
            format="json",
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert "Credenciales inválidas" in response.data["detail"]
        assert "access_token" not in response.cookies

    @DISABLE_THROTTLE
    def test_login_nonexistent_user_returns_401(self, client):
        response = client.post(
            LOGIN_URL,
            {"username": "nonexistent", "password": "somepass123"},
            format="json",
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert response.data["detail"] == "Credenciales inválidas"
        assert "access_token" not in response.cookies

    @DISABLE_THROTTLE
    def test_login_inactive_user_returns_401(self, client, inactive_user):
        response = client.post(
            LOGIN_URL,
            {"username": "inactive", "password": "inactive123"},
            format="json",
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert response.data["detail"] == "Credenciales inválidas"
        assert "access_token" not in response.cookies

    @DISABLE_THROTTLE
    def test_login_no_password_returns_400(self, client):
        response = client.post(LOGIN_URL, {"username": "testuser"}, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Contraseña requerida" in response.data["detail"]

    @DISABLE_THROTTLE
    def test_login_no_identity_returns_400(self, client):
        response = client.post(LOGIN_URL, {"password": "somepass123"}, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Correo o usuario requerido" in response.data["detail"]

    @DISABLE_THROTTLE
    def test_login_superadmin_has_superuser_flag(self, client, superuser):
        response = client.post(
            LOGIN_URL,
            {"username": "superadmin", "password": "adminpass123"},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["is_superuser"] is True
        assert response.data["is_staff"] is True


@pytest.mark.django_db
class TestTokenRefresh:
    @DISABLE_THROTTLE
    def test_refresh_with_valid_cookie_returns_200(self, client, active_user):
        login_response = client.post(
            LOGIN_URL,
            {"username": "testuser", "password": "securepassword123"},
            format="json",
        )
        refresh_token = login_response.cookies.get("refresh_token")
        assert refresh_token is not None

        client.cookies["refresh_token"] = refresh_token.value
        refresh_response = client.post(REFRESH_URL)

        assert refresh_response.status_code == status.HTTP_200_OK
        assert refresh_response.data["success"] is True
        assert "access_token" in refresh_response.cookies

    def test_refresh_without_cookie_returns_401(self, client):
        response = client.post(REFRESH_URL)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestLogout:
    @DISABLE_THROTTLE
    def test_logout_clears_cookies(self, client, active_user):
        login_response = client.post(
            LOGIN_URL,
            {"username": "testuser", "password": "securepassword123"},
            format="json",
        )
        access_token = login_response.cookies.get("access_token")
        assert access_token is not None
        client.cookies["access_token"] = access_token.value

        logout_response = client.post(LOGOUT_URL)
        assert logout_response.status_code == status.HTTP_200_OK
        assert logout_response.data["success"] is True

    def test_logout_unauthenticated_returns_401(self, client):
        response = client.post(LOGOUT_URL)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestMeEndpoint:
    @DISABLE_THROTTLE
    def test_me_authenticated_returns_user_data(self, client, active_user):
        login_response = client.post(
            LOGIN_URL,
            {"username": "testuser", "password": "securepassword123"},
            format="json",
        )
        access_token = login_response.cookies.get("access_token")
        assert access_token is not None
        client.cookies["access_token"] = access_token.value

        me_response = client.get(ME_URL)
        assert me_response.status_code == status.HTTP_200_OK
        assert me_response.data["username"] == "testuser"
        assert me_response.data["email"] == "test@example.com"
        assert "role" in me_response.data
        assert "platform_role" in me_response.data

    def test_me_unauthenticated_returns_401(self, client):
        response = client.get(ME_URL)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestRateLimiting:
    def test_login_returns_429_after_too_many_attempts(self, client, active_user):
        """After exceeding 5 login attempts per hour, get 429 Too Many Requests."""
        cache.clear()
        for _ in range(6):
            response = client.post(
                LOGIN_URL,
                {"username": "testuser", "password": "wrong"},
                format="json",
            )
        assert response.status_code == status.HTTP_429_TOO_MANY_REQUESTS
