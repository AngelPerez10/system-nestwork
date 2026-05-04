"""Tests for security headers and CSP middleware.

OWASP 2025: A02: Security Misconfiguration
Verifies that all security headers are correctly set on responses.
"""

import pytest
from django.test import RequestFactory, override_settings
from config.middleware import ContentSecurityPolicyMiddleware


def dummy_view(request):
    from django.http import HttpResponse
    return HttpResponse("OK")


@pytest.mark.django_db
class TestContentSecurityPolicyMiddleware:
    """Test CSP header generation and security headers."""

    def _get_response_with_middleware(self, settings_override=None):
        """Helper to run a request through the middleware."""
        factory = RequestFactory()
        request = factory.get("/test/")

        if settings_override:
            with override_settings(**settings_override):
                middleware = ContentSecurityPolicyMiddleware(dummy_view)
                response = middleware(request)
        else:
            middleware = ContentSecurityPolicyMiddleware(dummy_view)
            response = middleware(request)

        return response

    def test_csp_header_is_present(self):
        response = self._get_response_with_middleware()
        assert "Content-Security-Policy" in response

    def test_csp_default_src_self(self):
        response = self._get_response_with_middleware()
        csp = response["Content-Security-Policy"]
        assert "default-src 'self'" in csp

    def test_csp_script_src_self(self):
        response = self._get_response_with_middleware()
        csp = response["Content-Security-Policy"]
        assert "script-src 'self'" in csp

    def test_csp_style_src_unsafe_inline(self):
        """Tailwind CSS requires unsafe-inline for styles."""
        response = self._get_response_with_middleware()
        csp = response["Content-Security-Policy"]
        assert "style-src 'self' 'unsafe-inline'" in csp

    def test_csp_img_src_allows_data_and_https(self):
        response = self._get_response_with_middleware()
        csp = response["Content-Security-Policy"]
        assert "img-src 'self' data: https: blob:" in csp

    def test_csp_font_src_self_data(self):
        response = self._get_response_with_middleware()
        csp = response["Content-Security-Policy"]
        assert "font-src 'self' data:" in csp

    def test_csp_connect_src_self(self):
        response = self._get_response_with_middleware()
        csp = response["Content-Security-Policy"]
        assert "connect-src 'self'" in csp

    def test_csp_object_src_none(self):
        """Plugins (Flash, Java) should be blocked."""
        response = self._get_response_with_middleware()
        csp = response["Content-Security-Policy"]
        assert "object-src 'none'" in csp

    def test_csp_frame_ancestors_none(self):
        """Clickjacking protection via frame-ancestors."""
        response = self._get_response_with_middleware()
        csp = response["Content-Security-Policy"]
        assert "frame-ancestors 'none'" in csp

    def test_csp_base_uri_self(self):
        response = self._get_response_with_middleware()
        csp = response["Content-Security-Policy"]
        assert "base-uri 'self'" in csp

    def test_csp_form_action_self(self):
        response = self._get_response_with_middleware()
        csp = response["Content-Security-Policy"]
        assert "form-action 'self'" in csp

    def test_csp_frame_src_none(self):
        response = self._get_response_with_middleware()
        csp = response["Content-Security-Policy"]
        assert "frame-src 'none'" in csp

    def test_csp_worker_src_blob(self):
        response = self._get_response_with_middleware()
        csp = response["Content-Security-Policy"]
        assert "worker-src 'self' blob:" in csp

    def test_csp_report_only_mode(self):
        """CSP_REPORT_ONLY=True uses Report-Only header."""
        response = self._get_response_with_middleware(
            {"CSP_REPORT_ONLY": True}
        )
        assert "Content-Security-Policy-Report-Only" in response
        assert "Content-Security-Policy" not in response or response.get("Content-Security-Policy") is None

    def test_csp_upgrade_insecure_in_production(self):
        """CSP_UPGRADE_INSECURE=True adds upgrade-insecure-requests."""
        response = self._get_response_with_middleware(
            {"CSP_UPGRADE_INSECURE": True}
        )
        csp = response["Content-Security-Policy"]
        assert "upgrade-insecure-requests" in csp


@pytest.mark.django_db
class TestSecurityHeaders:
    """Test that other security headers are correctly set."""

    def _get_response(self):
        factory = RequestFactory()
        request = factory.get("/test/")
        middleware = ContentSecurityPolicyMiddleware(dummy_view)
        return middleware(request)

    def test_x_content_type_options_nosniff(self):
        response = self._get_response()
        assert response["X-Content-Type-Options"] == "nosniff"

    def test_x_frame_options_deny(self):
        response = self._get_response()
        assert response["X-Frame-Options"] == "DENY"

    def test_x_xss_protection_not_set(self):
        """X-XSS-Protection is deprecated and should NOT be set."""
        response = self._get_response()
        assert "X-XSS-Protection" not in response

    def test_referrer_policy_strict_origin(self):
        response = self._get_response()
        assert response["Referrer-Policy"] == "strict-origin-when-cross-origin"

    def test_permissions_policy_restricts_features(self):
        response = self._get_response()
        pp = response["Permissions-Policy"]
        assert "camera=()" in pp
        assert "microphone=()" in pp
        assert "geolocation=()" in pp
        assert "payment=()" in pp

    def test_permissions_policy_present(self):
        response = self._get_response()
        assert "Permissions-Policy" in response


@pytest.mark.django_db
class TestCSPCustomConfiguration:
    """Test CSP with custom settings overrides."""

    def _get_response_with_middleware(self, settings_override):
        factory = RequestFactory()
        request = factory.get("/test/")
        with override_settings(**settings_override):
            middleware = ContentSecurityPolicyMiddleware(dummy_view)
            return middleware(request)

    def test_custom_script_src(self):
        response = self._get_response_with_middleware({
            "CSP_SCRIPT_SRC": ["'self'", "cdn.example.com"]
        })
        csp = response["Content-Security-Policy"]
        assert "script-src 'self' cdn.example.com" in csp

    def test_custom_connect_src(self):
        """Allow external API hosts in connect-src."""
        response = self._get_response_with_middleware({
            "CSP_CONNECT_SRC": ["'self'", "api.example.com"]
        })
        csp = response["Content-Security-Policy"]
        assert "connect-src 'self' api.example.com" in csp

    def test_report_uri_included(self):
        response = self._get_response_with_middleware({
            "CSP_REPORT_URI": "https://csp-report.example.com/report"
        })
        csp = response["Content-Security-Policy"]
        assert "report-uri https://csp-report.example.com/report" in csp
        assert "report-to csp-endpoint" in csp
