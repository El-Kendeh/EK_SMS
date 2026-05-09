#!/bin/bash

# Quick Backend Fix Script
# Run this on your Ubuntu server to fix common backend.pruhsms.africa issues

set -e

echo "🔧 Quick Backend Fix for backend.pruhsms.africa"
echo "==============================================="

DOMAIN="backend.pruhsms.africa"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

fix_firewall() {
    echo -e "${YELLOW}Fixing firewall...${NC}"
    sudo ufw --force enable
    sudo ufw allow 'Nginx Full'
    sudo ufw allow ssh
    echo -e "${GREEN}✅ Firewall configured${NC}"
}

fix_nginx() {
    echo -e "${YELLOW}Checking Nginx...${NC}"

    # Install nginx if not present
    if ! command -v nginx &> /dev/null; then
        echo "Installing Nginx..."
        sudo apt update
        sudo apt install -y nginx
    fi

    # Start nginx if not running
    if ! sudo systemctl is-active --quiet nginx; then
        sudo systemctl start nginx
        sudo systemctl enable nginx
        echo -e "${GREEN}✅ Nginx started${NC}"
    else
        echo -e "${GREEN}✅ Nginx already running${NC}"
    fi

    # Test configuration
    if sudo nginx -t; then
        sudo systemctl reload nginx
        echo -e "${GREEN}✅ Nginx configuration reloaded${NC}"
    else
        echo -e "${RED}❌ Nginx configuration error${NC}"
        exit 1
    fi
}

fix_ssl() {
    echo -e "${YELLOW}Checking SSL certificate...${NC}"

    if ! sudo certbot certificates 2>/dev/null | grep -q "$DOMAIN"; then
        echo "Getting SSL certificate..."
        sudo apt install -y certbot python3-certbot-nginx
        sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN
        echo -e "${GREEN}✅ SSL certificate obtained${NC}"
    else
        echo -e "${GREEN}✅ SSL certificate already exists${NC}"
    fi
}

check_dns() {
    echo -e "${YELLOW}Checking DNS resolution...${NC}"
    local resolved_ip
    resolved_ip=$(nslookup $DOMAIN 2>/dev/null | grep "Address:" | tail -1 | awk '{print $2}')

    if [ -n "$resolved_ip" ]; then
        echo -e "${GREEN}✅ DNS resolves to: $resolved_ip${NC}"

        local local_ip
        local_ip=$(hostname -I | awk '{print $1}')
        if [ "$resolved_ip" = "$local_ip" ]; then
            echo -e "${GREEN}✅ DNS points to this server${NC}"
        else
            echo -e "${RED}❌ DNS mismatch! DNS points to $resolved_ip but local IP is $local_ip${NC}"
            echo "Please check your DNS settings in IONOS or Vercel"
            exit 1
        fi
    else
        echo -e "${RED}❌ DNS resolution failed${NC}"
        echo "Please check your DNS settings"
        exit 1
    fi
}

test_connectivity() {
    echo -e "${YELLOW}Testing connectivity...${NC}"

    # Wait a moment for services to start
    sleep 2

    if curl -s --max-time 10 http://$DOMAIN > /dev/null; then
        echo -e "${GREEN}✅ HTTP access works${NC}"
    else
        echo -e "${RED}❌ HTTP access failed${NC}"
    fi

    if curl -s --max-time 10 https://$DOMAIN > /dev/null; then
        echo -e "${GREEN}✅ HTTPS access works${NC}"
    else
        echo -e "${YELLOW}⚠️  HTTPS access failed (may need SSL setup)${NC}"
    fi
}

# Run fixes
check_dns
fix_firewall
fix_nginx
fix_ssl
test_connectivity

echo ""
echo "==============================================="
echo -e "${GREEN}✅ Backend fixes applied!${NC}"
echo ""
echo "Test your backend:"
echo "curl -I http://$DOMAIN"
echo "curl -I https://$DOMAIN"
echo ""
echo "If still not working, check:"
echo "1. DNS propagation (may take 24-48 hours)"
echo "2. Your Django application is running"
echo "3. Nginx configuration is correct"
echo "4. Run the diagnostic script: ./diagnose-backend.sh"