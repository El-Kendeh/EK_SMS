# CRITICAL FIX PLAN - EK-SMS Production Errors

**Status:** Production Critical  
**Generated:** 2026-05-06  
**Issues:** 500 errors + CSP violations  

---

## OVERVIEW OF ISSUES

| Issue | Severity | Error | Fix Time | File(s) |
|-------|----------|-------|----------|---------|
| **Missing DB Column** | CRITICAL | `Unknown column 'eksms_core_student.place_of_birth'` | 5 min | [QUICK_FIX_STEPS.sh](QUICK_FIX_STEPS.sh) |
| **CSP Violations** | HIGH | `Refused to load script blob:...` | 5 min | [CSP_SETTINGS_UPDATE.md](CSP_SETTINGS_UPDATE.md) |
| **API Errors (500)** | CRITICAL | Multiple endpoints returning 500 | Auto-fixes | After migration |
| **Font Loading Errors** | HIGH | CSP blocks Vercel fonts | Auto-fixes | After CSP config |

---

## PRIORITY: FIX 1 - DATABASE MIGRATION (DO THIS FIRST)

### Why This Is Critical
- **Current Impact:** All API endpoints returning 500 errors
- **Affected Endpoints:** `/api/grade-alerts/`, `/api/users/`, `/api/school/students/`
- **Root Cause:** Migration 0029 exists but database wasn't updated

### Quick Steps (5 minutes)

**Option A: Use Automated Script (Recommended)**
```bash
# On your Ubuntu server:
cd /path/to/ek-sms
bash UBUNTU_FIX_MIGRATIONS.sh
```

**Option B: Manual Steps (Copy-Paste)**
```bash
# SSH to server
ssh your-user@your-server-ip

# Navigate and activate
cd /path/to/ek-sms
source venv/bin/activate
cd eksms

# Backup database (CRITICAL!)
python manage.py dbshell
# In MySQL: SHOW DATABASES;
# Note your DB credentials, then exit

# Check pending migrations
python manage.py showmigrations eksms_core | tail -15

# Apply migration
python manage.py migrate eksms_core

# Verify column exists
python manage.py dbshell
# In MySQL:
# USE eksms_db;
# SHOW COLUMNS FROM eksms_core_student WHERE Field='place_of_birth';

# Should see the column definition (not "Empty set")

# Restart Django
sudo systemctl restart gunicorn
sleep 5
sudo systemctl status gunicorn
```

### Verify It Worked
```bash
# Test the endpoint (get token first)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://backend.pruhsms.africa/api/grade-alerts/

# Should return: HTTP 200 (not 500)
```

📄 **Detailed Instructions:** See [QUICK_FIX_STEPS.sh](QUICK_FIX_STEPS.sh)

---

## PRIORITY: FIX 2 - CONTENT SECURITY POLICY (DO THIS AFTER FIX 1)

### Why This Is Important
- **Current Impact:** Browser console shows CSP errors blocking scripts and fonts
- **Affected Areas:** Admin interface, frontend features that use blob scripts
- **User Experience:** Warnings in console (not breaking, but concerning)

### Quick Steps (5 minutes)

**Step 1: Add CSP Middleware to Django**

File: `eksms/eksms/settings.py`

Find the `MIDDLEWARE` list and add this line at the **END**:
```python
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'eksms.csp_middleware.CSPMiddleware',  # ← ADD THIS LINE
]
```

**Step 2: Restart Django**
```bash
sudo systemctl restart gunicorn
sleep 5
sudo systemctl status gunicorn
```

**Step 3: Verify in Browser**
```bash
# Open https://ek-sms-one.vercel.app
# DevTools → Console → Refresh (Ctrl+R)
# Should NOT see red CSP errors anymore
```

📄 **Detailed Instructions:** See [CSP_SETTINGS_UPDATE.md](CSP_SETTINGS_UPDATE.md)  
📄 **Middleware Code:** See [eksms/eksms/csp_middleware.py](eksms/eksms/csp_middleware.py)

---

## VERIFICATION CHECKLIST

After both fixes are applied, verify everything works:

### ✓ Database Fix
- [ ] Migration 0029 is applied
  ```bash
  python manage.py showmigrations eksms_core | grep 0029
  # Should show: [X] 0029_add_student_extended_fields
  ```

- [ ] Column exists in database
  ```bash
  python manage.py dbshell
  # SHOW COLUMNS FROM eksms_core_student WHERE Field='place_of_birth';
  # Should return column definition
  ```

- [ ] API endpoints return 200 (not 500)
  ```bash
  curl -H "Authorization: Bearer TOKEN" https://backend.pruhsms.africa/api/grade-alerts/
  curl -H "Authorization: Bearer TOKEN" https://backend.pruhsms.africa/api/users/
  # Both should return HTTP 200
  ```

### ✓ CSP Fix
- [ ] No CSP errors in browser console
  - Open https://ek-sms-one.vercel.app
  - DevTools → Console
  - Should NOT see red errors about "Refused to load script blob:"
  - Should NOT see red errors about "Refused to load the font from https://vercel.live"

- [ ] CSP header is present in responses
  ```bash
  curl -I https://backend.pruhsms.africa/api/users/ \
    -H "Authorization: Bearer TOKEN" | grep -i content-security-policy
  # Should return: Content-Security-Policy: ...
  ```

### ✓ Application Health
- [ ] No Django errors in logs
  ```bash
  sudo journalctl -u gunicorn -n 50 --no-pager | grep -i error
  # Should be empty or only old errors
  ```

- [ ] Frontend loads without 500 errors
  - Open https://ek-sms-one.vercel.app
  - Network tab should show all API requests return 200 or other success codes
  - No red 500 errors

- [ ] ORM query works
  ```bash
  python manage.py shell
  from eksms_core.models import Student
  Student.objects.values('place_of_birth').first()
  # Should return data or None (not error)
  ```

---

## ROLLBACK PLAN (If Needed)

### Rollback Database Migration
```bash
# Get the database backup created during migration
ls -lh /tmp/eksms_backup_*

# Restore from backup
mysql -u user -p -h host eksms_db < /tmp/eksms_backup_YYYYMMDD_HHMMSS.sql

# Restart Django
sudo systemctl restart gunicorn
```

### Rollback CSP Changes
```bash
# Remove the middleware line from settings.py (just undo your edit)
# Then restart:
sudo systemctl restart gunicorn

# Or revert to previous version:
cd eksms
git checkout eksms/settings.py
sudo systemctl restart gunicorn
```

---

## TESTING ENDPOINTS

After fixes, use this to test all affected endpoints:

```bash
#!/bin/bash
TOKEN="your_jwt_token_here"
BASE_URL="https://backend.pruhsms.africa"

echo "Testing affected endpoints..."
echo ""

echo "1. Grade Alerts Endpoint:"
curl -s -o /dev/null -w "HTTP %{http_code}\n" \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/grade-alerts/"

echo "2. Users Endpoint:"
curl -s -o /dev/null -w "HTTP %{http_code}\n" \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/users/"

echo "3. Students Endpoint:"
curl -s -o /dev/null -w "HTTP %{http_code}\n" \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/school/students/"

echo ""
echo "All should return HTTP 200 (not 500)"
```

---

## FILES PROVIDED

| File | Purpose |
|------|---------|
| [QUICK_FIX_STEPS.sh](QUICK_FIX_STEPS.sh) | Copy-paste commands for manual fix |
| [UBUNTU_FIX_MIGRATIONS.sh](UBUNTU_FIX_MIGRATIONS.sh) | Automated migration script |
| [verify_fix.py](verify_fix.py) | Python script to verify both fixes |
| [eksms/eksms/csp_middleware.py](eksms/eksms/csp_middleware.py) | CSP middleware implementation |
| [CSP_SETTINGS_UPDATE.md](CSP_SETTINGS_UPDATE.md) | How to add middleware to settings |
| [TESTING_CHECKLIST.md](TESTING_CHECKLIST.md) | Comprehensive testing guide |

---

## TIMELINE

```
FIX 1: Database Migration
├─ SSH to server: 1 min
├─ Backup database: 2 min
├─ Apply migration: 1 min
└─ Verify: 1 min
   SUBTOTAL: 5 minutes

FIX 2: CSP Configuration  
├─ Edit settings.py: 2 min
├─ Restart Django: 2 min
└─ Verify in browser: 1 min
   SUBTOTAL: 5 minutes

TOTAL TIME: ~10 minutes
```

---

## SUPPORT & MONITORING

### Monitor After Fixes
```bash
# Watch logs in real-time
ssh your-user@your-server-ip
sudo journalctl -u gunicorn -f

# Should show normal operations (no errors about place_of_birth)
```

### Verify Daily
```bash
# Quick health check (run daily or weekly)
python verify_fix.py
# Should show all tests passing
```

### Long-term Monitoring
- Browser console: Check for any errors (should be clean now)
- Backend logs: Monitor for database-related errors
- API responses: Ensure consistent 200 responses

---

## QUESTIONS & ANSWERS

**Q: Will this migration break anything?**  
A: No. Migration 0029 adds a new optional field (`place_of_birth`). It doesn't modify or delete existing data.

**Q: Do I need to restart the server?**  
A: Yes, Django needs to restart after:
- Applying the migration (automatic via `migrate` command)
- Updating settings.py (manual: `sudo systemctl restart gunicorn`)

**Q: What if the migration fails?**  
A: Check `sudo journalctl -u gunicorn -n 50 --no-pager` for errors. Most common issues:
- Database credentials wrong
- Database doesn't exist
- Existing constraints preventing field addition

**Q: Can I rollback if needed?**  
A: Yes! Database backups are created automatically during migration. See ROLLBACK PLAN above.

**Q: How long does this take?**  
A: Total ~10 minutes. Most time is waiting for service restart and manual verification.

**Q: What if I have multiple servers?**  
A: Repeat the fix on each server independently, or use a deployment pipeline to apply automatically.

---

## SUCCESS CRITERIA

✅ **Fix is successful when:**
1. API endpoints return HTTP 200 (not 500)
2. Browser console shows no red CSP errors
3. Database query for `place_of_birth` works
4. No errors in Django logs about unknown columns
5. All tests in [verify_fix.py](verify_fix.py) pass

---

**Generated:** 2026-05-06  
**Status:** Ready for Production  
**Next Action:** Execute Fix 1 (Database Migration)
