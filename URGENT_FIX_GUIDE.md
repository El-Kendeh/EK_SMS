# URGENT: Database & CSP Issues - Complete Fix Guide

## 🚨 Critical Issues Found

### 1. **Database Schema Mismatch** (PRIMARY ISSUE)
- **Error**: `Unknown column 'eksms_core_student.place_of_birth' in 'field list'`
- **Root Cause**: Django migrations exist but haven't been applied to production database
- **Affected Endpoints**: `/api/grade-alerts/`, `/api/users/`
- **Status**: Causing 500 errors on multiple API calls

### 2. **CSP (Content Security Policy) Violations**
- Blob script injection blocked
- Fonts from Vercel Live blocked
- Status: Warnings/Errors, but app still works

### 3. **Media Files 404**
- School badges not loading: `backend.pruhsms.africa/media/school_badges/...`

---

## ✅ FIX #1: Apply Missing Database Migrations (Ubuntu Backend)

### On Your Ubuntu Server, SSH and Run:

```bash
# Navigate to project directory
cd /path/to/ek-sms

# Activate Python virtual environment
source venv/bin/activate  # or .venv/bin/activate

# Show pending migrations
python eksms/manage.py showmigrations eksms_core

# Apply all pending migrations
python eksms/manage.py migrate eksms_core

# Verify migrations were applied
python eksms/manage.py showmigrations eksms_core | grep eksms_core.0029

# Verify database schema
python eksms/manage.py dbshell
# Inside MySQL shell:
# DESC eksms_core_student;
# SHOW COLUMNS FROM eksms_core_student WHERE Field='place_of_birth';
# exit
```

### Expected Output After Fix:
```
[X] 0029_add_student_extended_fields
[X] 0030_student_gender_other
[X] 0031_add_feedback_submissions_messages_remedial
... (all should show [X])
```

---

## ✅ FIX #2: Update Content Security Policy

### File: `eksms/settings.py` or `eksms/eksms_settings/security.py`

Find and update the CSP settings:

```python
# OLD (if present)
CSP_SCRIPT_SRC = (
    "'self'",
    "'unsafe-inline'",
    "https://embed.tawk.to",
    "https://*.tawk.to",
)

# NEW - Add blob: and vercel.live
CSP_SCRIPT_SRC = (
    "'self'",
    "'unsafe-inline'",
    "'unsafe-eval'",  # For bundled JavaScript
    "blob:",  # For dynamic scripts
    "https://embed.tawk.to",
    "https://*.tawk.to",
    "https://vercel.live",
    "https://*.vercel.live",
    "chrome-extension:",
)

CSP_FONT_SRC = (
    "'self'",
    "https://fonts.gstatic.com",
    "https://*.tawk.to",
    "https://vercel.live",  # Add this
    "https://*.vercel.live",  # Add this
)

# Add style sources if needed
CSP_STYLE_SRC = (
    "'self'",
    "'unsafe-inline'",
    "https://fonts.googleapis.com",
    "https://*.tawk.to",
    "https://vercel.live",
    "https://*.vercel.live",
)
```

### Or check Django-CSP middleware in `settings.py`:

```python
MIDDLEWARE = [
    # ... other middleware
    'csp.middleware.CSPMiddleware',  # Ensure this is present
]

CSP_DEFAULT_SRC = ("'self'",)
CSP_SCRIPT_SRC = ("'self'", "'unsafe-inline'", "blob:", "https://vercel.live", "https://*.vercel.live")
CSP_FONT_SRC = ("'self'", "https://fonts.gstatic.com", "https://vercel.live")
CSP_STYLE_SRC = ("'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://vercel.live")
CSP_IMG_SRC = ("'self'", "data:", "https:", "blob:")
CSP_CONNECT_SRC = ("'self'", "https://vercel.live", "https://*.vercel.live", "https://backend.pruhsms.africa")
```

---

## ✅ FIX #3: Fix Media File Path Issues

### Check Vercel Backend Configuration

If using Vercel for backend, static/media files won't work by default. 

**Option A: Use Cloud Storage (Recommended)**
```bash
# Install storage backend
pip install django-storages boto3
```

Update `settings.py`:
```python
if USE_S3:
    # AWS S3 Configuration
    AWS_STORAGE_BUCKET_NAME = 'your-bucket'
    AWS_S3_REGION_NAME = 'us-east-1'
    AWS_S3_CUSTOM_DOMAIN = f'{AWS_STORAGE_BUCKET_NAME}.s3.amazonaws.com'
    AWS_LOCATION = 'media'
    
    DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
    MEDIA_URL = f'https://{AWS_S3_CUSTOM_DOMAIN}/{AWS_LOCATION}/'
    MEDIA_ROOT = f'https://{AWS_S3_CUSTOM_DOMAIN}/{AWS_LOCATION}/'
```

**Option B: Use Local Directory**
```python
# Local file storage (if not using Vercel Functions)
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')
```

### Update `urls.py` to serve media:
```python
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    # ... your patterns
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
```

---

## ✅ FIX #4: Fix Frontend Deprecation Warnings

### File: `src/components/.../...js` (wherever zustand is imported)

```javascript
// OLD ❌
import { create } from 'zustand/index.js'
// or
import create from 'zustand'

// NEW ✅
import { create } from 'zustand'
```

---

## ✅ FIX #5: Fix Accessibility Warnings

### Update Dialog Components

Find files with `DialogContent` and add `DialogTitle`:

```jsx
// OLD ❌
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent>
    <div>{content}</div>
  </DialogContent>
</Dialog>

// NEW ✅
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent>
    <DialogTitle>Dialog Title</DialogTitle>
    <DialogDescription>
      Additional description if needed
    </DialogDescription>
    <div>{content}</div>
  </DialogContent>
</Dialog>
```

Or hide the title:
```jsx
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'

<DialogTitle asChild>
  <VisuallyHidden>Dialog Title</VisuallyHidden>
</DialogTitle>
```

---

## 📋 Deployment Checklist

- [ ] **SSH to Ubuntu server and run migrations**
  ```bash
  python eksms/manage.py migrate eksms_core
  ```

- [ ] **Update CSP settings in Django**
  - Edit: `eksms/settings.py`
  - Add: `blob:`, `vercel.live`, `*.vercel.live`

- [ ] **Restart backend server**
  ```bash
  # If using gunicorn
  sudo systemctl restart gunicorn
  
  # If using Vercel
  Deploy new version to trigger restart
  ```

- [ ] **Test API endpoints**
  ```bash
  curl -H "Authorization: Bearer YOUR_TOKEN" \
    https://backend.pruhsms.africa/api/grade-alerts/
  
  curl -H "Authorization: Bearer YOUR_TOKEN" \
    https://backend.pruhsms.africa/api/users/
  ```

- [ ] **Check browser console for CSP errors**
  - Open DevTools (F12)
  - Go to Console tab
  - Refresh page
  - Look for red CSP violation messages

- [ ] **Verify database column exists**
  ```bash
  python eksms/manage.py dbshell
  DESC eksms_core_student;
  ```

---

## 🔍 Testing After Fixes

### Test 1: Database Column
```bash
# On Ubuntu server
python eksms/manage.py dbshell
SELECT place_of_birth FROM eksms_core_student LIMIT 1;
# Should return successfully (may be NULL)
```

### Test 2: API Endpoints
```bash
# Should return 200, not 500
curl -X GET https://backend.pruhsms.africa/api/grade-alerts/ \
  -H "Authorization: Bearer TOKEN"

curl -X GET https://backend.pruhsms.africa/api/users/ \
  -H "Authorization: Bearer TOKEN"
```

### Test 3: CSP Compliance
- Open DevTools Console
- Refresh page
- Should see NO red CSP violation messages
- May see yellow deprecation warnings (harmless)

### Test 4: Media Files
- Check that school badge images load
- Should see HTTP 200, not 404

---

## ⚠️ If Migration Fails

If you get an error like `Relation "eksms_core_student" does not exist`:

```bash
# First, check what migrations have been applied
python eksms/manage.py showmigrations eksms_core

# If 0029 shows as [X] but column doesn't exist:
# The migration may have failed silently. Reset and reapply:

# WARNING: This will reset ALL migrations (dev only!)
python eksms/manage.py migrate eksms_core zero  # Reset everything
python eksms/manage.py migrate eksms_core       # Reapply all
```

---

## 📞 Support

If issues persist after following this guide:

1. **Check Django logs** on Ubuntu server:
   ```bash
   tail -f /var/log/gunicorn/error.log
   tail -f /var/log/django/error.log
   ```

2. **Check database logs**:
   ```bash
   sudo journalctl -u mysql -n 50
   ```

3. **Verify Python packages**:
   ```bash
   pip list | grep -i django
   python eksms/manage.py version
   ```

---

Generated: 2026-05-06
Status: Production-Ready Fix Guide
