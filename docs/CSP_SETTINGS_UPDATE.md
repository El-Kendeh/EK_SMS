"""
HOW TO FIX CSP VIOLATIONS - Settings Update Guide

This document explains how to enable the CSP middleware fix
"""

# =============================================================================
# STEP 1: Update your Django settings.py
# =============================================================================
#
# File: eksms/eksms/settings.py
#
# Find the MIDDLEWARE list (usually around line 40-60):
# 
# BEFORE:
# --------
# MIDDLEWARE = [
#     'django.middleware.security.SecurityMiddleware',
#     'django.contrib.sessions.middleware.SessionMiddleware',
#     'django.middleware.common.CommonMiddleware',
#     'django.middleware.csrf.CsrfViewMiddleware',
#     'django.contrib.auth.middleware.AuthenticationMiddleware',
#     'django.contrib.messages.middleware.MessageMiddleware',
#     'django.middleware.clickjacking.XFrameOptionsMiddleware',
# ]
#
#
# AFTER: Add these two lines at the end:
# ------
# MIDDLEWARE = [
#     'django.middleware.security.SecurityMiddleware',
#     'django.contrib.sessions.middleware.SessionMiddleware',
#     'django.middleware.common.CommonMiddleware',
#     'django.middleware.csrf.CsrfViewMiddleware',
#     'django.contrib.auth.middleware.AuthenticationMiddleware',
#     'django.contrib.messages.middleware.MessageMiddleware',
#     'django.middleware.clickjacking.XFrameOptionsMiddleware',
#     'eksms.csp_middleware.CSPMiddleware',  # ← ADD THIS LINE
# ]
#
# IMPORTANT: The CSPMiddleware should be last in the list
#
# =============================================================================

# =============================================================================
# STEP 2: Add CORS settings if needed (for API access)
# =============================================================================
#
# If you want to allow CORS access from your frontend:
#
# CORS_ALLOWED_ORIGINS = [
#     "https://ek-sms-one.vercel.app",
#     "http://localhost:3000",
# ]
#
# CORS_ALLOW_CREDENTIALS = True
#

# =============================================================================
# COMPLETE EXAMPLE of updated settings.py section:
# =============================================================================

# Middleware configuration
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'eksms.csp_middleware.CSPMiddleware',  # ← CSP Middleware for security
]

# Security settings
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_SECURITY_POLICY = False  # We handle CSP via middleware

# CORS Settings (if needed)
CORS_ALLOWED_ORIGINS = [
    "https://ek-sms-one.vercel.app",
    "http://localhost:3000",
]
CORS_ALLOW_CREDENTIALS = True

# =============================================================================
# STEP 3: After making changes, test with:
# =============================================================================
#
# 1. SSH to Ubuntu server and activate venv
# 2. Restart Django:
#
#    sudo systemctl restart gunicorn
#    # or
#    sudo systemctl restart ek-sms
#
# 3. Check for syntax errors:
#
#    python manage.py check
#
# 4. Verify middleware loads:
#
#    python manage.py shell
#    from django.core.handlers.wsgi import get_wsgi_application
#    app = get_wsgi_application()
#    # No errors = success
#
# 5. Check response headers:
#
#    curl -I https://backend.pruhsms.africa/api/users/ \
#      -H "Authorization: Bearer YOUR_TOKEN" | grep -i content-security-policy
#
#    Should return the CSP header
#
# =============================================================================

# =============================================================================
# STEP 4: Test in browser
# =============================================================================
#
# 1. Open https://ek-sms-one.vercel.app
# 2. Open DevTools (F12)
# 3. Console tab
# 4. Refresh (Ctrl+R)
#
# EXPECTED - No more errors like:
#   ✗ "Refused to load the script 'blob:...' because it violates the CSP directive"
#   ✗ "Refused to load the font from 'https://vercel.live/...' because it violates the CSP directive"
#
# =============================================================================

# =============================================================================
# TROUBLESHOOTING
# =============================================================================
#
# Problem: Still seeing CSP errors in console
# Solution: 
#   - Verify middleware is added to settings.py
#   - Restart gunicorn: sudo systemctl restart gunicorn
#   - Wait 10 seconds and refresh browser (F5)
#   - Check headers: curl -I https://backend.pruhsms.africa/api/...
#
# Problem: ModuleNotFoundError: No module named 'eksms.csp_middleware'
# Solution:
#   - Verify file exists: ls -la eksms/eksms/csp_middleware.py
#   - Restart Python: deactivate && source venv/bin/activate
#   - Restart Django: sudo systemctl restart gunicorn
#
# Problem: CSP still blocking legitimate content
# Solution:
#   - Check browser console for which URLs are being blocked
#   - Add those URLs to the appropriate directive in csp_middleware.py
#   - Restart Django and test again
#
# =============================================================================
