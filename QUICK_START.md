# Backend Security Implementation - Quick Start

This guide helps you implement the robust security configuration for your Django backend.

## 🚀 Quick Setup (5 minutes)

### 1. Install Dependencies
```bash
cd eksms
pip install -r ../requirements.txt
```

### 2. Configure Environment
```bash
# Copy and edit the environment file
copy ..\.env.example ..\.env

# Edit .env and change:
# - SECRET_KEY to a new secure value
# - ALLOWED_HOSTS to your domain
# - CORS_ALLOWED_ORIGINS to your frontend URL
```

### 3. Generate New Secret Key
```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
# Copy the output and paste into .env SECRET_KEY
```

### 4. Apply Changes
```bash
# Run migrations
python manage.py migrate

# Collect static files
python manage.py collectstatic --noinput

# Create superuser
python manage.py createsuperuser
```

### 5. Test Security
```bash
# Run security check
python manage.py check --deploy

# Run security tests
pytest tests/test_security.py
```

## 📋 What Changed

### Settings Configuration
| Feature | Before | After |
|---------|--------|-------|
| DEBUG Mode | TRUE (exposed info) | FALSE (via env var) |
| SECRET_KEY | Hardcoded in repo | Loaded from .env |
| ALLOWED_HOSTS | Empty [] | Configured via env |
| HTTPS Redirect | Not set | Enabled in production |
| CSRF Protection | Basic | Enhanced with SameSite |
| CORS | Not configured | Whitelist-based |
| Session Security | Default | Secure cookies + timeout |
| Password Strength | 8 chars | 12 chars minimum |
| Logging | Minimal | Full security logging |
| Headers | Basic | Comprehensive security headers |

### New Files Created

```
.env                           # Development environment variables
.env.example                   # Template for production
.gitignore                     # Keep secrets out of git
requirements.txt               # Production dependencies
requirements-dev.txt           # Development tools
eksms/settings_secure.py       # Secure Django configuration
eksms/middleware.py            # Custom security middleware
eksms/secure_views.py          # Example API views with auth
tests/test_security.py         # Security test suite
SECURITY.md                    # Detailed security guide
DOCKER_SECURITY.md             # Containerization guide
```

## 🔒 Security Features Enabled

### ✅ Immediate Benefits
- [x] Debug mode disabled (prevents information leakage)
- [x] Secret key randomization
- [x] HTTPS enforcement in production
- [x] CSRF token protection
- [x] CORS whitelist configuration
- [x] Secure session cookies
- [x] Strong password validation
- [x] Security headers (CSP, HSTS, X-Frame-Options, etc.)
- [x] Input validation helpers
- [x] Security logging and monitoring

### ✅ Built-in Protections
- SQL Injection: Protected by Django ORM
- XSS: Protected by template auto-escaping
- CSRF: Enabled middleware
- Clickjacking: X-Frame-Options: DENY
- MIME Sniffing: X-Content-Type-Options: nosniff
- Insecure Transport: HSTS headers + SSL redirect

## 🧪 Running Tests

### Install Test Dependencies
```bash
pip install -r ../requirements-dev.txt
```

### Run All Tests
```bash
# Run all tests
pytest

# Run only security tests
pytest tests/test_security.py -v

# Run with coverage
pytest --cov=. tests/test_security.py
```

## 📱 Frontend Integration

Your React frontend needs to:

1. **GET CSRF Token on App Load**
   ```javascript
   useEffect(() => {
     fetch('http://localhost:8000/api/csrf-token/')
       .then(r => r.json())
       .then(data => setCsrfToken(data.csrfToken));
   }, []);
   ```

2. **Include CSRF Token in Requests**
   ```javascript
   fetch('http://localhost:8000/api/auth/login/', {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
       'X-CSRFToken': csrfToken,
     },
     body: JSON.stringify({ username, password }),
     credentials: 'include', // Important for cookies
   })
   ```

3. **Use HTTPS in Production**
   - Change `http://` to `https://` in API URLs

## 🐳 Docker Deployment

### Build Docker Image
```bash
docker build -t eksms:latest .
```

### Run with Docker Compose
```bash
docker-compose up -d
```

### Check Logs
```bash
docker-compose logs -f web
```

See [DOCKER_SECURITY.md](DOCKER_SECURITY.md) for full Docker security setup.

## 🔑 Environment Variables Reference

### Development (.env)
```env
DEBUG=True
SECRET_KEY=your-dev-key-here
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:3000
SECURE_SSL_REDIRECT=False
SESSION_COOKIE_SECURE=False
CSRF_COOKIE_SECURE=False
```

### Production (.env)
```env
DEBUG=False
SECRET_KEY=your-production-key-change-daily
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
CORS_ALLOWED_ORIGINS=https://yourdomain.com
SECURE_SSL_REDIRECT=True
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True
DB_ENGINE=django.db.backends.postgresql
DB_NAME=eksms_db
DB_USER=eksms_user
DB_PASSWORD=strong-password-here
DB_HOST=postgres.db.host
DB_PORT=5432
```

## ❌ Common Mistakes to Avoid

1. **Committing .env to Git** - Use `.gitignore` ✓
2. **Weak SECRET_KEY** - Generate with Django's utility ✓
3. **Leaving DEBUG=True** - Always False in production ✓
4. **ALLOWED_HOSTS=["*"]** - Whitelist specific hosts ✓
5. **Not using HTTPS** - Always use SSL/TLS in production ✓
6. **Hardcoded credentials** - Use environment variables ✓
7. **Missing CSRF tokens** - Include in all POST requests ✓
8. **Not validating input** - Always validate on backend ✓

## 📊 Security Checklist

- [ ] .env created with strong SECRET_KEY
- [ ] DEBUG=False configured
- [ ] ALLOWED_HOSTS set to your domain
- [ ] CORS_ALLOWED_ORIGINS configured for frontend
- [ ] Database credentials in .env (not in code)
- [ ] HTTPS certificate obtained (Let's Encrypt)
- [ ] Migrations applied to database
- [ ] Static files collected
- [ ] Superuser account created
- [ ] `python manage.py check --deploy` passes
- [ ] Security tests pass: `pytest tests/test_security.py`
- [ ] Logs configured and monitored
- [ ] Backups configured
- [ ] Frontend uses HTTPS and includes CSRF tokens

## 🆘 Troubleshooting

### "SECRET_KEY not set" Error
```bash
# Generate new key
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"

# Add to .env
```

### CORS Errors in Frontend
```bash
# Check CORS_ALLOWED_ORIGINS in .env
# Should match your frontend URL exactly (including http/https)
CORS_ALLOWED_ORIGINS=http://localhost:3000
```

### "ALLOWED_HOSTS" Error
```bash
# Update .env
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com,127.0.0.1
```

### Database Connection Error
```bash
# Check DBsettings in .env, for example
DB_HOST=localhost
DB_PORT=5432
DB_NAME=eksms_db
```

## 📚 Additional Resources

- [Django Security Guide](https://docs.djangoproject.com/en/6.0/topics/security/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Security Headers](https://securityheaders.com)
- [django-cors-headers](https://github.com/adamchainz/django-cors-headers)

## 🎯 Next Steps

1. **Review** [SECURITY.md](SECURITY.md) for detailed configuration
2. **Read** [DOCKER_SECURITY.md](DOCKER_SECURITY.md) for production deployment
3. **Implement** API endpoints in `eksms/secure_views.py`
4. **Test** with `pytest tests/test_security.py`
5. **Deploy** using Docker Compose or your hosting platform

## 📞 Support

For security issues or questions:
1. Check the logs: `tail -f logs/django.log`
2. Run security check: `python manage.py check --deploy`
3. Review test results: `pytest tests/test_security.py -v`
4. Check Django documentation: https://docs.djangoproject.com/

---

**Last Updated:** February 20, 2026
**Django Version:** 6.0.1
**Security Status:** ✅ Hardened
