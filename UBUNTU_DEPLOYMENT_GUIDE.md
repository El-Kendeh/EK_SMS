# Ubuntu Linux Deployment Guide for EK-SMS Backend

This guide explains how to set up the Django backend on an Ubuntu Linux server at `backend.pruhsms.africa`.

## 1. Prerequisites
- Ubuntu 22.04 or 24.04 LTS
- Python 3.10+
- Nginx
- Git

## 2. Server Setup

### Install Dependencies
```bash
sudo apt update
sudo apt install python3-pip python3-venv nginx git
```

### Clone and Setup Project
```bash
cd /var/www
# Replace with your actual git repository URL
sudo git clone https://github.com/yourusername/ek-sms.git
sudo chown -R $USER:$USER ek-sms
cd ek-sms
```

### Setup Backend Environment
```bash
cd eksms
# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install requirements
pip install -r requirements.txt
pip install gunicorn
```

### Setup Environment Variables
Create a `.env` file in `/var/www/ek-sms/eksms/` (where `manage.py` is):
```env
DEBUG=False
SECRET_KEY=your-secure-secret-key-here
ALLOWED_HOSTS=backend.pruhsms.africa,localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=https://ek-sms-one.vercel.app,https://pruhsms.africa,https://www.pruhsms.africa
DATABASE_TYPE=sqlite3
SECURE_SSL_REDIRECT=True
```

## 3. Gunicorn Systemd Setup

Create a service file: `sudo nano /etc/systemd/system/eksms.service`

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
    --bind unix:/var/www/ek-sms/eksms/eksms.sock \
    eksms.wsgi:application

[Install]
WantedBy=multi-user.target
```

**Note:** Ensure permissions: `sudo chown -R www-data:www-data /var/www/ek-sms`

```bash
sudo systemctl start eksms
sudo systemctl enable eksms
```

## 4. Nginx Configuration

Create Nginx config: `sudo nano /etc/nginx/sites-available/eksms`

```nginx
server {
    listen 80;
    server_name backend.pruhsms.africa;

    location = /favicon.ico { access_log off; log_not_found off; }
    
    location /static/ {
        root /var/www/ek-sms/eksms;
    }

    location /media/ {
        root /var/www/ek-sms/eksms;
    }

    location / {
        include proxy_params;
        proxy_pass http://unix:/var/www/ek-sms/eksms/eksms.sock;
        
        # Security and CORS Headers propagation
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/eksms /etc/nginx/sites-enabled
sudo nginx -t
sudo systemctl restart nginx
```

## 5. SSL with Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d backend.pruhsms.africa
```

## 6. Verifying the Fix

The "No 'Access-Control-Allow-Origin' header" error was caused by the following issues now fixed in the code:

1. **Host Mismatch**: Django rejected requests because `backend.pruhsms.africa` wasn't in `ALLOWED_HOSTS`.
2. **Missing Views**: imported views in `urls.py` like `api_receive_logs` didn't exist in `views.py`, causing the app to fail to start.
3. **Internal Errors**: Application crashes strip CORS headers by default.

**Test Command:**
Run this on any machine with `curl`:
```bash
curl -I -X OPTIONS -H "Origin: https://ek-sms-one.vercel.app" \
     -H "Access-Control-Request-Method: POST" \
     https://backend.pruhsms.africa/api/logs/
```
You should see: `Access-Control-Allow-Origin: https://ek-sms-one.vercel.app`
