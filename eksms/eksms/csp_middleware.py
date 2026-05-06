"""
Content Security Policy (CSP) Middleware
Fixes blob script errors and font-src violations
Add this to your Django middleware stack
"""

from django.utils.deprecation import MiddlewareMixin


class CSPMiddleware(MiddlewareMixin):
    """
    Middleware to add Content Security Policy headers.
    
    Fixes:
    - "Refused to load the script 'blob:...' because it violates the CSP directive"
    - "Refused to load the font from 'https://vercel.live/...' because it violates the CSP directive"
    """
    
    def process_response(self, request, response):
        # CSP header that allows necessary sources
        # 
        # Breakdown:
        # - script-src 'self' 'unsafe-inline' blob:          Allow scripts from self, inline, and blob URLs
        # - https://embed.tawk.to https://*.tawk.to         Allow Tawk chat service
        # - https://vercel.live                              Allow Vercel debugging tools
        # - chrome-extension:                                Allow Chrome extensions
        # - font-src 'self' https://fonts.gstatic.com        Allow Google Fonts
        # - https://*.tawk.to https://vercel.live            Allow Tawk and Vercel fonts
        # - style-src 'self' 'unsafe-inline' https://fonts.gstatic.com  Allow styles
        # - img-src 'self' data: https:                      Allow images
        # - connect-src 'self' https:                        Allow API connections
        
        csp_header = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' blob: "
            "https://embed.tawk.to https://*.tawk.to "
            "https://vercel.live https://*.vercel.live "
            "chrome-extension:; "
            "font-src 'self' https://fonts.gstatic.com "
            "https://*.tawk.to https://vercel.live "
            "https://*.vercel.live; "
            "style-src 'self' 'unsafe-inline' "
            "https://fonts.gstatic.com https://*.tawk.to; "
            "img-src 'self' data: https: blob:; "
            "connect-src 'self' https: wss:; "
            "frame-src 'self' https://*.tawk.to https://*.vercel.live; "
            "object-src 'none'; "
            "base-uri 'self'; "
            "form-action 'self'"
        )
        
        response['Content-Security-Policy'] = csp_header
        
        # Also set the report-only version for monitoring (optional)
        # response['Content-Security-Policy-Report-Only'] = csp_header
        
        return response
