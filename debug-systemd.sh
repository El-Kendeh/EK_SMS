#!/bin/bash

################################################################################
# EK-SMS SYSTEMD SERVICE DEBUG & FIX
################################################################################

echo "=============================================="
echo "Debugging Django Service Startup Issues"
echo "=============================================="
echo ""

# Check actual directory structure
echo "1. Checking directory structure..."
ls -la /var/www/ek-sms/

echo ""
echo "2. Finding Django project directory..."
if [ -d "/var/www/ek-sms/EK_SMS/eksms" ]; then
    DJANGO_DIR="/var/www/ek-sms/EK_SMS/eksms"
    echo "✓ Found Django at: $DJANGO_DIR"
elif [ -d "/var/www/ek-sms/eksms" ]; then
    DJANGO_DIR="/var/www/ek-sms/eksms"
    echo "✓ Found Django at: $DJANGO_DIR"
else
    echo "❌ Django directory not found"
    find /var/www -name "manage.py" -type f 2>/dev/null
    exit 1
fi

echo ""
echo "3. Finding virtual environment..."
if [ -d "/var/www/ek-sms/venv" ]; then
    VENV_DIR="/var/www/ek-sms/venv"
    echo "✓ Found venv at: $VENV_DIR"
elif [ -d "/var/www/ek-sms/.venv" ]; then
    VENV_DIR="/var/www/ek-sms/.venv"
    echo "✓ Found venv at: $VENV_DIR"
else
    echo "❌ Virtual environment not found"
    find /var/www -name "bin" -type d | grep -E "(venv|\.venv)" | head -5
    exit 1
fi

echo ""
if [ "$EUID" -ne 0 ]; then
    echo "❌ This script must be run as root to fix systemd permissions."
    exit 1
fi

echo "4. Fixing /var/www/ek-sms directory ownership and permissions..."
mkdir -p /var/www/ek-sms
chown root:www-data /var/www/ek-sms
chmod 775 /var/www/ek-sms
ls -ld /var/www/ek-sms

echo ""
echo "4. Checking gunicorn executable..."
GUNICORN_PATH="$VENV_DIR/bin/gunicorn"
PYTHON_PATH="$VENV_DIR/bin/python"
if [ -x "$GUNICORN_PATH" ]; then
    echo "✓ Gunicorn found at: $GUNICORN_PATH"
    $GUNICORN_PATH --version
    echo ""
    echo "5. Validating MySQL Python driver imports..."
    "$PYTHON_PATH" -c "import importlib; importlib.invalidate_caches(); import pymysql; print('PyMySQL OK', pymysql.__version__); pymysql.install_as_MySQLdb(); import MySQLdb; print('MySQLdb shim OK')" 2>/tmp/db-check.err && echo "✓ MySQL driver imports OK" || { echo "❌ MySQL driver import failed"; cat /tmp/db-check.err; }
else
    echo "❌ Gunicorn not found at: $GUNICORN_PATH"
    find $VENV_DIR -name "gunicorn" -type f 2>/dev/null
    exit 1
fi

echo ""
echo "5. Checking Django wsgi module..."
WSGI_FILE="$DJANGO_DIR/eksms/wsgi.py"
if [ -f "$WSGI_FILE" ]; then
    echo "✓ WSGI file found at: $WSGI_FILE"
else
    echo "❌ WSGI file not found at: $WSGI_FILE"
    find $DJANGO_DIR -name "wsgi.py" -type f
    exit 1
fi

echo ""
echo "6. Testing manual gunicorn start..."
echo "Testing: cd $DJANGO_DIR && source $VENV_DIR/bin/activate && gunicorn --bind 127.0.0.1:8000 eksms.wsgi:application"

cd $DJANGO_DIR
source $VENV_DIR/bin/activate

# Test gunicorn directly
timeout 10s $GUNICORN_PATH --bind 127.0.0.1:8000 eksms.wsgi:application &
GUNICORN_PID=$!
sleep 3

if kill -0 $GUNICORN_PID 2>/dev/null; then
    echo "✓ Gunicorn started successfully manually"
    kill $GUNICORN_PID
else
    echo "❌ Gunicorn failed to start manually"
    wait $GUNICORN_PID 2>/dev/null || true
fi

echo ""
echo "7. Checking current systemd service..."
sudo systemctl status ek-sms --no-pager -l || echo "Service status check failed"

echo ""
echo "8. Recreating systemd service with correct paths..."
sudo tee /etc/systemd/system/ek-sms.service > /dev/null << EOF
[Unit]
Description=EK-SMS Django Application
After=network.target

[Service]
User=www-data
Group=www-data
PermissionsStartOnly=true
WorkingDirectory=$DJANGO_DIR
Environment="PATH=$VENV_DIR/bin"
ExecStartPre=/bin/rm -f /var/www/ek-sms/ek-sms.sock
ExecStart=$VENV_DIR/bin/gunicorn --workers 3 --bind unix:/var/www/ek-sms/ek-sms.sock --umask 007 eksms.wsgi:application
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

echo "✓ Updated systemd service file"

echo ""
echo "9. Reloading systemd and restarting..."
sudo systemctl daemon-reload
sudo systemctl reset-failed ek-sms
sudo systemctl start ek-sms

sleep 5

echo ""
echo "10. Final service status..."
if sudo systemctl is-active --quiet ek-sms; then
    echo "✅ SUCCESS: Django service is now running!"
    sudo systemctl status ek-sms --no-pager | grep -E "(Active|Main PID)"
else
    echo "❌ FAILED: Django service still not running"
    sudo systemctl status ek-sms --no-pager -l
    echo ""
    echo "Debugging tips:"
    echo "- Check journal: sudo journalctl -u ek-sms -n 20"
    echo "- Test manually: cd $DJANGO_DIR && source $VENV_DIR/bin/activate && $GUNICORN_PATH --bind 127.0.0.1:8000 eksms.wsgi:application"
fi

echo ""
echo "11. Testing socket file..."
if [ -S "/var/www/ek-sms/ek-sms.sock" ]; then
    echo "✓ Socket file exists"
    ls -la /var/www/ek-sms/ek-sms.sock
else
    echo "❌ Socket file missing"
fi
