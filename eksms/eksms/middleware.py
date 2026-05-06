"""
Security middleware and utilities for Django application.
"""

import logging
from django.utils.deprecation import MiddlewareMixin
from django.http import HttpResponseForbidden
from django.contrib.auth.models import User
from django.contrib.auth import login
from django.utils.functional import SimpleLazyObject

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
        
        # Referrer Policy
        response['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        
        # Feature Policy (Permissions Policy)
        response['Permissions-Policy'] = (
            'geolocation=(), microphone=(), camera=(), payment=(), '
            'usb=(), accelerometer=(), gyroscope=(), magnetometer=()'
        )
        
        # Content Security Policy Header
        # Note: This complements the meta tag in the HTML (meta tags have limitations)
        # FIXED: Added blob: for dynamic script generation and 'unsafe-eval' for bundled code
        csp_header = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://embed.tawk.to https://*.tawk.to https://vercel.live https://*.vercel.live chrome-extension:; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://*.tawk.to https://vercel.live; "
            "img-src 'self' data: https: blob: http://localhost:8000 http://127.0.0.1:8000; "
            "font-src 'self' https://fonts.gstatic.com https://*.tawk.to https://*.vercel.live https://vercel.live; "
            "media-src 'self' data:; "
            "connect-src 'self' http://localhost:8000 http://web:8000 https://ek-sms-backend.onrender.com https://backend.pruhsms.africa https://pruhsms.africa https://*.tawk.to wss://*.tawk.to https://vercel.live https://*.vercel.live https://*.vercel.app wss://*.pusher.com wss://ws-us3.pusher.com https://*.pusher.com; "
            "frame-src https://tawk.to https://*.tawk.to https://vercel.live https://*.vercel.live; "
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
    Simple rate limiting middleware.
    """
    
    def __init__(self, get_response=None):
        super().__init__(get_response)
        self.request_counts = {}
    
    def process_request(self, request):
        # Placeholder for basic rate limiting logic
        return None


class TokenAuthenticationMiddleware(MiddlewareMixin):
    """
    Middleware to handle Bearer token authentication from frontend.
    Validates the custom token format: token_{user_id}_{username}
    """
    
    def process_request(self, request):
        auth_header = request.headers.get('Authorization')
        
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
            try:
                # Basic validation of the custom token format
                parts = token.split('_')
                if len(parts) >= 3 and parts[0] == 'token':
                    user_id = parts[1]
                    username = '_'.join(parts[2:])
                    
                    # Simplified validation: check if user exists by ID
                    user = User.objects.get(id=user_id)
                    
                    # Set user in request if not already authenticated by session
                    if not request.user.is_authenticated:
                        request.user = user
                
            except (User.DoesNotExist, ValueError, IndexError):
                pass
        
        return None


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
