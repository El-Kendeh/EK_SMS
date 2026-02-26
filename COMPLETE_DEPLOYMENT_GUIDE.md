# EK-SMS Complete Deployment Guide

**Full Instructions for Deploying to Render.com**

---

## Overview

Your EK-SMS application is ready for production deployment on Render.com. This guide provides step-by-step instructions.

---

## Pre-Deployment Checklist

### ✅ Local Setup Complete
- [x] Django 6.0.1 configured
- [x] All dependencies updated
- [x] Database migrations applied
- [x] Static files collected locally
- [x] System check passing (0 issues)
- [x] Staff account management implemented
- [x] Security settings configured
- [x] All documentation complete

### ✅ Deployment Configuration Ready
- [x] render.yaml configured
- [x] requirements.txt updated
- [x] pyproject.toml created
- [x] setup.py created
- [x] .renderignore created
- [x] Python 3.14 runtime specified
- [x] Binary wheel preference enabled
- [x] Gunicorn configured

---

## Deployment Steps

### Step 1: Commit Changes

```bash
# Navigate to project
cd "C:\Users\Princess Magbie\Desktop\ek-sms"

# Activate virtual environment (if needed)
.venv\Scripts\Activate.ps1

# View changes
git status

# Stage all changes
git add .

# Commit with descriptive message
git commit -m "fix: Resolve Render.com deployment issues

- Update Pillow to 11.1.0 (Python 3.14 compatible)
- Update runtime to python314 in render.yaml
- Optimize build with binary wheel preference
- Add build configuration (pyproject.toml, setup.py)
- Add .renderignore for faster builds
- Complete staff account management implementation
- All migrations applied and tested"

# View commit
git log --oneline -1
```

### Step 2: Push to Repository

```bash
# Push to main branch (triggers Render deploy)
git push origin main

# Monitor push
# Should see: [main xxxxxxx] message...
#           N files changed, M insertions(+)
```

### Step 3: Monitor Render Deployment

1. **Go to Render.com Dashboard:**
   - URL: https://dashboard.render.com
   - Find "ek-sms-backend" service

2. **Watch Build Process:**
   - Build should start automatically
   - Look for these stages:
     ```
     Building... (2-3 minutes)
     Deploying... (1 minute)
     Live! ✓
     ```

3. **Expected Build Output:**
   ```
   Building from GitHub...
   ✓ Cloning repository
   ✓ Installing Python 3.14
   ✓ Installing pip dependencies
   ✓ Collecting static files
   ✓ Build completed
   ✓ Starting application
   ✓ Service is live
   ```

### Step 4: Verify Deployment

```bash
# Once Render shows "Live", test:

# 1. Check website is accessible
curl https://ek-sms-backend.onrender.com

# 2. Test admin page
# Go to: https://ek-sms-backend.onrender.com/admin

# 3. Check logs (in Render Dashboard)
# Should show: "Starting gunicorn server"
# Should show: No error messages
```

---

## Deployment Configuration Details

### render.yaml Sections

**Web Service:**
```yaml
web:
  type: web              # Web service (not worker/cron)
  plan: free             # Free tier
  name: ek-sms-backend   # Service name on dashboard
  runtime: python314     # Python 3.14 (matches local)
  rootDir: eksms         # Django project directory
```

**Build Command:**
```yaml
buildCommand: |
  pip install --upgrade pip setuptools wheel
  pip install --prefer-binary -r requirements.txt
  python manage.py collectstatic --noinput
```

**What Each Line Does:**
- `pip install --upgrade pip setuptools wheel` → Updates packaging tools
- `pip install --prefer-binary` → Uses pre-built wheels when available
- `python manage.py collectstatic` → Collects static files for serving

**Start Command:**
```yaml
startCommand: gunicorn eksms.wsgi:application --bind 0.0.0.0:$PORT --workers 1
```

**Environment Variables:**
```yaml
envVars:
  - key: DEBUG
    value: 'False'                                    # Never True on production
  - key: PYTHONUNBUFFERED
    value: '1'                                        # See logs in real-time
  - key: DJANGO_SETTINGS_MODULE
    value: 'eksms.settings_secure'                    # Use secure settings
  - key: SECRET_KEY
    generateValue: true                               # Auto-generate random key
  - key: ALLOWED_HOSTS
    value: 'ek-sms-backend.onrender.com,*.onrender.com'
  - key: CORS_ALLOWED_ORIGINS
    value: 'https://ek-sms-one.vercel.app'
  - key: SECURE_SSL_REDIRECT
    value: 'True'                                     # HTTPS only
  - key: SESSION_COOKIE_SECURE
    value: 'True'
  - key: CSRF_COOKIE_SECURE
    value: 'True'
  - key: SECURE_HSTS_SECONDS
    value: '31536000'                                 # 1 year HSTS
```

---

## Database Setup (First Deploy Only)

### If Using SQLite (Current Setup)

SQLite database included in repository, so:
```bash
# On first deploy, Render automatically:
# 1. Copies db.sqlite3 from repository
# 2. Database is persistent in Render storage
# (Data persists between deploys)
```

### If Migrating to PostgreSQL (Future)

```bash
# 1. Create PostgreSQL database on Render
# 2. Update render.yaml with DATABASE_URL env var
# 3. Add psycopg2 to requirements.txt
# 4. Run: python manage.py migrate
```

---

## Troubleshooting Deployments

### Issue: Build Fails with "__version__" Error

**Solution Already Applied:**
- ✅ Updated Pillow to 11.1.0
- ✅ Updated runtime to python314
- ✅ Added binary wheel preference

**If still fails:**
1. Check logs in Render dashboard
2. Verify render.yaml has correct indentation
3. Confirm pyproject.toml has `prefer-binary = true`
4. Try clearing cache in Render Settings

### Issue: "Static files not found" on Production

**Solution:**
```bash
# Already configured in render.yaml:
# collectstatic --noinput is in buildCommand

# Verify locally:
cd eksms
python manage.py collectstatic --noinput
# Should show: "X static files copied to '/staticfiles/'"
```

### Issue: Database Errors After Deploy

**Solution:**
```bash
# Render includes db.sqlite3, so database should work
# If issues:
1. Check Render file storage hasn't filled up
2. Run migrations on Render (via SSH):
   python manage.py migrate
3. Check DATABASE_URL env var is set correctly
```

### Issue: Website Returns Error 500

**Check logs:**
1. Render dashboard → Logs
2. Look for error messages
3. Common issues:
   - SECRET_KEY not set (should auto-generate)
   - DEBUG=True (should be False)
   - ALLOWED_HOSTS doesn't include Render domain
   - Missing environment variables

**Fix:**
```bash
# Update render.yaml env vars
# Re-deploy
git push origin main
```

### Issue: Deploy Takes > 10 minutes

**Optimize:**
1. Binary wheels now enabled (should be fast)
2. Check internet connection on Render servers
3. Try restarting build:
   - Render Dashboard → Service → Redeploy

---

## Post-Deployment Verification

### ✅ Application Working

```bash
# 1. Check website loads
https://ek-sms-backend.onrender.com/
# Should show: Page not found (because no frontend route)

# 2. Check admin loads
https://ek-sms-backend.onrender.com/admin
# Should show: Django admin login page

# 3. Check API health (if exists)
curl https://ek-sms-backend.onrender.com/api/health
```

### ✅ Database Connected

```bash
# 1. Log in to admin
https://ek-sms-backend.onrender.com/admin
# Username/Password: Set during initial setup

# 2. Verify staff accounts show
Admin → EKSMS_CORE → School Staff Accounts
# Should see: Test accounts you created locally

# 3. Check audit logs
Admin → EKSMS_CORE → Staff Account Audit Logs
# Should see: All changes logged
```

### ✅ Security Configured

```bash
# 1. Check SSL/HTTPS
# All requests redirect to HTTPS: ✅

# 2. Check headers
curl -I https://ek-sms-backend.onrender.com
# Should include: Strict-Transport-Security

# 3. Check Django security
https://ek-sms-backend.onrender.com/admin
# Should have secure cookie settings
```

### ✅ Logs Are Recording

1. Go to Render Dashboard
2. Select "ek-sms-backend"
3. View Logs
4. Should show:
   ```
   Starting gunicorn...
   Listening on 0.0.0.0:PORT
   Application running
   ```

---

## Monitor Production

### Weekly

- [ ] Check Render dashboard for errors
- [ ] Review application logs
- [ ] Test admin login works
- [ ] Verify SSL certificate valid

### Monthly

- [ ] Review Django system check
- [ ] Check database storage usage
- [ ] Monitor uptime stats
- [ ] Review error logs

### Quarterly

- [ ] Security updates (Django, packages)
- [ ] Performance optimization
- [ ] Backup database review
- [ ] Update dependencies

---

## Common Configuration Changes

### Add New Environment Variable

```yaml
# In render.yaml:
envVars:
  - key: NEW_VARIABLE
    value: 'some_value'
```

Then commit and push:
```bash
git add render.yaml
git commit -m "Add NEW_VARIABLE to Render env"
git push origin main
```

### Change Database to PostgreSQL

```bash
# 1. Create PostgreSQL database on Render
# 2. Update render.yaml:
envVars:
  - key: DATABASE_URL
    fromDatabase:
      name: ek-sms-postgres    # Database name in Render

# 3. Add psycopg2 to requirements.txt:
echo "psycopg2==2.9.9" >> requirements.txt

# 4. Commit and deploy:
git add .
git commit -m "Migrate to PostgreSQL"
git push origin main
```

### Update Python Version

```yaml
# In render.yaml:
runtime: python315   # or other version
```

---

## Scaling Options (Future)

### Now (Free Plan)
- Single instance
- Limited resources
- Auto-paused after 15 mins inactivity
- Perfect for testing/demo

### When Ready (Pro Plan)
- 24/7 uptime
- More resources
- Custom domain
- Support priority

---

## Backup & Recovery

### Backup Database

```bash
# Download db.sqlite3 from Render
1. Render Dashboard → ek-sms-backend → Files
2. Find db.sqlite3
3. Download locally

# Or use SSH:
ssh into-render-instance
pg_dump ek_sms > backup.sql
```

### Restore from Backup

```bash
# If database corrupted:
1. Upload backup file to Render
2. Restore: sqlite3 db.sqlite3 < backup.sql
3. Restart service
```

---

## Performance Tips

### Current Setup Already Includes
- ✅ WhiteNoise for static file serving (fast)
- ✅ Gunicorn for production WSGI server
- ✅ HTTPS/SSL for secure connections
- ✅ Security headers configured
- ✅ Database indexed for queries
- ✅ Binary wheel preference for faster builds

### Future Optimizations
- Add Redis for caching
- Use CDN for static files
- Add database connection pooling
- Implement async views
- Add Celery for background tasks

---

## Support & Troubleshooting

### Render.com Support

- **Dashboard**: https://dashboard.render.com
- **Docs**: https://render.com/docs
- **Support**: support@render.com
- **Status**: https://status.render.com

### Django Support

- **Docs**: https://docs.djangoproject.com
- **Security Advisories**: https://www.djangoproject.com/weblog/
- **Community**: https://forum.djangoproject.com

### Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Pillow build error | Already fixed - python314 + Pillow 11.1.0 |
| Static files 404 | Already configured - collectstatic runs |
| Database errors | Already included - db.sqlite3 provided |
| CORS errors | Already configured - CORS_ALLOWED_ORIGINS set |
| SSL errors | Already configured - SECURE_SSL_REDIRECT enabled |

---

## Deployment Checklist

Before deploying, verify:

```bash
# Local checks:
[ ] cd "C:\Users\Princess Magbie\Desktop\ek-sms\eksms"
[ ] python manage.py check
    # Should show: "System check identified no issues (0 silenced)"
[ ] python manage.py migrate
    # Should show: "No migrations to apply"
[ ] cat requirements.txt
    # Should show: Pillow==11.1.0
    
# Git checks:
[ ] git status
    # Should show: no changes
[ ] git log --oneline -1
    # Should show: latest commit message

# Render checks:
[ ] cat ../render.yaml
    # Should show: runtime: python314
[ ] cat ../pyproject.toml
    # Should exist with valid Python configuration
    
# After push:
[ ] Go to https://dashboard.render.com
[ ] Service "ek-sms-backend" shows "Live"
[ ] No errors in logs
[ ] Admin page loads at: https://ek-sms-backend.onrender.com/admin
```

---

## Summary

**Current Status**: ✅ **Ready for Production**

**What Changed for Deployment**:
- Updated Pillow to 11.1.0 (Python 3.14 compatible)
- Set runtime to python314 (match environment)
- Optimized build process (binary wheels)
- Added build configuration files
- Created .renderignore for faster builds

**Next Steps**:
1. Commit changes: `git add . && git commit -m "..."`
2. Push to trigger deploy: `git push origin main`
3. Monitor Render dashboard: Watch build complete
4. Verify deployment: Test admin page loads
5. Celebrate: Application is live! 🎉

---

**Last Updated**: February 23, 2026  
**Version**: 1.0 - Production Ready  
**Status**: ✅ Approved for Deployment
