#!/bin/bash

# Quick test script to verify backend is working
# Run this AFTER fixing the server

BACKEND_URL="https://backend.pruhsms.africa"
FRONTEND_URL="https://ek-sms-one.vercel.app"

echo "Testing Backend Connectivity"
echo "============================"

echo "1. Testing basic connectivity..."
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" $BACKEND_URL/ || echo "❌ Basic connectivity failed"

echo ""
echo "2. Testing system health endpoint..."
curl -s $BACKEND_URL/api/system-health/ | head -5 || echo "❌ System health failed"

echo ""
echo "3. Testing CORS preflight..."
curl -s -X OPTIONS \
  -H "Origin: $FRONTEND_URL" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Authorization" \
  -o /dev/null -w "CORS Status: %{http_code}\n" \
  $BACKEND_URL/api/system-health/ || echo "❌ CORS preflight failed"

echo ""
echo "4. Testing school admin endpoints..."
endpoints=(
  "api/school/info/"
  "api/school/classes/"
  "api/school/students/"
  "api/test-connection/"
)

for endpoint in "${endpoints[@]}"; do
  echo "Testing $endpoint..."
  curl -s -o /dev/null -w "  Status: %{http_code}\n" $BACKEND_URL/$endpoint || echo "  ❌ Failed"
done

echo ""
echo "5. Testing with Origin header (simulating frontend request)..."
curl -s -H "Origin: $FRONTEND_URL" \
  -o /dev/null -w "With Origin header: %{http_code}\n" \
  $BACKEND_URL/api/system-health/ || echo "❌ Origin header test failed"

echo ""
echo "If all tests pass, the backend should work with the frontend!"
echo "If you see 403/401 errors, that's expected (authentication required)."
echo "If you see CORS errors, check the server configuration."