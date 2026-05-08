#!/bin/bash

# Test script to verify school admin dashboard connection to backend.pruhsms.africa and MySQL

echo "🔍 Testing School Admin Dashboard Connection"
echo "=========================================="

BACKEND_URL="https://backend.pruhsms.africa"
FRONTEND_URL="https://ek-sms-one.vercel.app"

echo "1. Testing backend health endpoint..."
curl -s -w "Status: %{http_code}\n" "$BACKEND_URL/api/system-health/" || echo "❌ Backend health check failed"

echo ""
echo "2. Testing new test connection endpoint..."
curl -s -w "Status: %{http_code}\n" "$BACKEND_URL/api/test-connection/" || echo "❌ Test connection failed"

echo ""
echo "3. Testing CORS preflight for school admin endpoints..."
curl -s -X OPTIONS \
  -H "Origin: $FRONTEND_URL" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Authorization" \
  -w "Status: %{http_code}\n" \
  "$BACKEND_URL/api/school/info/" || echo "❌ CORS preflight failed"

echo ""
echo "4. Testing school admin API endpoints..."
endpoints=(
  "/api/school/info/"
  "/api/school/dashboard/"
  "/api/school/students/"
  "/api/school/teachers/"
  "/api/school/classes/"
  "/api/school/subjects/"
)

for endpoint in "${endpoints[@]}"; do
  echo "Testing $endpoint..."
  curl -s -w "Status: %{http_code}\n" "$BACKEND_URL$endpoint" || echo "❌ $endpoint failed"
  echo ""
done

echo "5. Testing database connection..."
echo "MySQL should be running with database: eksms_db, user: eksms_user"
mysql -u eksms_user -pelkinson -e "SELECT COUNT(*) as schools FROM eksms_core_school;" eksms_db 2>/dev/null || echo "❌ MySQL connection failed"

echo ""
echo "6. Testing authentication (you need a valid token)..."
echo "To test with authentication:"
echo "curl -H 'Authorization: Bearer YOUR_TOKEN_HERE' $BACKEND_URL/api/test-connection/"
echo "curl -H 'Authorization: Bearer YOUR_TOKEN_HERE' $BACKEND_URL/api/school/info/"

echo ""
echo "7. Check Django logs for debugging:"
echo "sudo tail -f /var/log/django.log"
echo "Look for [DEBUG] messages showing authentication flow"

echo ""
echo "✅ Connection test completed!"
echo ""
echo "Next steps:"
echo "- Deploy frontend to Vercel with REACT_APP_API_URL=$BACKEND_URL"
echo "- Check browser console for any CORS or connection errors"
echo "- Verify school admin dashboard loads without errors"