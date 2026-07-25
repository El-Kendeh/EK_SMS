# EK-SMS Deployment Environment Setup Guide

This guide provides all necessary environment variable configuration for deploying EK-SMS to Ubuntu Linux server and Vercel.

## 1. Backend (Ubuntu Linux Server) - Environment Variables

Create a `.env` file in `/var/www/ek-sms/eksms/` with the following configuration:

```bash
# Django Settings
DEBUG=False
SECRET_KEY=your-very-secure-secret-key-min-50-chars-here-change-in-production
DJANGO_SETTINGS_MODULE=eksms.settings_secure

# Host Configuration
ALLOWED_HOSTS=backend.pruhsms.africa,localhost,127.0.0.1,ek-sms-backend.onrender.com
CORS_ALLOWED_ORIGINS=https://ek-sms-one.vercel.app,https://pruhsms.africa,https://www.pruhsms.africa,https://backend.pruhsms.africa

# Database Configuration (SQLite default, can switch to MySQL)
DATABASE_TYPE=sqlite3
# For MySQL, uncomment and configure:
# DATABASE_TYPE=mysql
# DB_NAME=ek_sms_production
# DB_USER=ek_sms_user
# DB_PASSWORD=secure-db-password
# DB_HOST=localhost
# DB_PORT=3306

# Security Settings
SECURE_SSL_REDIRECT=True
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=False
SECURE_HSTS_SECONDS=31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS=True
SECURE_HSTS_PRELOAD=True

# Email/OTP Configuration (Resend API)
# Sign up at https://resend.com to get API key
RESEND_API_KEY=re_your-resend-api-key-here
DEFAULT_FROM_EMAIL=EK-SMS <noreply@elkendeh.com>
OTP_EXPIRY_MINUTES=10

# Python Configuration
PYTHONUNBUFFERED=1
```

### Installation Steps on Ubuntu Server:

```bash
# 1. SSH into your server
ssh user@backend.pruhsms.africa

# 2. Install system dependencies
sudo apt update
sudo apt install -y python3-pip python3-venv nginx git certbot python3-certbot-nginx

# 3. Create application directory
sudo mkdir -p /var/www/ek-sms
sudo chown -R $USER:$USER /var/www/ek-sms

# 4. Clone repository
cd /var/www/ek-sms
git clone https://github.com/yourusername/ek-sms.git .

# 5. Setup Python environment
cd eksms
python3 -m venv venv
source venv/bin/activate

# 6. Install dependencies
pip install --upgrade pip setuptools wheel
pip install -r requirements.txt
pip install gunicorn

# 7. Create .env file
nano .env
# Paste the environment variables from above and save (Ctrl+X, Y, Enter)

# 8. Load environment variables
set -a
source .env
set +a

# 9. Run Django checks
python manage.py check

# 10. Collect static files
python manage.py collectstatic --noinput --clear

# 11. Create migrations and migrate
python manage.py migrate

# 12. Create superuser (optional, for admin)
python manage.py createsuperuser
```

### Systemd Service Configuration

Create `/etc/systemd/system/eksms.service`:

```ini
[Unit]
Description=EK-SMS Django Application (Gunicorn)
After=network.target

[Service]
Type=notify
User=www-data
Group=www-data
WorkingDirectory=/var/www/ek-sms/eksms

# Load environment variables
EnvironmentFile=/var/www/ek-sms/eksms/.env
Environment="PATH=/var/www/ek-sms/eksms/venv/bin"

# Start command
ExecStart=/var/www/ek-sms/eksms/venv/bin/gunicorn \
    --workers 4 \
    --worker-class sync \
    --bind unix:/var/www/ek-sms/eksms/eksms.sock \
    --timeout 120 \
    --access-logfile /var/log/eksms/access.log \
    --error-logfile /var/log/eksms/error.log \
    eksms.wsgi:application

# Restart on failure
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo mkdir -p /var/log/eksms
sudo chown www-data:www-data /var/log/eksms

sudo systemctl daemon-reload
sudo systemctl enable eksms
sudo systemctl start eksms
sudo systemctl status eksms
```

### Nginx Configuration

Create `/etc/nginx/sites-available/eksms`:

```nginx
# HTTP redirect to HTTPS
server {
    listen 80;
    server_name backend.pruhsms.africa;
    return 301 https://$server_name$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name backend.pruhsms.africa;

    # SSL Certificate paths (added by Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/backend.pruhsms.africa/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/backend.pruhsms.africa/privkey.pem;

    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css text/javascript application/json application/javascript;

    client_max_body_size 100M;

    # Favicon & robots
    location = /favicon.ico { access_log off; log_not_found off; }
    location = /robots.txt { access_log off; log_not_found off; }

    # Static files
    location /static/ {
        root /var/www/ek-sms/eksms;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Media files
    location /media/ {
        root /var/www/ek-sms/eksms;
        expires 7d;
    }

    # Django application
    location / {
        include proxy_params;
        proxy_pass http://unix:/var/www/ek-sms/eksms/eksms.sock;
        
        # Proxy headers for proper request info
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $server_name;
        
        # Connection settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Access and error logs
    access_log /var/log/nginx/eksms_access.log;
    error_log /var/log/nginx/eksms_error.log warn;
}
```

Enable and restart Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/eksms /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### SSL Certificate Setup (Let's Encrypt)

```bash
# Install certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain certificate (Nginx will auto-renew)
sudo certbot --nginx -d backend.pruhsms.africa

# Test auto-renewal
sudo certbot renew --dry-run
```

## 2. Frontend (Vercel) - Environment Variables

Deploy the Vercel project with these environment variables in Vercel Dashboard:

### Vercel Environment Variables

```
REACT_APP_API_URL=https://backend.pruhsms.africa
REACT_APP_ENVIRONMENT=production
```

You can also set these in the `vercel.json` file or via the Vercel CLI:

```bash
vercel env add REACT_APP_API_URL
vercel env add REACT_APP_ENVIRONMENT production
vercel deploy --prod
```

## 3. OTP/Email Service Configuration (Resend)

### Setup Resend Account

1. Visit https://resend.com
2. Sign up for free account
3. Create a new project/API key
4. Copy the API key to environment variable `RESEND_API_KEY`

### Email Domain Verification (Optional but Recommended)

1. In Resend dashboard, go to "Domains"
2. Add your domain: `elkendeh.com` or `pruhsms.africa`
3. Add the provided DNS records to your domain registrar
4. Once verified, you can send from any email on that domain

### Test OTP Functionality

```bash
# From your machine, test the OTP endpoint
curl -X POST https://backend.pruhsms.africa/api/send-otp/ \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# You should receive an email with a 6-digit code
```

## 4. Verification Checklist

After deployment, verify the following:

### Backend Health Checks

```bash
# Check if backend is accessible
curl -I https://backend.pruhsms.africa/api/system-health/

# Expected response: 200 OK

# Check CORS headers
curl -I -X OPTIONS \
  -H "Origin: https://ek-sms-one.vercel.app" \
  -H "Access-Control-Request-Method: POST" \
  https://backend.pruhsms.africa/api/register/

# Should include: Access-Control-Allow-Origin header
```

### Frontend Connectivity

1. Visit https://ek-sms-one.vercel.app
2. Try to register a school
3. Check that OTP is sent to email
4. Verify OTP code in email and enter it
5. Should complete registration successfully

### Service Status

```bash
# Check Gunicorn service
sudo systemctl status eksms

# Check Nginx
sudo systemctl status nginx

# View recent logs
sudo journalctl -u eksms -n 50
sudo tail -f /var/log/nginx/eksms_error.log
```

## 5. Troubleshooting

### OTP Not Sending

1. Verify `RESEND_API_KEY` is set correctly
2. Check that `DEFAULT_FROM_EMAIL` is valid
3. View Django logs: `sudo journalctl -u eksms -n 100`
4. Test Resend API directly with cURL

### Database Connection Issues

```bash
# Check SQLite database
cd /var/www/ek-sms/eksms
python manage.py dbshell

# Run migrations if needed
python manage.py migrate
```

### Static Files Not Loading

```bash
# Recollect static files
cd /var/www/ek-sms/eksms
python manage.py collectstatic --noinput --clear
sudo systemctl restart nginx
```

### CORS Errors

1. Verify frontend URL is in `CORS_ALLOWED_ORIGINS`
2. Check `CSRF_TRUSTED_ORIGINS` includes frontend domain
3. Restart Gunicorn: `sudo systemctl restart eksms`

## 6. Maintenance Commands

```bash
# View application logs
sudo journalctl -u eksms -f

# View Nginx logs
sudo tail -f /var/log/nginx/eksms_error.log

# Restart application
sudo systemctl restart eksms

# Update dependencies
cd /var/www/ek-sms/eksms
source venv/bin/activate
pip install --upgrade -r requirements.txt
sudo systemctl restart eksms

# Database backup
cp /var/www/ek-sms/eksms/db.sqlite3 /var/backups/db.sqlite3.$(date +%Y%m%d)

# Cleanup old OTP records (cron job)
# 0 2 * * * /var/www/ek-sms/eksms/venv/bin/python /var/www/ek-sms/eksms/manage.py shell -c "from eksms_core.models import OTPRecord; from django.utils import timezone; OTPRecord.objects.filter(expires_at__lt=timezone.now()).delete()"
```

## 7. Security Hardening

### Firewall Setup

```bash
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### Automatic SSL Renewal

```bash
# Add to crontab
0 12 * * * /usr/bin/certbot renew --quiet
```

### Database Security

```bash
# If using MySQL, create limited user
CREATE USER 'ek_sms_user'@'localhost' IDENTIFIED BY 'strong-password';
GRANT ALL PRIVILEGES ON ek_sms_production.* TO 'ek_sms_user'@'localhost';
FLUSH PRIVILEGES;
```

## Summary

- ✅ Backend: Ubuntu server at `backend.pruhsms.africa`
- ✅ Frontend: Vercel at `ek-sms-one.vercel.app`
- ✅ OTP Service: Resend API
- ✅ SSL: Let's Encrypt certificates
- ✅ Database: SQLite (can upgrade to MySQL)
- ✅ Registration: Works with email verification
- ✅ Cross-origin requests: Properly configured CORS

The system is now ready for production use!
