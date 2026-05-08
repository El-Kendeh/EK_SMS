#!/bin/bash

# Quick verification script after recovery
echo "=========================================="
echo "EK-SMS Backend Verification"
echo "=========================================="

BACKEND_URL="https://backend.pruhsms.africa"

echo "1. Testing basic connectivity..."
curl -s -o /dev/null -w "Status: %{http_code}\n" $BACKEND_URL/

echo ""
echo "2. Testing API endpoints..."
endpoints=(
    "api/system-health/"
    "api/school/info/"
    "api/school/classes/"
    "api/school/students/"
    "api/test-connection/"
)

for endpoint in "${endpoints[@]}"; do
    echo "Testing $endpoint..."
    status=$(curl -s -o /dev/null -w "%{http_code}" $BACKEND_URL/$endpoint)
    if [ "$status" = "200" ] || [ "$status" = "403" ] || [ "$status" = "401" ]; then
        echo "  ✓ Status: $status (expected for auth-required endpoints)"
    else
        echo "  ❌ Status: $status"
    fi
done

echo ""
echo "3. Testing CORS headers..."
response=$(curl -s -I $BACKEND_URL/api/system-health/)
if echo "$response" | grep -q "Access-Control-Allow-Origin"; then
    echo "✓ CORS headers present"
else
    echo "❌ CORS headers missing"
fi

echo ""
echo "4. Testing with Origin header..."
response=$(curl -s -H "Origin: https://ek-sms-one.vercel.app" -I $BACKEND_URL/api/system-health/)
if echo "$response" | grep -q "Access-Control-Allow-Origin"; then
    echo "✓ CORS working with frontend origin"
else
    echo "❌ CORS not working with frontend origin"
fi

echo ""
echo "=========================================="
echo "If all tests show ✓ or expected auth codes,"
echo "the backend should work with the frontend!"
echo "=========================================="