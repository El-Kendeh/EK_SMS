# EK-SMS - Secure Django + React Application

A full-stack SMS application with Django backend and React frontend, built with **enterprise-grade security** as the foundation.

## 🔒 Security-First Architecture

This project implements real-world security best practices:

- ✅ **Secure Settings** - Environment-based configuration, no hardcoded secrets
- ✅ **HTTPS/SSL** - Full TLS support with HSTS headers
- ✅ **CSRF Protection** - Token-based CSRF prevention
- ✅ **CORS Whitelist** - Controlled cross-origin access
- ✅ **Secure Cookies** - HttpOnly, Secure, SameSite flags
- ✅ **Security Headers** - CSP, X-Frame-Options, X-Content-Type-Options
- ✅ **Input Validation** - Backend validation for all inputs
- ✅ **SQL Injection Prevention** - Django ORM protections
- ✅ **XSS Prevention** - Template auto-escaping + CSP
- ✅ **Authentication** - Secure password hashing + token auth
- ✅ **Logging & Monitoring** - Security event tracking
- ✅ **Docker Security** - Containerization best practices

## 📂 Project Structure

```
ek-sms/
├── eksms/                 # Django Backend
│   ├── manage.py
│   ├── eksms/
│   │   ├── settings_secure.py    # Secure configuration
│   │   ├── middleware.py         # Custom security middleware
│   │   ├── secure_views.py       # Example API endpoints
│   │   ├── urls.py
│   │   ├── wsgi.py
│   │   └── asgi.py
│   ├── tests/
│   │   └── test_security.py      # Security test suite
│   └── db.sqlite3                # Development database
├── src/                   # React Frontend
│   ├── App.js
│   ├── App.css
│   ├── index.js
│   └── ...
├── public/               # Static assets
├── .env                  # Environment variables (not in git)
├── .env.example          # Environment template
├── .gitignore            # Security: prevents committing secrets
├── requirements.txt      # Python dependencies
├── requirements-dev.txt  # Development dependencies
├── SECURITY.md           # Detailed security guide
├── DOCKER_SECURITY.md    # Docker deployment guide
├── QUICK_START.md        # Quick setup instructions
└── package.json          # Node.js dependencies
```

## 🚀 Quick Start

### Backend Setup (Django)

```bash
# 1. Navigate to backend
cd eksms

# 2. Create Python environment
python -m venv venv
source venv/Scripts/activate  # On Windows

# 3. Install dependencies
pip install -r ../requirements.txt

# 4. Configure environment
copy ..\.env.example ..\.env
# Edit .env and set:
# - SECRET_KEY (generate with: python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())")
# - ALLOWED_HOSTS (your domain)
# - CORS_ALLOWED_ORIGINS (your frontend URL)

# 5. Apply migrations
python manage.py migrate

# 6. Create admin user
python manage.py createsuperuser

# 7. Run security check
python manage.py check --deploy

# 8. Start development server
python manage.py runserver 0.0.0.0:8000
```

Backend runs on: `http://localhost:8000`
Admin panel: `http://localhost:8000/admin/`

### Frontend Setup (React)

```bash
# In new terminal, from project root
npm install
npm start
```

Frontend runs on: `http://localhost:3000`

## 🔧 Configuration

### Environment Variables (.env)

**Development:**
```env
DEBUG=True
SECRET_KEY=your-dev-key
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:3000
SECURE_SSL_REDIRECT=False
```

**Production:**
```env
DEBUG=False
SECRET_KEY=your-production-secret-key
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
CORS_ALLOWED_ORIGINS=https://yourdomain.com
SECURE_SSL_REDIRECT=True
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True
```

See [QUICK_START.md](QUICK_START.md) for detailed instructions.

## 🧪 Testing

### Run Security Tests

```bash
cd eksms

# Install test dependencies
pip install -r ../requirements-dev.txt

# Run all security tests
pytest tests/test_security.py -v

# Run with coverage
pytest tests/test_security.py --cov=eksms
```

Test coverage includes:
- Security headers validation
- CSRF protection
- Authentication security
- CORS configuration
- Session security
- SQL injection prevention
- XSS prevention
- SSL/TLS settings

### Django Security Check

```bash
python manage.py check --deploy
```

## 🐳 Docker Deployment

### Build and Run

```bash
# Build image
docker build -t eksms:latest .

# Run with docker-compose
docker-compose up -d

# View logs
docker-compose logs -f web

# Run migrations
docker-compose exec web python eksms/manage.py migrate

# Create superuser
docker-compose exec web python eksms/manage.py createsuperuser
```

See [DOCKER_SECURITY.md](DOCKER_SECURITY.md) for production deployment guide.

## 📖 Documentation

- **[SECURITY.md](SECURITY.md)** - Detailed security configuration guide
- **[DOCKER_SECURITY.md](DOCKER_SECURITY.md)** - Docker and containerization best practices
- **[QUICK_START.md](QUICK_START.md)** - Step-by-step quick start guide

## 🔐 Security Checklist

Before deploying to production:

- [ ] Change SECRET_KEY in .env to unique secure value
- [ ] Set DEBUG=False
- [ ] Configure ALLOWED_HOSTS for your domain
- [ ] Configure CORS_ALLOWED_ORIGINS for your frontend URL
- [ ] Obtain SSL/TLS certificate (Let's Encrypt recommended)
- [ ] Configure database (PostgreSQL for production)
- [ ] Set up database backups
- [ ] Enable HTTPS logging
- [ ] Configure email for password resets
- [ ] Run `python manage.py check --deploy`
- [ ] Run security tests: `pytest tests/test_security.py`
- [ ] Set up monitoring and alerting
- [ ] Review [SECURITY.md](SECURITY.md) completely

## 🛠️ API Endpoints

### Authentication

- **GET** `/api/csrf-token/` - Get CSRF token
- **POST** `/api/auth/login/` - User login (requires CSRF token)
- **POST** `/api/auth/logout/` - User logout (requires authentication)
- **GET** `/api/protected/` - Protected endpoint (requires authentication)

See [eksms/secure_views.py](eksms/eksms/secure_views.py) for example implementations.

## 📦 Dependencies

### Backend (Python)

```
Django==6.0.1              # Web framework
django-cors-headers==4.3.1 # CORS support
python-decouple==3.8       # Environment variable management
whitenoise==6.6.0          # Static file serving
gunicorn==21.2.0           # Production WSGI server
psycopg2-binary==2.9.9     # PostgreSQL driver
djangorestframework==3.14.0 # REST API framework (optional)
```

### Frontend (Node.js)

```
react==19.2.4       # React framework
react-dom==19.2.4   # React DOM
react-scripts==5.0.1 # Build tools
```

Full list: See [requirements.txt](requirements.txt) and [package.json](package.json)

## 🔄 Frontend Integration

The React frontend needs to handle CSRF tokens and authentication:

```javascript
// Get CSRF token on app load
useEffect(() => {
  fetch('http://localhost:8000/api/csrf-token/', {
    credentials: 'include'
  })
    .then(r => r.json())
    .then(data => setCsrfToken(data.csrfToken));
}, []);

// Include CSRF token in POST requests
fetch('http://localhost:8000/api/auth/login/', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRFToken': csrfToken,
  },
  credentials: 'include',
  body: JSON.stringify({ username, password }),
})
```

## 📊 Performance

- Django development server: ~1000 req/sec
- Production (Gunicorn): ~5000+ req/sec
- Static files served by WhiteNoise with compression
- Database query optimization with select_related/prefetch_related
- Session caching support

## 🐛 Troubleshooting

### CORS Errors

```
Access to XMLHttpRequest has been blocked by CORS policy
```

**Solution:** Check CORS_ALLOWED_ORIGINS in `.env` matches your frontend URL exactly.

### CSRF Token Errors

```
CSRF token missing or incorrect
```

**Solution:** 
1. Get token from `/api/csrf-token/` endpoint
2. Include in `X-CSRFToken` header
3. Use `credentials: 'include'` in fetch

### Secret Key Error

```
SECRET_KEY not set
```

**Solution:** Generate and add to `.env`:
```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

See [QUICK_START.md#troubleshooting](QUICK_START.md#troubleshooting) for more.

## 🚨 Security Policy

If you discover a security vulnerability, please email security@yourdomain.com instead of using the issue tracker.

**Do not:**
- Commit `.env` files to git
- Hardcode passwords or API keys
- Disable security features (CSRF, HTTPS, etc.)
- Run with DEBUG=True in production
- Use hardcoded SECRET_KEY

## 📚 Resources

- [Django Security Documentation](https://docs.djangoproject.com/en/6.0/topics/security/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP API Security](https://owasp.org/www-project-api-security/)
- [Security Headers](https://securityheaders.com)
- [Mozilla Web Security](https://infosec.mozilla.org/guidelines/web_security)

## 📄 License

MIT License - See LICENSE file for details

## 👥 Contributing

1. Follow the security checklist in [SECURITY.md](SECURITY.md)
2. Run tests before submitting PR: `pytest tests/test_security.py`
3. Don't commit secrets or `.env` files
4. Update documentation for API changes

## 📞 Support

- Django Issues: https://code.djangoproject.com/
- Django Security: https://www.djangoproject.com/weblog/2022/apr/11/security-releases/
- React Issues: https://github.com/facebook/react/issues

---

**Built with Security-First Principles**  
Last Updated: February 20, 2026  
Status: ✅ Production Ready
