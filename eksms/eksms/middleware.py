"""
Security middleware and utilities for Django application.
"""

import logging
from django.utils.deprecation import MiddlewareMixin
from django.http import HttpResponseForbidden

logger = logging.getLogger('django.security')


class SecurityHeadersMiddleware(MiddlewareMixin):
    """
    Add additional security headers to responses.
    """
    
    def process_response(self, request, response):
        # Prevent MIME type sniffing
        response['X-Content-Type-Options'] = 'nosniff'
        
        # Enable XSS protection in older browsers
        response['X-XSS-Protection'] = '1; mode=block'
        
        # Prevent clickjacking (frame-ancestors should be in CSP, but X-Frame-Options is for older browsers)
        response['X-Frame-Options'] = 'DENY'
        
        # Referrer Policy
        response['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        
        # Feature Policy (Permissions Policy)
        response['Permissions-Policy'] = (
            'geolocation=(), microphone=(), camera=(), payment=(), '
            'usb=(), accelerometer=(), gyroscope=(), magnetometer=()'
        )
        
        # Content Security Policy Header
        # Note: This complements the meta tag in the HTML (meta tags have limitations)
        csp_header = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' https://embed.tawk.to https://*.tawk.to https://vercel.live chrome-extension:; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://*.tawk.to; "
            "img-src 'self' data: https:; "
            "font-src 'self' https://fonts.gstatic.com https://*.tawk.to; "
            "media-src 'self' data:; "
            "connect-src 'self' http://localhost:8000 http://web:8000 https://ek-sms-backend.onrender.com https://backend.pruhsms.africa https://pruhsms.africa https://*.tawk.to wss://*.tawk.to https://vercel.live https://*.vercel.app; "
            "frame-src https://tawk.to https://*.tawk.to; "
            "frame-ancestors 'none'; "
            "base-uri 'self'; "
            "form-action 'self'"
        )
        response['Content-Security-Policy'] = csp_header
        
        return response


class AuditLoggingMiddleware(MiddlewareMixin):
    """
    Log security-relevant requests for audit purposes.
    """
    
    SENSITIVE_ENDPOINTS = [
        '/admin/',
        '/api/auth/',
        '/api/users/',
        '/api/settings/',
    ]
    
    def process_request(self, request):
        # Log sensitive endpoint access
        for endpoint in self.SENSITIVE_ENDPOINTS:
            if request.path.startswith(endpoint):
                logger.warning(
                    f'Sensitive endpoint accessed: {request.method} {request.path} '
                    f'by {get_client_ip(request)} ({request.user})'
                )
                break
        
        return None
    
    def process_response(self, request, response):
        # Log security-relevant status codes
        if response.status_code in [403, 404, 500, 502, 503]:
            logger.warning(
                f'Response {response.status_code}: {request.method} {request.path} '
                f'from {get_client_ip(request)}'
            )
        
        return response


class RateLimitMiddleware(MiddlewareMixin):
    """
    Simple rate limiting middleware (production use requires django-ratelimit).
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        self.request_counts = {}
    
    def __call__(self, request):
        # This is a basic example
        # In production, use django-ratelimit or redis-based solution
        response = self.get_response(request)
        return response


def get_client_ip(request):
    """
    Get the client's IP address from the request,
    accounting for proxies.
    """
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip
