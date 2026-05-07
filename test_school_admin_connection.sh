#!/bin/bash

# Test script to verify school admin dashboard connection to backend.pruhsms.africa and MySQL

echo "🔍 Testing School Admin Dashboard Connection"
echo "=========================================="

BACKEND_URL="https://backend.pruhsms.africa"
FRONTEND_URL="https://ek-sms-one.vercel.app"

echo "1. Testing backend health endpoint..."
curl -s -w "Status: %{http_code}\n" "$BACKEND_URL/api/system/health/" || echo "❌ Backend health check failed"

echo ""
echo "2. Testing CORS preflight for school admin endpoints..."
curl -s -X OPTIONS \
  -H "Origin: $FRONTEND_URL" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Authorization" \
  -w "Status: %{http_code}\n" \
  "$BACKEND_URL/api/school/dashboard/" || echo "❌ CORS preflight failed"

echo ""
echo "3. Testing school admin API endpoints..."
endpoints=(
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

echo "4. Testing database connection (if backend is accessible)..."
# This would require authentication, so we'll just check if the endpoint exists
curl -s -w "Database endpoint status: %{http_code}\n" "$BACKEND_URL/api/system/db-status/" || echo "❌ Database status check failed"

echo ""
echo "5. Testing frontend build configuration..."
echo "Frontend should be calling: $BACKEND_URL"
echo "Check browser network tab to verify API calls go to backend.pruhsms.africa"

echo ""
echo "✅ Connection test completed!"
echo ""
echo "Next steps:"
echo "- Deploy frontend to Vercel with REACT_APP_API_URL=$BACKEND_URL"
echo "- Check browser console for any CORS or connection errors"
echo "- Verify school admin dashboard loads without errors"