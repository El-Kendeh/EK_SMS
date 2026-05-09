#!/bin/bash

# Backend Server Diagnostic Script
# Run this on your Ubuntu server to diagnose backend.pruhsms.africa issues

echo "🔍 Backend Server Diagnostic for backend.pruhsms.africa"
echo "===================================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

DOMAIN="backend.pruhsms.africa"
EXPECTED_IP=""  # Will be detected

check_service() {
    local service=$1
    if sudo systemctl is-active --quiet $service 2>/dev/null; then
        echo -e "${GREEN}✅ $service is running${NC}"
        return 0
    else
        echo -e "${RED}❌ $service is not running${NC}"
        return 1
    fi
}

check_port() {
    local port=$1
    local service=$2
    if sudo netstat -tlnp | grep -q ":$port "; then
        echo -e "${GREEN}✅ Port $port ($service) is listening${NC}"
        return 0
    else
        echo -e "${RED}❌ Port $port ($service) is not listening${NC}"
        return 1
    fi
}

check_dns() {
    echo -e "${BLUE}Checking DNS resolution...${NC}"
    local resolved_ip
    resolved_ip=$(nslookup $DOMAIN 2>/dev/null | grep "Address:" | tail -1 | awk '{print $2}')

    if [ -n "$resolved_ip" ]; then
        echo -e "${GREEN}✅ DNS resolves to: $resolved_ip${NC}"
        EXPECTED_IP=$resolved_ip

        # Check if this matches our local IP
        local local_ip
        local_ip=$(hostname -I | awk '{print $1}')
        if [ "$resolved_ip" = "$local_ip" ]; then
            echo -e "${GREEN}✅ DNS points to this server${NC}"
        else
            echo -e "${YELLOW}⚠️  DNS points to different IP: $local_ip (local) vs $resolved_ip (DNS)${NC}"
        fi
    else
        echo -e "${RED}❌ DNS resolution failed${NC}"
    fi
}

check_connectivity() {
    echo -e "${BLUE}Checking external connectivity...${NC}"

    # Test local connectivity
    if curl -s --max-time 5 http://localhost > /dev/null; then
        echo -e "${GREEN}✅ Local HTTP (port 80) works${NC}"
    else
        echo -e "${RED}❌ Local HTTP (port 80) failed${NC}"
    fi

    if curl -s --max-time 5 https://localhost > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Local HTTPS (port 443) works${NC}"
    else
        echo -e "${YELLOW}⚠️  Local HTTPS (port 443) failed (may be expected if no SSL)${NC}"
    fi

    # Test external connectivity (if domain resolves)
    if [ -n "$EXPECTED_IP" ]; then
        if curl -s --max-time 10 http://$DOMAIN > /dev/null; then
            echo -e "${GREEN}✅ External HTTP access works${NC}"
        else
            echo -e "${RED}❌ External HTTP access failed${NC}"
        fi
    fi
}

check_firewall() {
    echo -e "${BLUE}Checking firewall status...${NC}"

    if sudo ufw status | grep -q "active"; then
        echo -e "${GREEN}✅ UFW firewall is active${NC}"

        if sudo ufw status | grep -q "80.*ALLOW\|80/tcp.*ALLOW"; then
            echo -e "${GREEN}✅ Port 80 (HTTP) is allowed${NC}"
        else
            echo -e "${RED}❌ Port 80 (HTTP) is blocked${NC}"
        fi

        if sudo ufw status | grep -q "443.*ALLOW\|443/tcp.*ALLOW"; then
            echo -e "${GREEN}✅ Port 443 (HTTPS) is allowed${NC}"
        else
            echo -e "${YELLOW}⚠️  Port 443 (HTTPS) may be blocked${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  UFW firewall is inactive${NC}"
    fi
}

check_nginx_config() {
    echo -e "${BLUE}Checking Nginx configuration...${NC}"

    if [ -f "/etc/nginx/sites-enabled/$DOMAIN" ]; then
        echo -e "${GREEN}✅ Nginx site config exists for $DOMAIN${NC}"

        # Test nginx config
        if sudo nginx -t 2>/dev/null; then
            echo -e "${GREEN}✅ Nginx configuration is valid${NC}"
        else
            echo -e "${RED}❌ Nginx configuration has errors${NC}"
        fi
    else
        echo -e "${RED}❌ Nginx site config missing for $DOMAIN${NC}"
        echo "Available sites:"
        ls -la /etc/nginx/sites-enabled/
    fi
}

check_ssl() {
    echo -e "${BLUE}Checking SSL certificate...${NC}"

    if sudo certbot certificates 2>/dev/null | grep -q "$DOMAIN"; then
        echo -e "${GREEN}✅ SSL certificate found for $DOMAIN${NC}"

        # Check expiry
        local expiry
        expiry=$(sudo certbot certificates 2>/dev/null | grep -A 5 "$DOMAIN" | grep "Expiry Date" | cut -d: -f2-)
        if [ -n "$expiry" ]; then
            echo "Certificate expires: $expiry"
        fi
    else
        echo -e "${YELLOW}⚠️  No SSL certificate found for $DOMAIN${NC}"
        echo "Run: sudo certbot --nginx -d $DOMAIN"
    fi
}

show_server_info() {
    echo -e "${BLUE}Server Information:${NC}"
    echo "Local IP: $(hostname -I | awk '{print $1}')"
    echo "Public IP: $(curl -s ifconfig.me 2>/dev/null || echo 'Unable to detect')"
    echo "Ubuntu Version: $(lsb_release -d 2>/dev/null | cut -f2 || uname -a)"
    echo "Nginx Version: $(nginx -v 2>&1 | cut -d'/' -f2 || echo 'Not installed')"
    echo "Python Version: $(python3 --version 2>/dev/null || echo 'Not installed')"
}

# Run all checks
echo ""
show_server_info
echo ""

check_dns
echo ""

check_service nginx
check_service gunicorn 2>/dev/null || echo -e "${YELLOW}⚠️  Gunicorn service not found (may be running differently)${NC}"
echo ""

check_port 80 "HTTP"
check_port 443 "HTTPS"
echo ""

check_firewall
echo ""

check_nginx_config
echo ""

check_ssl
echo ""

check_connectivity
echo ""

echo "===================================================="
echo "Diagnostic complete!"
echo ""
echo "Common fixes:"
echo "1. If DNS issues: Check Vercel DNS records or IONOS DNS settings"
echo "2. If firewall: sudo ufw allow 'Nginx Full'"
echo "3. If nginx down: sudo systemctl start nginx"
echo "4. If config error: sudo nginx -t && sudo systemctl reload nginx"
echo "5. If SSL missing: sudo certbot --nginx -d $DOMAIN"
echo ""
echo "Test from external location:"
echo "curl -I http://$DOMAIN"
echo "curl -I https://$DOMAIN"