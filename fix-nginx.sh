#!/bin/bash

echo "=============================================="
echo "Fixing Nginx Configuration for Django Socket"
echo "=============================================="
echo ""

# The correct socket path
SOCKET_PATH="/var/www/ek-sms/ek-sms.sock"

echo "1. Backing up current Nginx config..."
sudo cp /etc/nginx/sites-available/ek-sms /etc/nginx/sites-available/ek-sms.bak.$(date +%s)

echo "2. Updating proxy_pass to use correct socket..."
sudo sed -i "s|proxy_pass http://unix:[^;]*;|proxy_pass http://unix:${SOCKET_PATH};|g" /etc/nginx/sites-available/ek-sms

echo "3. Testing Nginx configuration..."
if sudo nginx -t; then
    echo "✓ Nginx config syntax is valid"
else
    echo "❌ Nginx config has syntax errors"
    exit 1
fi

echo "4. Reloading Nginx..."
sudo systemctl reload nginx

echo ""
echo "5. Verifying socket connectivity..."
if [ -S "$SOCKET_PATH" ]; then
    echo "✓ Socket file exists: $SOCKET_PATH"
    ls -la "$SOCKET_PATH"
else
    echo "❌ Socket file not found at: $SOCKET_PATH"
    exit 1
fi

echo ""
echo "6. Testing backend API..."
echo "Testing: curl -I https://backend.pruhsms.africa/api/system-health/"
curl -I https://backend.pruhsms.africa/api/system-health/ 2>/dev/null | head -5

echo ""
echo "✅ Nginx fixed and reloaded!"
