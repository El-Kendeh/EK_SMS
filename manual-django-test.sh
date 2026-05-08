#!/bin/bash

# Manual Django test if systemd fails
echo "Manual Django Application Test"
echo "=============================="

# Detect paths
if [ -d "/var/www/ek-sms/EK_SMS/eksms" ]; then
    DJANGO_DIR="/var/www/ek-sms/EK_SMS/eksms"
elif [ -d "/var/www/ek-sms/eksms" ]; then
    DJANGO_DIR="/var/www/ek-sms/eksms"
else
    echo "❌ Django directory not found"
    exit 1
fi

if [ -d "/var/www/ek-sms/venv" ]; then
    VENV_DIR="/var/www/ek-sms/venv"
else
    echo "❌ Virtual environment not found"
    exit 1
fi

echo "Django dir: $DJANGO_DIR"
echo "Venv dir: $VENV_DIR"

# Activate venv and test
cd $DJANGO_DIR
source $VENV_DIR/bin/activate

echo ""
echo "Testing Django..."
python manage.py check

echo ""
echo "Testing database..."
python manage.py dbshell -c "SELECT COUNT(*) FROM eksms_core_school;"

echo ""
echo "Starting Django manually on port 8000..."
python manage.py runserver 127.0.0.1:8000 &
DJANGO_PID=$!

sleep 5

echo ""
echo "Testing local API..."
curl -s http://127.0.0.1:8000/api/system-health/ | head -3

echo ""
echo "Testing external access (should work if Nginx is proxying)..."
curl -s https://backend.pruhsms.africa/api/system-health/ | head -3

echo ""
echo "Django PID: $DJANGO_PID"
echo "Press Ctrl+C to stop the manual server"

# Wait for user to stop
wait $DJANGO_PID