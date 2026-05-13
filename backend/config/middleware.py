"""
Security Middleware for Django
OWASP 2025: A02: Security Misconfiguration

Includes:
1. HostHeaderValidationMiddleware - Prevents Host header attacks
2. HealthCheckMiddleware - Liveness before tenant DB lookup (Render / probes)
3. ContentSecurityPolicyMiddleware - CSP headers for XSS prevention
"""
import logging

from django.conf import settings
from django.core.exceptions import DisallowedHost
from django.http import HttpResponse, JsonResponse

logger = logging.getLogger(__name__)

# Resolved before TenantMainMiddleware so health checks do not require a
# organizations.Domain row for the request host (common on first Render deploy).
_LIVENESS_GET_PATHS = frozenset({"/healthz", "/api/health", "/api/health/"})


class HealthCheckMiddleware:
    """
    Cheap liveness: no DB, no tenant resolution.

    TenantMainMiddleware queries Domain by Host; until that row exists (or
    SHOW_PUBLIC_IF_NO_TENANT_FOUND is on), probes would 404/500. Render and
    load balancers need a stable 200 here.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.method == "GET" and request.path in _LIVENESS_GET_PATHS:
            return JsonResponse({"status": "ok", "scope": "public"})
        # Browsers opening the API origin show "Not Found" if no route exists for GET /.
        # HEAD / is already used by some probes; GET / returns a tiny JSON hint (no DB).
        if request.method == "GET" and request.path == "/":
            return JsonResponse(
                {
                    "status": "ok",
                    "scope": "api-root",
                    "message": "NestWork API. Usa rutas bajo /api/ (p. ej. /api/health/).",
                }
            )
        if request.method == "HEAD" and request.path == "/":
            return HttpResponse(status=200)
        return self.get_response(request)


class HostHeaderValidationMiddleware:
    """
    Validate Host header against ALLOWED_HOSTS BEFORE tenant resolution.
    Prevents Host header attacks that could bypass multi-tenant isolation.
    
    Security: OWASP 2025: A02: Security Misconfiguration
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        self.allowed_hosts = set(settings.ALLOWED_HOSTS)
        self.allow_all_hosts = "*" in self.allowed_hosts
        
        # Add common variations
        for host in list(self.allowed_hosts):
            if ':' not in host:
                self.allowed_hosts.add(f"{host}:80")
                self.allowed_hosts.add(f"{host}:443")
                self.allowed_hosts.add(f"{host}:8000")
                self.allowed_hosts.add(f"{host}:5173")
    
    def __call__(self, request):
        if self.allow_all_hosts:
            return self.get_response(request)

        host = request.get_host().lower()
        
        # Extract hostname without port
        hostname = host.split(':')[0]
        
        # Validate against ALLOWED_HOSTS
        if hostname not in self.allowed_hosts and host not in self.allowed_hosts:
            # Log the attempt for security monitoring
            logger.warning(
                f"Disallowed Host header: {host}. "
                f"IP: {request.META.get('REMOTE_ADDR', 'unknown')}"
            )
            raise DisallowedHost(f"Host '{host}' not in ALLOWED_HOSTS")
        
        response = self.get_response(request)
        return response


class ContentSecurityPolicyMiddleware:
    """
    Add Content-Security-Policy headers to all responses.
    
    CSP prevents XSS by specifying which sources of content are allowed.
    This is a defense-in-depth measure - it doesn't replace proper input
    validation and output encoding, but adds an extra layer of protection.
    
    OWASP 2025: A02: Security Misconfiguration
    
    Note: X-XSS-Protection header is intentionally omitted.
    It is deprecated in modern browsers and can cause rendering issues.
    Use CSP instead for XSS prevention.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        
        # Get CSP configuration from settings
        self.csp_report_only = getattr(settings, 'CSP_REPORT_ONLY', False)
        self.csp_report_uri = getattr(settings, 'CSP_REPORT_URI', None)
        self.upgrade_insecure = getattr(settings, 'CSP_UPGRADE_INSECURE', False)
        
        # Default policies (can be overridden in settings)
        self.default_src = getattr(settings, 'CSP_DEFAULT_SRC', ["'self'"])
        self.script_src = getattr(settings, 'CSP_SCRIPT_SRC', ["'self'"])
        self.style_src = getattr(settings, 'CSP_STYLE_SRC', ["'self'", "'unsafe-inline'"])
        self.img_src = getattr(settings, 'CSP_IMG_SRC', ["'self'", "data:", "https:"])
        self.font_src = getattr(settings, 'CSP_FONT_SRC', ["'self'", "https:"])
        self.connect_src = getattr(settings, 'CSP_CONNECT_SRC', ["'self'"])
        self.media_src = getattr(settings, 'CSP_MEDIA_SRC', ["'self'"])
        self.object_src = getattr(settings, 'CSP_OBJECT_SRC', ["'none'"])
        self.frame_ancestors = getattr(settings, 'CSP_FRAME_ANCESTORS', ["'none'"])
        self.base_uri = getattr(settings, 'CSP_BASE_URI', ["'self'"])
        self.form_action = getattr(settings, 'CSP_FORM_ACTION', ["'self'"])
        self.frame_src = getattr(settings, 'CSP_FRAME_SRC', ["'none'"])
        self.worker_src = getattr(settings, 'CSP_WORKER_SRC', ["'self'", "blob:"])
        self.child_src = getattr(settings, 'CSP_CHILD_SRC', ["'self'"])
        self.manifest_src = getattr(settings, 'CSP_MANIFEST_SRC', ["'self'"])
        self.prefetch_src = getattr(settings, 'CSP_PREFETCH_SRC', ["'self'"])
        self.navigate_to = getattr(settings, 'CSP_NAVIGATE_TO', None)
        
        # Build CSP header value
        self.csp_value = self._build_csp_header()
        
        # Header name (Report-Only or Enforce)
        self.header_name = (
            'Content-Security-Policy-Report-Only' 
            if self.csp_report_only 
            else 'Content-Security-Policy'
        )
    
    def _build_csp_header(self) -> str:
        """Build CSP header value from directives."""
        directives = {
            'default-src': self.default_src,
            'script-src': self.script_src,
            'style-src': self.style_src,
            'img-src': self.img_src,
            'font-src': self.font_src,
            'connect-src': self.connect_src,
            'media-src': self.media_src,
            'object-src': self.object_src,
            'frame-ancestors': self.frame_ancestors,
            'base-uri': self.base_uri,
            'form-action': self.form_action,
            'frame-src': self.frame_src,
            'worker-src': self.worker_src,
            'child-src': self.child_src,
            'manifest-src': self.manifest_src,
            'prefetch-src': self.prefetch_src,
        }
        
        # Add optional directives
        if self.navigate_to:
            directives['navigate-to'] = self.navigate_to
        
        if self.upgrade_insecure:
            directives['upgrade-insecure-requests'] = []
        
        # Add report-uri if configured
        if self.csp_report_uri:
            directives['report-uri'] = [self.csp_report_uri]
            directives['report-to'] = ['csp-endpoint']
        
        # Build header string
        csp_parts = []
        for directive, sources in directives.items():
            if sources is not None:
                if sources:
                    csp_parts.append(f"{directive} {' '.join(sources)}")
                else:
                    # upgrade-insecure-requests has no value
                    csp_parts.append(directive)
        
        return '; '.join(csp_parts)
    
    def __call__(self, request):
        response = self.get_response(request)
        
        # Add CSP header
        response[self.header_name] = self.csp_value
        
        # Security headers
        # Note: X-XSS-Protection is intentionally NOT set (deprecated, can cause issues)
        response['X-Content-Type-Options'] = 'nosniff'
        response['X-Frame-Options'] = 'DENY'
        response['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        response['Permissions-Policy'] = (
            'accelerometer=(), camera=(), geolocation=(), gyroscope=(), '
            'magnetometer=(), microphone=(), payment=(), usb=()'
        )
        
        # Remove Server header (information disclosure)
        if 'Server' in response:
            del response['Server']
        
        # Remove X-Powered-By header (information disclosure)
        if 'X-Powered-By' in response:
            del response['X-Powered-By']
        
        return response


# Alternative: Function-based middleware for simpler use case
def add_security_headers(get_response):
    """
    Simple security headers middleware.
    Use this if you don't need full CSP configuration.
    Note: X-XSS-Protection is intentionally omitted (deprecated).
    """
    def middleware(request):
        response = get_response(request)
        
        # Security headers (X-XSS-Protection intentionally omitted - deprecated)
        response['X-Content-Type-Options'] = 'nosniff'
        response['X-Frame-Options'] = 'DENY'
        response['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        
        # Basic CSP
        response['Content-Security-Policy'] = (
            "default-src 'self'; "
            "script-src 'self'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https: blob:; "
            "font-src 'self' data:; "
            "connect-src 'self'; "
            "object-src 'none'; "
            "frame-ancestors 'none'; "
            "base-uri 'self'; "
            "form-action 'self'"
        )
        
        return response
    
    return middleware
