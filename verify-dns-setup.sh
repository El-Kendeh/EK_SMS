#!/bin/bash

# DNS Configuration Verification Script
# Run this to check if your IONOS + Vercel setup is correct

echo "🔍 DNS Configuration Verification for pruhsms.africa"
echo "=================================================="

DOMAIN="pruhsms.africa"
BACKEND_SUBDOMAIN="backend.pruhsms.africa"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

check_dns() {
    local domain=$1
    local expected_type=$2
    local expected_value=$3

    echo -e "${BLUE}Checking $domain...${NC}"

    # Get DNS records
    local records
    records=$(nslookup -type=$expected_type $domain 2>/dev/null)

    if echo "$records" | grep -q "$expected_value"; then
        echo -e "${GREEN}✅ $domain correctly points to $expected_value${NC}"
        return 0
    else
        echo -e "${RED}❌ $domain DNS issue${NC}"
        echo "Expected: $expected_value"
        echo "Found records:"
        echo "$records"
        return 1
    fi
}

check_http() {
    local url=$1
    local expected_code=${2:-200}

    echo -e "${BLUE}Checking $url...${NC}"

    local response
    response=$(curl -s -o /dev/null -w "%{http_code}" "$url")

    if [ "$response" = "$expected_code" ]; then
        echo -e "${GREEN}✅ $url responds with HTTP $response${NC}"
        return 0
    else
        echo -e "${RED}❌ $url returned HTTP $response (expected $expected_code)${NC}"
        return 1
    fi
}

echo ""
echo "1. Checking Nameservers..."
echo "Current nameservers for $DOMAIN:"
nslookup -type=NS $DOMAIN | grep "nameserver"

echo ""
echo "2. Checking Frontend DNS (should point to Vercel)..."
# This will vary based on setup - check manually
echo "Manual check needed: nslookup -type=CNAME $DOMAIN"
echo "Should contain: cname.vercel-dns.com (if using IONOS nameservers)"
echo "Or should use Vercel nameservers: ns1.vercel-dns.com, ns2.vercel-dns.com"

echo ""
echo "3. Checking Backend Subdomain DNS..."
echo "Current records for $BACKEND_SUBDOMAIN:"
nslookup $BACKEND_SUBDOMAIN

echo ""
echo "4. Testing HTTP Connectivity..."

# Test frontend (adjust expected response as needed)
check_http "https://$DOMAIN" 200

# Test backend (adjust expected response as needed)
check_http "https://$BACKEND_SUBDOMAIN" 200

echo ""
echo "5. SSL Certificate Check..."
echo "Frontend SSL:"
openssl s_client -connect $DOMAIN:443 -servername $DOMAIN < /dev/null 2>/dev/null | openssl x509 -noout -dates 2>/dev/null || echo "SSL check failed"

echo ""
echo "Backend SSL:"
openssl s_client -connect $BACKEND_SUBDOMAIN:443 -servername $BACKEND_SUBDOMAIN < /dev/null 2>/dev/null | openssl x509 -noout -dates 2>/dev/null || echo "SSL check failed"

echo ""
echo "=================================================="
echo "Verification complete!"
echo ""
echo "Next steps if issues found:"
echo "1. Wait 24-48 hours for DNS propagation"
echo "2. Check Vercel dashboard for domain status"
echo "3. Verify DNS records in IONOS or Vercel"
echo "4. Ensure backend server is running and accessible"
echo ""
echo "For help with specific issues, check IONOS_VERCEL_SETUP.md"