# Ubuntu Server Environment Setup for EK-SMS Backend

## Overview
This guide provides the complete environment configuration for deploying EK-SMS backend on Ubuntu Linux server at `backend.pruhsms.africa` with Resend OTP service integration.

---

## 1. Environment Variables (.env file)

Create a `.env` file at `/var/www/ek-sms/eksms/.env`:

```env
# Django Core Configuration
DEBUG=False
SECRET_KEY=your-super-secret-key-here-minimum-50-chars-recommended
DJANGO_SETTINGS_MODULE=eksms.settings_secure

# Server Configuration
ALLOWED_HOSTS=backend.pruhsms.africa,localhost,127.0.0.1,www.backend.pruhsms.africa
CORS_ALLOWED_ORIGINS=https://ek-sms-one.vercel.app,https://pruhsms.africa,https://www.pruhsms.africa,https://backend.pruhsms.africa

# Database Configuration
DATABASE_TYPE=sqlite3
# For MySQL: DATABASE_TYPE=mysql
# DB_NAME=eksms_db
# DB_USER=eksms_user
# DB_PASSWORD=your-secure-db-password
# DB_HOST=localhost
# DB_PORT=3306

# Security Settings
SECURE_SSL_REDIRECT=True
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=False
SECURE_HSTS_SECONDS=31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS=True
SECURE_HSTS_PRELOAD=False

# Email Configuration (Resend Service)
RESEND_API_KEY=re_your_resend_api_key_here
DEFAULT_FROM_EMAIL=EK-SMS <noreply@elkendeh.com>

# OTP Configuration
OTP_EXPIRY_MINUTES=10

# Other Configuration
PYTHONUNBUFFERED=1
```

### Steps to Create the .env File:

```bash
# SSH into Ubuntu server
ssh your-username@backend.pruhsms.africa

# Navigate to project
cd /var/www/ek-sms/eksms

# Create .env file
sudo nano .env

# Paste the above environment variables
# Replace sensitive values with actual values
# Save: Ctrl+X, Y, Enter

# Set proper permissions
sudo chmod 600 .env
sudo chown www-data:www-data .env
```

---

## 2. Resend API Setup

### 2.1 Get Resend API Key

1. Go to [Resend.com](https://resend.com)
2. Sign up or log in to your account
3. Navigate to **API Keys** section
4. Create a new API key (or copy existing)
5. Store it securely in your `.env` file as `RESEND_API_KEY`

### 2.2 Verify Domain with Resend

1. In Resend dashboard, go to **Domains**
2. Add domain: `elkendeh.com`
3. Follow DNS verification steps (add DKIM, SPF, DMARC records)
4. Confirm verification

### 2.3 Update Resend Sender Email

Update the `DEFAULT_FROM_EMAIL` in `.env`:
```env
DEFAULT_FROM_EMAIL=EK-SMS <noreply@elkendeh.com>
```

---

## 3. Install Requirements

```bash
cd /var/www/ek-sms/eksms

# Activate virtual environment
source venv/bin/activate

# Upgrade pip
pip install --upgrade pip setuptools wheel

# Install dependencies (including resend)
pip install -r requirements.txt

# Test that Resend is installed
python -c "import resend; print('Resend installed successfully')"
```

---

## 4. Gunicorn Systemd Service Setup

Create service file: `sudo nano /etc/systemd/system/eksms.service`

```ini
[Unit]
Description=Gunicorn instance to serve EK-SMS
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/ek-sms/eksms
Environment="PATH=/var/www/ek-sms/eksms/venv/bin"
EnvironmentFile=/var/www/ek-sms/eksms/.env
ExecStart=/var/www/ek-sms/eksms/venv/bin/gunicorn \
    --workers 3 \
    --worker-class sync \
    --worker-connections 1000 \
    --timeout 60 \
    --bind unix:/var/www/ek-sms/eksms/eksms.sock \
    eksms.wsgi:application

Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable eksms
sudo systemctl start eksms
sudo systemctl status eksms
```

---

## 5. Nginx Configuration

Create: `sudo nano /etc/nginx/sites-available/eksms`

```nginx
upstream eksms {
    server unix:/var/www/ek-sms/eksms/eksms.sock fail_timeout=0;
}

server {
    listen 80;
    server_name backend.pruhsms.africa www.backend.pruhsms.africa;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name backend.pruhsms.africa www.backend.pruhsms.africa;

    # SSL Certificate (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/backend.pruhsms.africa/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/backend.pruhsms.africa/privkey.pem;

    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Logging
    access_log /var/log/nginx/eksms_access.log;
    error_log /var/log/nginx/eksms_error.log;

    # Static files
    location = /favicon.ico { access_log off; log_not_found off; }
    
    location /static/ {
        root /var/www/ek-sms/eksms;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    location /media/ {
        root /var/www/ek-sms/eksms;
        expires 7d;
    }

    # Proxy to Gunicorn
    location / {
        proxy_pass http://eksms;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $server_name;
        proxy_redirect off;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/eksms /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 6. SSL Certificate with Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx -y

# Obtain certificate
sudo certbot --nginx -d backend.pruhsms.africa -d www.backend.pruhsms.africa

# Auto-renew
sudo certbot renew --dry-run
sudo systemctl enable certbot.timer
```

---

## 7. Database Setup

### For SQLite (Default):
```bash
cd /var/www/ek-sms/eksms
source venv/bin/activate
python manage.py migrate --settings=eksms.settings_secure
```

### For MySQL:
```bash
sudo apt install mysql-server -y

# Create database
mysql -u root -p
CREATE DATABASE eksms_db;
CREATE USER 'eksms_user'@'localhost' IDENTIFIED BY 'secure-password';
GRANT ALL PRIVILEGES ON eksms_db.* TO 'eksms_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;

# Update .env with MySQL credentials
# Then migrate
python manage.py migrate --settings=eksms.settings_secure
```

---

## 8. Create Superuser

```bash
cd /var/www/ek-sms/eksms
source venv/bin/activate
python manage.py createsuperuser --settings=eksms.settings_secure
```

---

## 9. Verification Tests

### Test OTP Email Sending

```bash
cd /var/www/ek-sms/eksms
source venv/bin/activate
python manage.py shell --settings=eksms.settings_secure
```

Then in shell:
```python
import resend
from django.conf import settings

resend.api_key = settings.RESEND_API_KEY

# Test send
result = resend.Emails.send({
    "from": settings.DEFAULT_FROM_EMAIL,
    "to": ["test@example.com"],
    "subject": "Test Email",
    "html": "<p>This is a test</p>"
})

print(f"Email sent: {result['id']}")
```

### Test CORS Headers

```bash
curl -I -X OPTIONS \
  -H "Origin: https://ek-sms-one.vercel.app" \
  -H "Access-Control-Request-Method: POST" \
  https://backend.pruhsms.africa/api/send-otp/
```

Expected response includes:
```
Access-Control-Allow-Origin: https://ek-sms-one.vercel.app
Access-Control-Allow-Methods: POST, OPTIONS
```

### Test Registration Endpoint

```bash
curl -X POST https://backend.pruhsms.africa/api/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "institutionName": "Test School",
    "adminUsername": "testadmin",
    "password": "SecurePass123!",
    "email": "test@school.com"
  }'
```

---

## 10. Monitoring & Logging

### Check Service Status
```bash
sudo systemctl status eksms
sudo journalctl -u eksms -f  # Follow logs
```

### Nginx Logs
```bash
tail -f /var/log/nginx/eksms_access.log
tail -f /var/log/nginx/eksms_error.log
```

### Django Logs
```bash
tail -f /var/www/ek-sms/eksms/logs/django.log
```

---

## 11. Security Checklist

- [x] `.env` file has proper permissions (600)
- [x] Database credentials stored in `.env`
- [x] RESEND_API_KEY configured
- [x] SSL/HTTPS enabled
- [x] HSTS headers configured
- [x] CORS origins restricted
- [x] DEBUG set to False
- [x] Secret key is strong (50+ characters)
- [x] Static files collected
- [x] Media directory permissions set correctly

---

## 12. Troubleshooting

### Issue: "Module not found: resend"
```bash
source venv/bin/activate
pip install resend==0.7.0
```

### Issue: RESEND_API_KEY not working
```bash
# Verify .env is loaded
grep RESEND_API_KEY /var/www/ek-sms/eksms/.env

# Restart service
sudo systemctl restart eksms
```

### Issue: OTP emails not sending
```bash
# Check Resend API key validity
# Check domain verification in Resend dashboard
# View Django logs for specific error
tail -f /var/www/ek-sms/eksms/logs/django.log
```

### Issue: CORS errors
```bash
# Verify CORS_ALLOWED_ORIGINS in .env
# Verify backend.pruhsms.africa DNS is working
nslookup backend.pruhsms.africa
```

---

## Final Notes

- This configuration assumes Ubuntu 22.04 LTS or 24.04 LTS
- Replace all placeholder values with your actual credentials
- Keep `.env` file secure and never commit to Git
- Regularly update requirements.txt dependencies
- Monitor service health with `systemctl status eksms`
