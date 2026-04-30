"""
Security Middleware for Django
OWASP 2025: A02: Security Misconfiguration

Includes:
1. HostHeaderValidationMiddleware - Prevents Host header attacks
2. ContentSecurityPolicyMiddleware - CSP headers for XSS prevention
"""
import logging

from django.conf import settings
from django.core.exceptions import DisallowedHost
from django.http import HttpResponseForbidden

logger = logging.getLogger(__name__)


class HostHeaderValidationMiddleware:
    """
    Validate Host header against ALLOWED_HOSTS BEFORE tenant resolution.
    Prevents Host header attacks that could bypass multi-tenant isolation.
    
    Security: OWASP 2025: A02: Security Misconfiguration
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        self.allowed_hosts = set(settings.ALLOWED_HOSTS)
        
        # Add common variations
        for host in list(self.allowed_hosts):
            if ':' not in host:
                self.allowed_hosts.add(f"{host}:80")
                self.allowed_hosts.add(f"{host}:443")
                self.allowed_hosts.add(f"{host}:8000")
                self.allowed_hosts.add(f"{host}:5173")
    
    def __call__(self, request):
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
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        
        # Get CSP configuration from settings
        self.csp_report_only = getattr(settings, 'CSP_REPORT_ONLY', False)
        self.csp_report_uri = getattr(settings, 'CSP_REPORT_URI', None)
        
        # Default policies (can be overridden in settings)
        self.default_src = getattr(
            settings, 'CSP_DEFAULT_SRC',
            ["'self'"]
        )
        
        self.script_src = getattr(
            settings, 'CSP_SCRIPT_SRC',
            ["'self'"]  # Strict: no inline scripts, no eval
        )
        
        self.style_src = getattr(
            settings, 'CSP_STYLE_SRC',
            ["'self'", "'unsafe-inline'"]  # unsafe-inline needed for some CSS frameworks
        )
        
        self.img_src = getattr(
            settings, 'CSP_IMG_SRC',
            ["'self'", "data:", "https:"]  # Allow data: for base64 images
        )
        
        self.font_src = getattr(
            settings, 'CSP_FONT_SRC',
            ["'self'", "https:"]
        )
        
        self.connect_src = getattr(
            settings, 'CSP_CONNECT_SRC',
            ["'self'"]
        )
        
        self.media_src = getattr(
            settings, 'CSP_MEDIA_SRC',
            ["'self'"]
        )
        
        self.frame_ancestors = getattr(
            settings, 'CSP_FRAME_ANCESTORS',
            ["'none'"]  # Prevent clickjacking
        )
        
        self.base_uri = getattr(
            settings, 'CSP_BASE_URI',
            ["'self'"]
        )
        
        self.form_action = getattr(
            settings, 'CSP_FORM_ACTION',
            ["'self'"]
        )
        
        self.frame_src = getattr(
            settings, 'CSP_FRAME_SRC',
            ["'none'"]
        )
        
        self.worker_src = getattr(
            settings, 'CSP_WORKER_SRC',
            ["'self'", "blob:"]
        )
        
        self.child_src = getattr(
            settings, 'CSP_CHILD_SRC',
            ["'self'"]
        )
        
        self.manifest_src = getattr(
            settings, 'CSP_MANIFEST_SRC',
            ["'self'"]
        )
        
        self.prefetch_src = getattr(
            settings, 'CSP_PREFETCH_SRC',
            ["'self'"]
        )
        
        self.navigate_to = getattr(
            settings, 'CSP_NAVIGATE_TO',
            ["'self'"]
        )
        
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
            'frame-ancestors': self.frame_ancestors,
            'base-uri': self.base_uri,
            'form-action': self.form_action,
            'frame-src': self.frame_src,
            'worker-src': self.worker_src,
            'child-src': self.child_src,
            'manifest-src': self.manifest_src,
            'prefetch-src': self.prefetch_src,
        }
        
        # Add report-uri if configured
        if self.csp_report_uri:
            directives['report-uri'] = [self.csp_report_uri]
            directives['report-to'] = ['csp-endpoint']
        
        # Build header string
        csp_parts = []
        for directive, sources in directives.items():
            if sources:
                csp_parts.append(f"{directive} {' '.join(sources)}")
        
        return '; '.join(csp_parts)
    
    def __call__(self, request):
        response = self.get_response(request)
        
        # Add CSP header
        response[self.header_name] = self.csp_value
        
        # Add additional security headers
        response['X-Content-Type-Options'] = 'nosniff'
        response['X-Frame-Options'] = 'DENY'
        response['X-XSS-Protection'] = '1; mode=block'
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
    """
    def middleware(request):
        response = get_response(request)
        
        # Basic security headers
        response['X-Content-Type-Options'] = 'nosniff'
        response['X-Frame-Options'] = 'DENY'
        response['X-XSS-Protection'] = '1; mode=block'
        response['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        
        # Basic CSP
        response['Content-Security-Policy'] = (
            "default-src 'self'; "
            "script-src 'self'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "font-src 'self' https:; "
            "connect-src 'self'; "
            "frame-ancestors 'none'; "
            "base-uri 'self'; "
            "form-action 'self'"
        )
        
        return response
    
    return middleware
