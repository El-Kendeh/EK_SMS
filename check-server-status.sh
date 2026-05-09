#!/bin/bash

# Server Status Check Script
# Run this to check if your backend server is accessible

echo "🔍 Backend Server Status Check"
echo "=============================="

SERVER_IP="87.106.65.209"
DOMAIN="backend.pruhsms.africa"

echo "Server IP: $SERVER_IP"
echo "Domain: $DOMAIN"
echo ""

# Check DNS resolution
echo "1. DNS Resolution:"
nslookup $DOMAIN 2>/dev/null | grep "Address:" | tail -1
echo ""

# Check ping (may be blocked by firewall)
echo "2. Ping Test:"
ping -c 3 -W 2 $SERVER_IP >/dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Server responds to ping"
else
    echo "❌ Server does not respond to ping (may be firewall)"
fi
echo ""

# Check HTTP
echo "3. HTTP Connectivity:"
curl -s --max-time 5 --connect-timeout 5 http://$SERVER_IP >/dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ HTTP port 80 is open"
else
    echo "❌ HTTP port 80 is not accessible"
fi

curl -s --max-time 5 --connect-timeout 5 https://$SERVER_IP >/dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ HTTPS port 443 is open"
else
    echo "❌ HTTPS port 443 is not accessible"
fi
echo ""

# Check SSH
echo "4. SSH Access:"
timeout 5 bash -c "</dev/tcp/$SERVER_IP/22" >/dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ SSH port 22 is open"
else
    echo "❌ SSH port 22 is not accessible"
fi
echo ""

echo "=============================="
echo "Diagnosis:"
echo ""

if ping -c 1 -W 2 $SERVER_IP >/dev/null 2>&1; then
    echo "✅ Server is online and responding to network requests"
    echo "   → Try SSH access or check web services"
else
    echo "❌ Server is not responding to any network requests"
    echo "   → Server may be down, check IONOS control panel"
fi

echo ""
echo "Next steps:"
echo "1. Check IONOS control panel for server status"
echo "2. If server is running, try SSH: ssh user@$SERVER_IP"
echo "3. If SSH works, run: ./diagnose-backend.sh"
echo "4. If server is down, contact IONOS support"
echo "5. Consider provisioning a new server if needed"