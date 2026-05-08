#!/bin/bash

################################################################################
# EK-SMS BACKEND SERVER FIX SCRIPT
# Run this on your Ubuntu server to fix the unreachable backend
################################################################################

set -e

echo "=============================================="
echo "EK-SMS Backend Server Fix"
echo "=============================================="
echo ""

# Configuration - UPDATE THESE PATHS
APP_DIR="/var/www/ek-sms"
DOMAIN="backend.pruhsms.africa"

echo "Checking server status..."
echo "========================"

# Check if services are running
echo "1. Checking systemd services..."
sudo systemctl status nginx --no-pager -l || echo "❌ Nginx not running"
sudo systemctl status ek-sms --no-pager -l || echo "❌ Django app not running"
sudo systemctl status mysql --no-pager -l || echo "❌ MySQL not running"

echo ""
echo "2. Checking application directory..."
if [ -d "$APP_DIR" ]; then
    echo "✓ Application directory exists: $APP_DIR"
    ls -la $APP_DIR
else
    echo "❌ Application directory missing: $APP_DIR"
fi

echo ""
echo "3. Checking Django application..."
if [ -d "$APP_DIR/eksms" ]; then
    echo "✓ Django project exists"
    cd $APP_DIR/eksms

    # Check if virtual environment exists
    if [ -d "../venv" ]; then
        echo "✓ Virtual environment exists"
        source ../venv/bin/activate

        # Test Django
        echo "Testing Django..."
        python manage.py check --deploy || echo "❌ Django check failed"

        # Test database connection
        echo "Testing database connection..."
        python manage.py dbshell -c "SELECT 1;" || echo "❌ Database connection failed"

    else
        echo "❌ Virtual environment missing"
    fi
else
    echo "❌ Django project missing"
fi

echo ""
echo "4. Checking Nginx configuration..."
if [ -f "/etc/nginx/sites-enabled/ek-sms" ]; then
    echo "✓ Nginx site configuration exists"
    sudo nginx -t || echo "❌ Nginx configuration invalid"
else
    echo "❌ Nginx site configuration missing"
fi

echo ""
echo "5. Checking SSL certificates..."
if [ -d "/etc/letsencrypt/live/$DOMAIN" ]; then
    echo "✓ SSL certificates exist"
else
    echo "❌ SSL certificates missing"
fi

echo ""
echo "=========================================="
echo "ATTEMPTING FIXES"
echo "=========================================="

# Fix 1: Restart services
echo ""
echo "Fix 1: Restarting services..."
sudo systemctl restart ek-sms || echo "❌ Failed to restart Django app"
sudo systemctl restart nginx || echo "❌ Failed to restart Nginx"

# Wait a moment
sleep 3

# Check if services are now running
echo ""
echo "Checking service status after restart..."
sudo systemctl is-active ek-sms && echo "✓ Django app is running" || echo "❌ Django app still not running"
sudo systemctl is-active nginx && echo "✓ Nginx is running" || echo "❌ Nginx still not running"

# Fix 2: Check socket file
echo ""
echo "Fix 2: Checking Gunicorn socket..."
if [ -S "$APP_DIR/ek-sms.sock" ]; then
    echo "✓ Gunicorn socket exists"
    ls -la $APP_DIR/ek-sms.sock
else
    echo "❌ Gunicorn socket missing"
fi

# Fix 3: Test local connection
echo ""
echo "Fix 3: Testing local Django connection..."
if [ -d "$APP_DIR/eksms" ]; then
    cd $APP_DIR/eksms
    source ../venv/bin/activate
    python manage.py runserver 127.0.0.1:8000 &
    SERVER_PID=$!
    sleep 5

    # Test local endpoint
    curl -s http://127.0.0.1:8000/api/system-health/ && echo "✓ Local Django server works" || echo "❌ Local Django server failed"

    # Kill test server
    kill $SERVER_PID 2>/dev/null || true
fi

# Fix 4: Check firewall
echo ""
echo "Fix 4: Checking firewall..."
sudo ufw status || echo "❌ UFW not available"

# Fix 5: Check DNS
echo ""
echo "Fix 5: Checking DNS resolution..."
nslookup $DOMAIN || echo "❌ DNS resolution failed"

echo ""
echo "=========================================="
echo "TESTING EXTERNAL ACCESS"
echo "=========================================="

# Test external access
echo ""
echo "Testing external access to $DOMAIN..."
curl -I https://$DOMAIN/api/system-health/ || echo "❌ External access failed"

echo ""
echo "=========================================="
echo "SUMMARY & NEXT STEPS"
echo "=========================================="

echo ""
echo "If the server is still not responding:"
echo "1. Check your server IP and DNS configuration"
echo "2. Verify SSL certificates are valid"
echo "3. Check server firewall settings"
echo "4. Review Nginx error logs: sudo tail -f /var/log/nginx/error.log"
echo "5. Review Django logs in $APP_DIR/eksms/logs/"
echo "6. Ensure the domain $DOMAIN points to your server IP"

echo ""
echo "Quick restart commands:"
echo "sudo systemctl restart ek-sms"
echo "sudo systemctl restart nginx"
echo "sudo systemctl status ek-sms"
echo "sudo systemctl status nginx"