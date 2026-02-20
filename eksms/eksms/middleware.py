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
        
        # Prevent clickjacking
        response['X-Frame-Options'] = 'DENY'
        
        # Referrer Policy
        response['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        
        # Feature Policy (Permissions Policy)
        response['Permissions-Policy'] = (
            'geolocation=(), microphone=(), camera=(), payment=(), '
            'usb=(), accelerometer=(), gyroscope=(), magnetometer=()'
        )
        
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
