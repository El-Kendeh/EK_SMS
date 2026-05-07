#!/bin/bash

# Ubuntu Production Deployment Script for EK-SMS
# Run this script on your Ubuntu server as root or with sudo

set -e

echo "🚀 Starting EK-SMS Ubuntu Production Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DOMAIN="backend.pruhsms.africa"
DB_NAME="eksms_db"
DB_USER="eksms_user"
DB_PASS="elkinson"
APP_DIR="/var/www/ek-sms"
REPO_URL="https://github.com/your-repo/ek-sms.git"  # Replace with your actual repo URL

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root. Please run as a regular user with sudo privileges."
   exit 1
fi

print_status "Updating system packages..."
sudo apt update && sudo apt upgrade -y

print_status "Installing required packages..."
sudo apt install -y python3 python3-pip python3-venv nginx mysql-server certbot python3-certbot-nginx git

print_status "Configuring MySQL..."
sudo mysql_secure_installation << EOF

y
y
$DB_PASS
$DB_PASS
y
y
y
y
EOF

# Create database and user
sudo mysql -u root -p$DB_PASS << EOF
CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASS';
GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'localhost';
FLUSH PRIVILEGES;
EOF

print_status "Setting up application directory..."
sudo mkdir -p $APP_DIR
sudo chown -R $USER:$USER $APP_DIR

print_status "Cloning repository..."
if [ -d "$APP_DIR/.git" ]; then
    cd $APP_DIR
    git pull origin main
else
    git clone $REPO_URL $APP_DIR
    cd $APP_DIR
fi

print_status "Setting up Python virtual environment..."
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
pip install gunicorn mysqlclient

print_status "Configuring environment..."
cp .env.example .env
# Update .env with production values
cat > .env << EOF
# Django Settings
DEBUG=False
SECRET_KEY=)$0h_7ji9am64clg4nid4oiycl5@apg^a!$b#b#t29!)zd(4s*
ALLOWED_HOSTS=localhost,127.0.0.1,$DOMAIN,www.$DOMAIN
CORS_ALLOWED_ORIGINS=http://localhost:3000,https://$DOMAIN,https://www.$DOMAIN,https://ek-sms-one.vercel.app

# Database - MySQL for Ubuntu Production
DATABASE_TYPE=mysql
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASS
DB_HOST=localhost
DB_PORT=3306

# Email Configuration (Configure these with your actual email settings)
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
DEFAULT_FROM_EMAIL=PRUH-SMS <noreply@elkendeh.com>
SUPERADMIN_ALERT_EMAILS=superadmin@pruhsms.africa,admin@elkendeh.com

# Security (Strict Production Settings)
SECURE_SSL_REDIRECT=True
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True
SECURE_HSTS_SECONDS=31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS=True
SECURE_HSTS_PRELOAD=True
SECURE_CROSS_ORIGIN_OPENER_POLICY=same-origin

# Resend Email (OTP delivery) - Alternative to SMTP
RESEND_API_KEY=re_NXpdKJ94_5DzJSnV2PrnydEtVjefcDtwD
EOF

print_status "Running database migrations..."
cd eksms
python manage.py migrate
python manage.py collectstatic --noinput

print_status "Creating superuser..."
echo "from django.contrib.auth import get_user_model; User = get_user_model(); User.objects.create_superuser('admin', 'admin@elkendeh.com', 'P0mra7ig8@25') if not User.objects.filter(username='admin').exists() else None" | python manage.py shell

print_status "Setting up Gunicorn systemd service..."
sudo tee /etc/systemd/system/ek-sms.service > /dev/null << EOF
[Unit]
Description=EK-SMS Django Application
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=$APP_DIR/eksms
Environment="PATH=$APP_DIR/venv/bin"
ExecStart=$APP_DIR/venv/bin/gunicorn --workers 3 --bind unix:$APP_DIR/ek-sms.sock eksms.wsgi:application
Restart=always

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl start ek-sms
sudo systemctl enable ek-sms

print_status "Configuring Nginx..."
sudo tee /etc/nginx/sites-available/ek-sms > /dev/null << EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN www.$DOMAIN;

    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;

    # Security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # CORS headers for API
    location /api/ {
        include proxy_params;
        proxy_pass http://unix:$APP_DIR/ek-sms.sock;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header Host \$host;

        # CORS headers
        add_header 'Access-Control-Allow-Origin' 'https://ek-sms-one.vercel.app' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, PATCH, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization,X-CSRFToken' always;
        add_header 'Access-Control-Allow-Credentials' 'true' always;

        if (\$request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' 'https://ek-sms-one.vercel.app';
            add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, PATCH, DELETE, OPTIONS';
            add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization,X-CSRFToken';
            add_header 'Access-Control-Allow-Credentials' 'true';
            add_header 'Access-Control-Max-Age' 1728000;
            add_header 'Content-Type' 'text/plain charset=UTF-8';
            add_header 'Content-Length' 0;
            return 204;
        }
    }

    location = /favicon.ico { access_log off; log_not_found off; }

    location /static/ {
        alias $APP_DIR/eksms/staticfiles/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location /media/ {
        alias $APP_DIR/eksms/media/;
        expires 30d;
        add_header Cache-Control "public";
    }

    location / {
        include proxy_params;
        proxy_pass http://unix:$APP_DIR/ek-sms.sock;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header Host \$host;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/ek-sms /etc/nginx/sites-enabled
sudo nginx -t
sudo systemctl restart nginx

print_status "Setting up SSL certificate..."
sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email admin@elkendeh.com

print_status "Setting up automated backups..."
sudo tee $APP_DIR/backup.sh > /dev/null << EOF
#!/bin/bash
DATE=\$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="$APP_DIR/backups"
DB_NAME="$DB_NAME"
DB_USER="$DB_USER"
DB_PASS="$DB_PASS"

mkdir -p \$BACKUP_DIR

mysqldump -u \$DB_USER -p\$DB_PASS \$DB_NAME > \$BACKUP_DIR/eksms_backup_\$DATE.sql

# Keep only last 7 backups
find \$BACKUP_DIR -name "eksms_backup_*.sql" -mtime +7 -delete

echo "Backup completed: eksms_backup_\$DATE.sql"
EOF

chmod +x $APP_DIR/backup.sh
(crontab -l ; echo "0 2 * * * $APP_DIR/backup.sh") | crontab -

print_status "Setting proper permissions..."
sudo chown -R www-data:www-data $APP_DIR
sudo chmod -R 755 $APP_DIR

print_status "Restarting all services..."
sudo systemctl restart ek-sms
sudo systemctl restart nginx

print_status "Testing deployment..."
sleep 5

# Test health endpoint
if curl -s -o /dev/null -w "%{http_code}" https://$DOMAIN/api/system/health/ | grep -q "200"; then
    print_status "✅ Health check passed!"
else
    print_warning "⚠️  Health check failed. Please check logs."
fi

# Test database connection
cd eksms
if python manage.py dbshell -c "SELECT 1;" &>/dev/null; then
    print_status "✅ Database connection successful!"
else
    print_error "❌ Database connection failed!"
fi

print_status ""
print_status "🎉 Deployment completed successfully!"
print_status ""
print_status "Next steps:"
print_status "1. Update your DNS to point $DOMAIN to this server"
print_status "2. Configure email settings in $APP_DIR/.env"
print_status "3. Deploy frontend to Vercel with REACT_APP_API_URL=https://$DOMAIN"
print_status "4. Test the application at https://$DOMAIN"
print_status ""
print_status "Useful commands:"
print_status "- Check Django logs: sudo journalctl -u ek-sms -f"
print_status "- Check Nginx logs: sudo tail -f /var/log/nginx/error.log"
print_status "- Restart app: sudo systemctl restart ek-sms"
print_status "- Restart web server: sudo systemctl restart nginx"