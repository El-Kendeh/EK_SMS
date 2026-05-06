# Quick Testing Checklist - After Applying Fixes

## Step 1: Verify Database Migration ✓

### SSH to Ubuntu Server:
```bash
ssh your-user@your-server-ip
cd /path/to/ek-sms
source venv/bin/activate

# Check if migration 0029 is applied
python eksms/manage.py showmigrations eksms_core | grep 0029_add_student_extended_fields
# Should show: [X] 0029_add_student_extended_fields
```

### Verify Column in Database:
```bash
python eksms/manage.py dbshell

# Inside MySQL:
USE eksms_db;
DESC eksms_core_student;
# Look for place_of_birth column - should exist with varchar(200)

# Or directly query:
SHOW COLUMNS FROM eksms_core_student WHERE Field='place_of_birth';
# Should return the column definition
```

---

## Step 2: Restart Backend Services ✓

### If Using Gunicorn:
```bash
sudo systemctl restart gunicorn
sudo systemctl status gunicorn  # Verify it's running

# Check logs
sudo journalctl -u gunicorn -n 50 --no-pager
```

### If Using Systemd Service:
```bash
sudo systemctl restart ek-sms
sudo systemctl status ek-sms
```

### If Using Vercel:
```bash
# Deploy new changes which will restart the backend
vercel deploy
# or
git push origin main  # If set up with auto-deploy
```

---

## Step 3: Test API Endpoints ✓

### Get Authentication Token:
```bash
# 1. Login to get token
curl -X POST https://backend.pruhsms.africa/api/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your_password"}'

# Response should include: {"token": "your_jwt_token_here"}
# Save the token for next requests
```

### Test Grade Alerts Endpoint:
```bash
export TOKEN="your_jwt_token_here"

curl -X GET https://backend.pruhsms.africa/api/grade-alerts/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"

# Expected: HTTP 200 (not 500)
# Response should include: {"grade_alerts": [...]}
```

### Test Users Endpoint:
```bash
curl -X GET https://backend.pruhsms.africa/api/users/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"

# Expected: HTTP 200 (not 500)
# Response should include user data
```

### Test Students Endpoint (with place_of_birth):
```bash
curl -X GET https://backend.pruhsms.africa/api/school/students/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"

# Response should include place_of_birth field for each student
```

---

## Step 4: Check Content Security Policy ✓

### Open Frontend in Browser:
1. Navigate to: `https://ek-sms-one.vercel.app`
2. Open Developer Tools (F12)
3. Go to **Console** tab
4. Refresh page (Ctrl+R or Cmd+R)

### Look for Errors:
- **BAD** ❌ - Red messages about CSP violations:
  ```
  Refused to load the script 'blob:...' because it violates the following CSP directive
  Refused to load the font from 'https://vercel.live/...' because it violates the CSP directive
  ```

- **GOOD** ✓ - No red CSP errors
  - Yellow warnings about deprecated packages are OK
  - "Missing DialogTitle" warnings are accessibility issues (non-critical)

### Monitor Network Tab:
1. Go to **Network** tab
2. Filter for failed requests (red status codes)
3. Should NOT see:
   - 500 errors from `/api/grade-alerts/`
   - 500 errors from `/api/users/`
   - 404 errors from `/media/school_badges/`

---

## Step 5: Test Media File Loading ✓

### Check School Badge Loading:
```bash
# Replace with an actual school badge ID from your database
curl -I https://backend.pruhsms.africa/media/school_badges/sample-badge-id.jpeg

# Expected: HTTP 200
# Bad: HTTP 404
```

### Database Check:
```bash
python eksms/manage.py dbshell

# Inside MySQL:
SELECT id, school_badge FROM eksms_core_school LIMIT 1;
# Check if badge URLs are correct
```

---

## Step 6: Application Health Check ✓

### Check System Health Endpoint:
```bash
curl -X GET https://backend.pruhsms.africa/api/system/health/ \
  -H "Authorization: Bearer $TOKEN"

# Expected response:
# {
#   "status": "healthy",
#   "database": "connected",
#   "timestamp": "2026-05-06T..."
# }
```

### Monitor Backend Logs (Ubuntu):
```bash
# Watch logs in real-time
tail -f /var/log/django/error.log
# or
tail -f /var/log/gunicorn/error.log
# or
sudo journalctl -u gunicorn -f

# No errors about place_of_birth or unknown column
```

---

## Step 7: Frontend Console Check ✓

### Expected Warnings (Non-Critical):
```
[DEPRECATED] Default export is deprecated. Instead use `import { create } from 'zustand'`.
`DialogContent` requires a `DialogTitle` for the component to be accessible
Warning: Missing `Description` or `aria-describedby`
```

### Should NOT See:
```
CSP Violation: Failed to load script 'blob:...'
Refused to load the font 'https://vercel.live/...'
[ApiError] 500: Unknown column 'eksms_core_student.place_of_birth'
```

---

## Step 8: Database Verification Summary

### Quick Test Script (Run on Ubuntu):
```bash
#!/bin/bash
echo "Testing database connection..."
python eksms/manage.py migrate eksms_core --dry-run

echo "Checking place_of_birth column..."
python eksms/manage.py shell << EOF
from eksms_core.models import Student
import inspect
# List all Student model fields
fields = {f.name for f in Student._meta.get_fields()}
if 'place_of_birth' in fields:
    print("✓ place_of_birth field exists in model")
else:
    print("✗ place_of_birth field NOT found in model")

# Test query
try:
    students = Student.objects.values('place_of_birth').first()
    print("✓ Can query place_of_birth from database")
except Exception as e:
    print(f"✗ Error querying place_of_birth: {e}")
EOF
```

---

## Step 9: Full System Restart Test

### Recommended Full Restart (Production):
```bash
# 1. Restart backend
sudo systemctl restart gunicorn

# 2. Wait 5 seconds
sleep 5

# 3. Check status
sudo systemctl status gunicorn

# 4. Tail logs
sudo journalctl -u gunicorn -n 20 --no-pager

# 5. Test API
curl https://backend.pruhsms.africa/api/system/health/ -H "Authorization: Bearer $TOKEN"

# 6. Verify frontend can reach backend
# Open browser console and check for CSP/network errors
```

---

## Troubleshooting If Tests Fail

### If Still Getting 500 Errors:
```bash
# SSH to server
ssh your-user@your-server

# Check migrations status
python eksms/manage.py showmigrations eksms_core | tail -10

# Check for pending migrations
python eksms/manage.py makemigrations --dry-run

# If there are pending migrations:
python eksms/manage.py migrate eksms_core --verbosity 2

# Restart and test again
sudo systemctl restart gunicorn
```

### If CSP Errors Still Appear:
```bash
# Check that middleware.py was updated
grep "blob:" eksms/eksms/middleware.py
# Should show the updated CSP header with blob:

# Verify it's being returned in responses
curl -I https://backend.pruhsms.africa/api/users/ \
  -H "Authorization: Bearer $TOKEN" \
  | grep -i "content-security-policy"
```

### If Media Files Still 404:
```bash
# Check media directory exists
ls -la eksms/media/

# Check permissions
sudo chown -R www-data:www-data eksms/media/
sudo chmod -R 755 eksms/media/

# Verify URL pattern in settings
grep "MEDIA_URL\|MEDIA_ROOT" eksms/eksms/settings.py

# Restart web server
sudo systemctl restart gunicorn
```

---

## ✓ All Tests Passing Checklist

- [ ] Database column `place_of_birth` exists and queryable
- [ ] `/api/grade-alerts/` returns HTTP 200 with data
- [ ] `/api/users/` returns HTTP 200 with data  
- [ ] `/api/school/students/` includes `place_of_birth` field
- [ ] No red CSP violations in browser console
- [ ] School badge images load (HTTP 200, not 404)
- [ ] No "Unknown column" errors in logs
- [ ] Frontend communicates with backend without errors
- [ ] All yellow warnings are only deprecation/accessibility (not CSP)
- [ ] Backend logs show no errors after restart

---

## Performance Metrics to Monitor

After fixes are applied, monitor these metrics:

```bash
# Check database query time
python eksms/manage.py shell
>>> from django.db import connection
>>> from eksms_core.models import Student
>>> import time
>>> start = time.time()
>>> students = list(Student.objects.values('place_of_birth').all())
>>> print(f"Query time: {time.time() - start:.3f}s")
# Should be < 1 second for normal data volumes
```

---

## Rollback Plan (If Something Goes Wrong)

### Quick Rollback:
```bash
# 1. Revert middleware changes
cd eksms/eksms
git checkout middleware.py

# 2. Revert settings changes
git checkout settings.py

# 3. Restart backend
sudo systemctl restart gunicorn

# 4. Verify
curl https://backend.pruhsms.africa/api/system/health/ -H "Authorization: Bearer $TOKEN"
```

---

Generated: 2026-05-06  
Status: Production-Ready Testing Guide
