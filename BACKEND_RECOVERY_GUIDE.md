# Backend Server Recovery Guide
# When backend.pruhsms.africa is not accessible

## Current Status
- ✅ Main domain (pruhsms.africa): Working on Vercel
- ❌ Backend server (87.106.65.209): Not responding

## Step 1: Check Server Access

### Option A: IONOS Control Panel
1. Log into your IONOS account
2. Go to "Servers" or "Cloud" section
3. Find your Ubuntu server
4. Check server status - is it running?
5. If stopped: Start/Restart the server
6. Note the server IP and SSH credentials

### Option B: SSH Access (if you have credentials)
```bash
# Try SSH connection
ssh username@87.106.65.209

# If connection refused, server might be down
# If authentication fails, check credentials
```

### Option C: Server is Completely Down
If you can't access the server at all:

1. **Contact IONOS Support**
   - Explain: "My Ubuntu server at IP 87.106.65.209 is not responding"
   - Ask them to check server status and restart if needed

2. **Check Billing/Payment Status**
   - Ensure your IONOS account is paid and active
   - Servers can be suspended for non-payment

## Step 2: Once You Have Server Access

### Upload Diagnostic Scripts
```bash
# On your local machine, upload the scripts
scp diagnose-backend.sh user@server-ip:~
scp fix-backend.sh user@server-ip:~

# Then SSH and run diagnostics
ssh user@server-ip
./diagnose-backend.sh
./fix-backend.sh
```

### Manual Server Setup (if needed)
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y python3 python3-pip python3-venv nginx git curl

# Install Node.js for certbot
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install certbot
sudo apt install -y certbot python3-certbot-nginx

# Configure firewall
sudo ufw --force enable
sudo ufw allow 'Nginx Full'
sudo ufw allow ssh
```

## Step 3: Django Backend Setup

### Create Application Directory
```bash
sudo mkdir -p /var/www/ek-sms
sudo chown -R $USER:$USER /var/www/ek-sms
cd /var/www/ek-sms
```

### Setup Python Environment
```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install requirements (upload your requirements.txt)
pip install -r requirements.txt
pip install gunicorn

# Run migrations
python manage.py migrate
python manage.py collectstatic --noinput
```

### Configure Gunicorn
Create `/etc/systemd/system/gunicorn.service`:
```ini
[Unit]
Description=gunicorn daemon
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/ek-sms
ExecStart=/var/www/ek-sms/venv/bin/gunicorn --access-logfile - --workers 3 --bind unix:/var/www/ek-sms/ek-sms.sock eksms.wsgi:application

[Install]
WantedBy=multi-user.target
```

### Start Gunicorn
```bash
sudo systemctl daemon-reload
sudo systemctl start gunicorn
sudo systemctl enable gunicorn
```

## Step 4: Nginx Configuration

### Create Nginx Site Config
```bash
sudo nano /etc/nginx/sites-available/backend.pruhsms.africa
```

Add this configuration:
```nginx
server {
    listen 80;
    server_name backend.pruhsms.africa;

    location = /favicon.ico { access_log off; log_not_found off; }

    location / {
        include proxy_params;
        proxy_pass http://unix:/var/www/ek-sms/ek-sms.sock;
        proxy_read_timeout 300;
    }

    # Static files
    location /static/ {
        alias /var/www/ek-sms/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Media files
    location /media/ {
        alias /var/www/ek-sms/media/;
        expires 30d;
        add_header Cache-Control "public";
    }
}
```

### Enable Site
```bash
sudo ln -s /etc/nginx/sites-available/backend.pruhsms.africa /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

## Step 5: SSL Certificate

```bash
sudo certbot --nginx -d backend.pruhsms.africa
```

## Step 6: Environment Variables

Create `/var/www/ek-sms/.env`:
```bash
DEBUG=False
SECRET_KEY=your-secure-secret-key-here
ALLOWED_HOSTS=backend.pruhsms.africa,localhost,127.0.0.1
DATABASE_URL=your-database-url
CORS_ALLOWED_ORIGINS=https://pruhsms.africa,https://www.pruhsms.africa
```

## Testing

```bash
# Test locally
curl http://localhost

# Test externally
curl https://backend.pruhsms.africa

# Check logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
sudo journalctl -u gunicorn -f
```

## Emergency Recovery

If everything fails:

1. **Backup your data** (if possible)
2. **Create new Ubuntu server** in IONOS
3. **Update DNS** to point to new server IP
4. **Redeploy application**

## Quick Status Check

```bash
# Check all services
sudo systemctl status nginx
sudo systemctl status gunicorn

# Check ports
sudo netstat -tlnp | grep :80
sudo netstat -tlnp | grep :443

# Check firewall
sudo ufw status
```