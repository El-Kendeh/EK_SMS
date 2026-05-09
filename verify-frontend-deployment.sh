#!/bin/bash

# Ubuntu Frontend Deployment Verification Script
# Run this after deployment to verify everything is working

echo "🔍 Verifying EK-SMS Frontend Deployment..."
echo "=========================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

DOMAIN="pruhsms.africa"
APP_DIR="/var/www/ek-sms-frontend"
BUILD_DIR="$APP_DIR/build"

check_service() {
    local service=$1
    if sudo systemctl is-active --quiet $service; then
        echo -e "${GREEN}✅ $service is running${NC}"
        return 0
    else
        echo -e "${RED}❌ $service is not running${NC}"
        return 1
    fi
}

check_file() {
    local file=$1
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅ $file exists${NC}"
        return 0
    else
        echo -e "${RED}❌ $file not found${NC}"
        return 1
    fi
}

check_directory() {
    local dir=$1
    if [ -d "$dir" ]; then
        echo -e "${GREEN}✅ $dir exists${NC}"
        return 0
    else
        echo -e "${RED}❌ $dir not found${NC}"
        return 1
    fi
}

echo "Checking services..."
check_service nginx

echo ""
echo "Checking directories..."
check_directory $APP_DIR
check_directory $BUILD_DIR

echo ""
echo "Checking key files..."
check_file "$BUILD_DIR/index.html"
check_file "$BUILD_DIR/static/js/main.js"
check_file "$BUILD_DIR/static/css/main.css"
check_file "/etc/nginx/sites-enabled/$DOMAIN"

echo ""
echo "Checking network connectivity..."
if curl -s --head --fail "http://localhost" > /dev/null; then
    echo -e "${GREEN}✅ Local Nginx responding${NC}"
else
    echo -e "${RED}❌ Local Nginx not responding${NC}"
fi

# Check if domain is accessible (if DNS is configured)
if curl -s --head --fail "http://$DOMAIN" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Domain $DOMAIN is accessible${NC}"
else
    echo -e "${YELLOW}⚠️  Domain $DOMAIN not accessible (DNS not configured or SSL redirect)${NC}"
fi

echo ""
echo "Checking firewall..."
if sudo ufw status | grep -q "Nginx Full"; then
    echo -e "${GREEN}✅ Firewall allows Nginx${NC}"
else
    echo -e "${RED}❌ Firewall may be blocking Nginx${NC}"
fi

echo ""
echo "Checking SSL certificate..."
if sudo certbot certificates 2>/dev/null | grep -q "$DOMAIN"; then
    echo -e "${GREEN}✅ SSL certificate found for $DOMAIN${NC}"
else
    echo -e "${YELLOW}⚠️  No SSL certificate found (run: sudo certbot --nginx -d $DOMAIN)${NC}"
fi

echo ""
echo "Checking file permissions..."
if [ -r "$BUILD_DIR/index.html" ] && [ -x "$BUILD_DIR" ]; then
    echo -e "${GREEN}✅ File permissions correct${NC}"
else
    echo -e "${RED}❌ File permission issues${NC}"
fi

echo ""
echo "Checking disk usage..."
df -h $APP_DIR | tail -1

echo ""
echo "=========================================="
echo "Verification complete!"
echo ""
echo "If all checks are green, your frontend should be working."
echo "Visit: http://$DOMAIN"
echo ""
echo "For HTTPS: sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN"
echo ""
echo "To check logs:"
echo "  sudo tail -f /var/log/nginx/error.log"
echo "  sudo tail -f /var/log/nginx/access.log"