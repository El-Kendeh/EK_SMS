"""
Secure Django settings for eksms project.
Uses environment variables for sensitive configuration.
"""

from pathlib import Path
from decouple import config, Csv
import os

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# SECURITY: Load sensitive data from environment variables
SECRET_KEY = config(
    'SECRET_KEY',
    default='django-insecure-changeme-in-production',
    cast=str
)

# DEBUG should only be True in development
DEBUG = config('DEBUG', default=False, cast=bool)

# SECURITY: Specify allowed hosts
ALLOWED_HOSTS = config(
    'ALLOWED_HOSTS',
    default='localhost,127.0.0.1,backend.pruhsms.africa,ek-sms-backend.onrender.com,ek-sms-one.vercel.app',
    cast=Csv()
)

# CORS Configuration for frontend communication
CORS_ALLOWED_ORIGINS = config(
    'CORS_ALLOWED_ORIGINS',
    default='http://localhost:3000,https://ek-sms-one.vercel.app,https://ek-sms-backend.onrender.com,https://pruhsms.africa,https://www.pruhsms.africa,https://backend.pruhsms.africa',
    cast=Csv()
)
CORS_ALLOW_ALL_ORIGINS = config('CORS_ALLOW_ALL_ORIGINS', default=False, cast=bool)

# SECURITY: Ensure no trailing commas in ALLOWED_HOSTS
ALLOWED_HOSTS = [host.strip() for host in ALLOWED_HOSTS]

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'corsheaders',  # CORS support
    'django_otp',  # Two-Factor Authentication
    'django_otp.plugins.otp_totp',  # Time-based One-Time Password
    'eksms_core.apps.EksmsCoreConfig',  # Academic management app
]

MIDDLEWARE = [
    'whitenoise.middleware.WhiteNoiseMiddleware',  # Serve static files efficiently
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',  # CORS must be early
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django_otp.middleware.OTPMiddleware',  # Two-Factor Authentication check
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'eksms.middleware.SecurityHeadersMiddleware',  # Custom security headers
    'eksms.middleware.AuditLoggingMiddleware',  # Security logging
]

ROOT_URLCONF = 'eksms.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'eksms.wsgi.application'

# Database Configuration
# Supports both MySQL (Producton) and SQLite (Default)
DATABASE_TYPE = config('DATABASE_TYPE', default='sqlite3')

if DATABASE_TYPE == 'mysql':
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.mysql',
            'NAME': config('DB_NAME'),
            'USER': config('DB_USER'),
            'PASSWORD': config('DB_PASSWORD'),
            'HOST': config('DB_HOST', default='localhost'),
            'PORT': config('DB_PORT', default='3306'),
            'OPTIONS': {
                'init_command': "SET sql_mode='STRICT_TRANS_TABLES'",
                'charset': 'utf8mb4',
            }
        }
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {
            'min_length': 12,  # Enforce stronger passwords
        }
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

# Media files (User uploads like student passports)
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# WhiteNoise compression
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ============================================================================
# SECURITY SETTINGS
# ============================================================================

# HTTPS/SSL Security - Relaxed for HTTP testing on Server IP
SECURE_SSL_REDIRECT = config('SECURE_SSL_REDIRECT', default=False, cast=bool)
SESSION_COOKIE_SECURE = config('SESSION_COOKIE_SECURE', default=False, cast=bool)
CSRF_COOKIE_SECURE = config('CSRF_COOKIE_SECURE', default=False, cast=bool)
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_SECURITY_POLICY = {
    'default-src': ("'self'",),
    'script-src': ("'self'", "'unsafe-inline'", "https://embed.tawk.to", "https://*.tawk.to", "https://vercel.live", "chrome-extension:"),
    'style-src': ("'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://*.tawk.to"),
    'img-src': ("'self'", 'data:', 'https:'),
    'font-src': ("'self'", "https://fonts.gstatic.com", "https://*.tawk.to"),
    'connect-src': ("'self'", "https://backend.pruhsms.africa", "https://pruhsms.africa", "http://localhost:8000", "http://web:8000", "https://ek-sms-backend.onrender.com", "https://*.tawk.to", "wss://*.tawk.to", "https://vercel.live", "https://*.vercel.app"),
    'frame-src': ("https://tawk.to", "https://*.tawk.to", "https://vercel.live"),
}

# HTTP Strict Transport Security (HSTS) - Disabled for HTTP
SECURE_HSTS_SECONDS = config('SECURE_HSTS_SECONDS', default=0, cast=int)
SECURE_HSTS_INCLUDE_SUBDOMAINS = config('SECURE_HSTS_INCLUDE_SUBDOMAINS', default=False, cast=bool)
SECURE_HSTS_PRELOAD = config('SECURE_HSTS_PRELOAD', default=False, cast=bool)
SECURE_CROSS_ORIGIN_OPENER_POLICY = config('SECURE_CROSS_ORIGIN_OPENER_POLICY', default=None, cast=lambda v: None if v == 'None' else v)

# Clickjacking Protection
X_FRAME_OPTIONS = 'DENY'

# Cookie Security
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Strict'
CSRF_COOKIE_HTTPONLY = True
CSRF_COOKIE_SAMESITE = 'Strict'

# CSRF Settings
CSRF_TRUSTED_ORIGINS = config(
    'CORS_ALLOWED_ORIGINS',
    default='http://localhost:3000,https://ek-sms-one.vercel.app,https://pruhsms.africa,https://www.pruhsms.africa',
    cast=Csv()
)
CSRF_TRUSTED_ORIGINS = [origin.strip() for origin in CSRF_TRUSTED_ORIGINS]

# Session Security
SESSION_COOKIE_AGE = 3600  # 1 hour
SESSION_EXPIRE_AT_BROWSER_CLOSE = True
SESSION_COOKIE_SECURE = config('SESSION_COOKIE_SECURE', default=True, cast=bool)

# CORS Settings (already imported above)
CORS_ALLOW_CREDENTIALS = True
CORS_EXPOSE_HEADERS = ['Content-Type', 'X-CSRFToken']
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
    'referrer-policy',
    'x-content-type-options',
    'x-frame-options',
    'x-xss-protection',
]
CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT',
]

# Rate Limiting (requires django-ratelimit)
# Example: Limit to 100 requests per hour
RATELIMIT_ENABLE = True
RATELIMIT_USE_CACHE = True
RATELIMIT_VIEW = '100/h'

# Logging Configuration
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'file': {
            'level': 'WARNING',
            'class': 'logging.FileHandler',
            'filename': BASE_DIR / 'logs' / 'django.log',
            'formatter': 'verbose',
        },
        'console': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console', 'file'],
        'level': 'WARNING',
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
        'django.security': {
            'handlers': ['console', 'file'],
            'level': 'WARNING',
            'propagate': False,
        },
    },
}

# Create logs directory if it doesn't exist
LOGS_DIR = BASE_DIR / 'logs'
LOGS_DIR.mkdir(exist_ok=True)

# Security Headers Middleware
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# Prevent MIME type sniffing
SECURE_CONTENT_TYPE_NOSNIFF = True

# ── Resend Email / OTP ───────────────────────────────────────────────────────
# Resend is used for transactional OTP emails.
# Set RESEND_API_KEY on your hosting platform (Render, etc.) for production.
RESEND_API_KEY   = os.environ.get('RESEND_API_KEY', '')
DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL', 'EK-SMS <noreply@elkendeh.com>')

# OTP settings
OTP_EXPIRY_MINUTES = int(os.environ.get('OTP_EXPIRY_MINUTES', 10))
