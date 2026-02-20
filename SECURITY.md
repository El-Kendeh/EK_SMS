# Security Implementation Guide

This document outlines the security features implemented in the ek-sms Django backend.

## Setup Instructions

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Configure Environment Variables
```bash
# Copy the example environment file
copy .env.example .env

# Edit .env with your specific configuration
# CRITICAL: Change SECRET_KEY to a unique value
```

### 3. Migrate Settings
Update your Django settings to use the secure configuration:
```bash
# Update manage.py to use secure settings:
# os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'eksms.settings_secure')
```

## Security Features Implemented

### 1. **Secret Key Management**
- ✅ SECRET_KEY loaded from environment variables
- ✅ Never hardcoded in source code
- ✅ Generate new key: `python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'`

### 2. **Debug Mode Control**
- ✅ DEBUG disabled by default in production
- ✅ Controlled via environment variable
- ✅ Prevents information disclosure

### 3. **Host Validation**
- ✅ ALLOWED_HOSTS configured via environment
- ✅ Prevents Host Header Injection attacks
- ✅ Whitelist-based approach

### 4. **HTTPS/SSL Security**
- ✅ SECURE_SSL_REDIRECT enabled in production
- ✅ HTTP Strict Transport Security (HSTS) configured
- ✅ HSTS preload enabled for modern browsers
- ✅ Secure cookie flags set (HttpOnly, Secure, SameSite)

### 5. **CSRF Protection**
- ✅ CSRF middleware enabled
- ✅ CSRF_COOKIE_SECURE and CSRF_COOKIE_HTTPONLY set
- ✅ SameSite=Strict on CSRF cookies
- ✅ CSRF_TRUSTED_ORIGINS configured for frontend

### 6. **CORS Configuration**
- ✅ django-cors-headers installed
- ✅ Whitelist-based CORS origins
- ✅ CORS_ALLOW_CREDENTIALS enabled
- ✅ Limited HTTP methods and headers allowed

### 7. **Clickjacking Protection**
- ✅ X-Frame-Options set to DENY
- ✅ Content Security Policy (CSP) configured

### 8. **Session Security**
- ✅ SESSION_COOKIE_HTTPONLY enabled
- ✅ SESSION_COOKIE_SECURE enabled
- ✅ SESSION_COOKIE_SAMESITE set to Strict
- ✅ Session timeout: 1 hour (3600 seconds)
- ✅ Sessions expire on browser close

### 9. **Password Security**
- ✅ Minimum password length: 12 characters
- ✅ Multiple password validators enabled
- ✅ Common password validation
- ✅ Numeric-only password prevention

### 10. **Logging & Monitoring**
- ✅ Security events logged
- ✅ File and console logging configured
- ✅ WARNING level for security issues
- ✅ Separate security logger

### 11. **Additional Security**
- ✅ SECURE_CONTENT_TYPE_NOSNIFF enabled (prevents MIME sniffing)
- ✅ SECURE_BROWSER_XSS_FILTER enabled
- ✅ WhiteNoise middleware for static file serving
- ✅ Database connection pooling (production)

## Frontend Integration (.env settings)

### For Development
```
DEBUG=True
SECURE_SSL_REDIRECT=False
SESSION_COOKIE_SECURE=False
CSRF_COOKIE_SECURE=False
SECURE_HSTS_SECONDS=0
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:3000
```

### For Production
```
DEBUG=False
SECURE_SSL_REDIRECT=True
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True
SECURE_HSTS_SECONDS=31536000
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

## Recommended Additional Steps

### 1. Database
- [ ] In production, use PostgreSQL instead of SQLite
- [ ] Configure DB credentials in .env
- [ ] Use strong database passwords
- [ ] Enable SSL for database connections

### 2. API Authentication
- [ ] Consider Django REST Framework with Token Authentication
- [ ] Implement OAuth2 for third-party integrations
- [ ] Use JWT for stateless authentication if needed

### 3. API Rate Limiting
```python
# Install: pip install django-ratelimit
from django_ratelimit.decorators import ratelimit

@ratelimit(key='ip', rate='100/h')
def my_view(request):
    pass
```

### 4. Input Validation
- [ ] Always validate user input on backend
- [ ] Use Django Forms or DRF Serializers
- [ ] Implement content-type validation

### 5. SQL Injection Prevention
- ✅ Already protected by Django ORM
- [ ] Never use raw SQL with string concatenation
- [ ] Use parameterized queries if needed

### 6. XSS Prevention
- ✅ Django templates auto-escape by default
- [ ] Use `mark_safe()` only for trusted content
- [ ] Implement Content Security Policy (CSP)

### 7. Dependency Security
```bash
# Check for known vulnerabilities in dependencies
pip install safety
safety check
```

### 8. Regular Security Updates
```bash
# Keep Django and plugins updated
pip install --upgrade -r requirements.txt
```

## Running in Production

### Using Gunicorn
```bash
gunicorn eksms.wsgi:application --bind 0.0.0.0:8000 --workers 4
```

### Using Docker (Recommended)
```dockerfile
FROM python:3.11
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["gunicorn", "eksms.wsgi:application", "--bind", "0.0.0.0:8000"]
```

### Environment Setup with Nginx Reverse Proxy
- Nginx handles SSL/TLS
- Nginx handles static files
- Django runs on localhost only
- Environment variables loaded via systemd or docker

## Security Checklist

- [ ] Changed SECRET_KEY in .env
- [ ] Set DEBUG=False
- [ ] Configured ALLOWED_HOSTS
- [ ] Configured CORS_ALLOWED_ORIGINS for your frontend
- [ ] Set up HTTPS certificate
- [ ] Created strong database passwords
- [ ] Enabled logging
- [ ] Ran `python manage.py check --deploy`
- [ ] Set up database backups
- [ ] Configured email for password resets
- [ ] Implemented API authentication (if applicable)
- [ ] Set up monitoring and alerting

## Django Deployment Checklist

Run this command to check for common security issues:
```bash
python manage.py check --deploy
```

## References

- [Django Security Documentation](https://docs.djangoproject.com/en/6.0/topics/security/)
- [OWASP Top 10 Web Application Security Risks](https://owasp.org/www-project-top-ten/)
- [django-cors-headers](https://github.com/adamchainz/django-cors-headers)
- [WhiteNoise Documentation](https://whitenoise.evans.io/)

## Support

For security updates and advisories, check:
- Django Security releases: https://www.djangoproject.com/weblog/
- Python Security: https://python.org/dev/peps/pep-0541/
