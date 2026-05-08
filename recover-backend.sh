#!/bin/bash

################################################################################
# EK-SMS BACKEND SERVER RECOVERY SCRIPT
# Fixes missing systemd service and path issues
################################################################################

set -e

echo "=============================================="
echo "EK-SMS Backend Server Recovery"
echo "=============================================="
echo ""

# Detect correct paths
echo "Detecting application paths..."
if [ -d "/var/www/ek-sms/EK_SMS" ]; then
    APP_DIR="/var/www/ek-sms"
    DJANGO_DIR="$APP_DIR/EK_SMS/eksms"
    echo "✓ Found application at: $DJANGO_DIR"
elif [ -d "/var/www/ek-sms/eksms" ]; then
    APP_DIR="/var/www/ek-sms"
    DJANGO_DIR="$APP_DIR/eksms"
    echo "✓ Found application at: $DJANGO_DIR"
else
    echo "❌ Cannot find Django application directory"
    echo "Looking for /var/www/ek-sms/EK_SMS/eksms or /var/www/ek-sms/eksms"
    ls -la /var/www/ek-sms/ 2>/dev/null || echo "Directory doesn't exist"
    exit 1
fi

VENV_DIR="$APP_DIR/venv"
DOMAIN="backend.pruhsms.africa"

echo "Application directory: $APP_DIR"
echo "Django directory: $DJANGO_DIR"
echo "Virtual environment: $VENV_DIR"
echo ""

# Create systemd service file
echo "Creating systemd service for Django application..."
sudo tee /etc/systemd/system/ek-sms.service > /dev/null << EOF
[Unit]
Description=EK-SMS Django Application
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=$DJANGO_DIR
Environment="PATH=$VENV_DIR/bin"
ExecStart=$VENV_DIR/bin/gunicorn --workers 3 --bind unix:$APP_DIR/ek-sms.sock eksms.wsgi:application
Restart=always

[Install]
WantedBy=multi-user.target
EOF

echo "✓ Created systemd service file"

# Reload systemd and start service
echo "Reloading systemd and starting Django service..."
sudo systemctl daemon-reload
sudo systemctl enable ek-sms
sudo systemctl start ek-sms

# Wait for service to start
sleep 5

# Check service status
echo "Checking service status..."
if sudo systemctl is-active --quiet ek-sms; then
    echo "✓ Django service is running"
else
    echo "❌ Django service failed to start"
    sudo systemctl status ek-sms --no-pager -l
    exit 1
fi

# Check socket file
echo "Checking Gunicorn socket..."
if [ -S "$APP_DIR/ek-sms.sock" ]; then
    echo "✓ Gunicorn socket exists"
    ls -la $APP_DIR/ek-sms.sock
else
    echo "❌ Gunicorn socket missing"
    exit 1
fi

# Test local Django connection
echo "Testing local Django connection..."
cd $DJANGO_DIR
source $VENV_DIR/bin/activate

# Test Django check
echo "Running Django system checks..."
python manage.py check --deploy || echo "⚠️ Django check warnings (may be OK)"

# Test database connection
echo "Testing database connection..."
python manage.py dbshell -c "SELECT 1;" > /dev/null && echo "✓ Database connection OK" || echo "❌ Database connection failed"

# Test local endpoint
echo "Testing local API endpoint..."
curl -s http://127.0.0.1/api/system-health/ | grep -q "success" && echo "✓ Local API works" || echo "❌ Local API failed"

# Update Nginx configuration if needed
echo "Checking Nginx configuration..."
NGINX_CONF="/etc/nginx/sites-available/ek-sms"
if [ -f "$NGINX_CONF" ]; then
    echo "Updating Nginx configuration paths..."
    sudo sed -i "s|/var/www/ek-sms/|$APP_DIR/|g" $NGINX_CONF
    sudo sed -i "s|EK_SMS/eksms|eksms|g" $NGINX_CONF 2>/dev/null || true

    # Test Nginx config
    sudo nginx -t && echo "✓ Nginx configuration is valid" || echo "❌ Nginx configuration invalid"

    # Reload Nginx
    sudo systemctl reload nginx && echo "✓ Nginx reloaded" || echo "❌ Nginx reload failed"
else
    echo "❌ Nginx configuration file not found at $NGINX_CONF"
fi

# Create logs directory if missing
echo "Ensuring logs directory exists..."
mkdir -p $DJANGO_DIR/logs
sudo chown www-data:www-data $DJANGO_DIR/logs

# Create media directory for uploads
echo "Ensuring media directory exists..."
mkdir -p $DJANGO_DIR/media
sudo chown www-data:www-data $DJANGO_DIR/media

echo ""
echo "=========================================="
echo "TESTING EXTERNAL ACCESS"
echo "=========================================="

# Test external access
echo "Testing external access..."
sleep 3
curl -s -I https://$DOMAIN/api/system-health/ | head -1 || echo "❌ External access failed"

echo ""
echo "=========================================="
echo "RECOVERY COMPLETE"
echo "=========================================="

echo ""
echo "Service Status:"
sudo systemctl status ek-sms --no-pager | grep -E "(Active|Loaded)"
sudo systemctl status nginx --no-pager | grep -E "(Active|Loaded)"

echo ""
echo "Next steps:"
echo "1. Test the frontend - school admin should now work"
echo "2. Check logs if issues persist:"
echo "   sudo tail -f /var/log/nginx/error.log"
echo "   sudo journalctl -u ek-sms -f"
echo "3. If still failing, check DNS points to this server"

echo ""
echo "Quick restart commands:"
echo "sudo systemctl restart ek-sms"
echo "sudo systemctl restart nginx"