#!/bin/bash

# DNS Check Script for backend.pruhsms.africa
# Run this from any machine to check DNS configuration

echo "🌐 DNS Check for backend.pruhsms.africa"
echo "====================================="

DOMAIN="backend.pruhsms.africa"
MAIN_DOMAIN="pruhsms.africa"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

check_dns_resolution() {
    local domain=$1
    echo -e "${BLUE}Checking DNS for $domain...${NC}"

    # Check A records
    local a_records
    a_records=$(nslookup -type=A $domain 2>/dev/null | grep "Address:" | grep -v "#")

    if [ -n "$a_records" ]; then
        echo -e "${GREEN}✅ A records found:${NC}"
        echo "$a_records"
    else
        echo -e "${YELLOW}⚠️  No A records found${NC}"
    fi

    # Check CNAME records
    local cname_records
    cname_records=$(nslookup -type=CNAME $domain 2>/dev/null | grep "canonical name")

    if [ -n "$cname_records" ]; then
        echo -e "${GREEN}✅ CNAME records found:${NC}"
        echo "$cname_records"
    fi

    # Check nameservers
    echo -e "${BLUE}Nameservers for $domain:${NC}"
    nslookup -type=NS $domain 2>/dev/null | grep "nameserver" | sed 's/nameserver = //'
}

check_http_connectivity() {
    local domain=$1
    local protocol=$2
    local url="$protocol://$domain"

    echo -e "${BLUE}Testing $url...${NC}"

    local response
    response=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$url" 2>/dev/null)

    if [ "$response" = "200" ] || [ "$response" = "301" ] || [ "$response" = "302" ]; then
        echo -e "${GREEN}✅ $url responds with HTTP $response${NC}"
    elif [ "$response" = "000" ]; then
        echo -e "${RED}❌ $url connection failed (timeout)${NC}"
    else
        echo -e "${YELLOW}⚠️  $url returned HTTP $response${NC}"
    fi
}

check_whois() {
    echo -e "${BLUE}Domain registration check...${NC}"

    if command -v whois &> /dev/null; then
        local registrar
        registrar=$(whois $MAIN_DOMAIN 2>/dev/null | grep -i "registrar:" | head -1 | sed 's/.*: //' | tr '[:upper:]' '[:lower:]')

        if echo "$registrar" | grep -q "ionos"; then
            echo -e "${GREEN}✅ Domain registered with IONOS${NC}"
        else
            echo -e "${YELLOW}⚠️  Domain registrar: $registrar${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  whois command not available${NC}"
    fi
}

# Run checks
check_whois
echo ""

check_dns_resolution $MAIN_DOMAIN
echo ""

check_dns_resolution $DOMAIN
echo ""

echo -e "${BLUE}Connectivity Tests:${NC}"
check_http_connectivity $DOMAIN "http"
check_http_connectivity $DOMAIN "https"
echo ""

echo "====================================="
echo "DNS Check Complete!"
echo ""
echo "Expected configuration:"
echo "1. Nameservers should be: ns1.vercel-dns.com, ns2.vercel-dns.com"
echo "2. A record for backend should point to your Ubuntu server IP"
echo "3. HTTP/HTTPS should respond (not timeout)"
echo ""
echo "If DNS is wrong:"
echo "- Check Vercel dashboard DNS settings"
echo "- Or check IONOS DNS settings if keeping IONOS nameservers"
echo ""
echo "If connectivity fails:"
echo "- Run diagnostic script on server: ./diagnose-backend.sh"
echo "- Run fix script on server: ./fix-backend.sh"