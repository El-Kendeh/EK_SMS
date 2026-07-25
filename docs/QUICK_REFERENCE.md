# ⚡ Quick Reference - Ubuntu Deployment Commands

## 🚀 One-Command Fix (Run on Ubuntu Server)

```bash
cd /path/to/ek-sms && \
source venv/bin/activate && \
python eksms/manage.py migrate eksms_core --verbosity 2 && \
sudo systemctl restart gunicorn && \
echo "✓ Migration complete. Restarted gunicorn."
```

---

## 📋 Step-by-Step (If Above Doesn't Work)

```bash
# 1. SSH to server
ssh your-user@your-server

# 2. Navigate to project
cd /path/to/ek-sms

# 3. Activate environment
source venv/bin/activate  # or .venv/bin/activate

# 4. Show current migration status
python eksms/manage.py showmigrations eksms_core | tail -15

# 5. Apply migrations
python eksms/manage.py migrate eksms_core

# 6. Verify column exists
python eksms/manage.py dbshell -c "SHOW COLUMNS FROM eksms_core_student WHERE Field='place_of_birth';"

# 7. Restart backend
sudo systemctl restart gunicorn

# 8. Verify running
sudo systemctl status gunicorn

# 9. Check logs
sudo journalctl -u gunicorn -n 20 --no-pager
```

---

## 🧪 Quick Verification Tests

```bash
# Get a token (replace with your credentials)
TOKEN=$(curl -s -X POST https://backend.pruhsms.africa/api/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your_password"}' \
  | grep -o '"token":"[^"]*' | cut -d'"' -f4)

# Test endpoint 1
curl -H "Authorization: Bearer $TOKEN" \
  https://backend.pruhsms.africa/api/grade-alerts/

# Test endpoint 2
curl -H "Authorization: Bearer $TOKEN" \
  https://backend.pruhsms.africa/api/users/

# Check CSP headers
curl -I -H "Authorization: Bearer $TOKEN" \
  https://backend.pruhsms.africa/api/users/ | grep -i "content-security-policy"
```

---

## 🔍 Troubleshooting

```bash
# Check if migrations are pending
python eksms/manage.py showmigrations eksms_core --plan | grep -E "0029|0030|0031"
# Should all show: [X]

# If not applied, run with verbose output
python eksms/manage.py migrate eksms_core 0029 --verbosity 3

# Check migration file exists
ls -la eksms/eksms_core/migrations/0029_add_student_extended_fields.py

# Database connection test
python eksms/manage.py dbshell -c "SELECT VERSION();"

# Verify column was created
python eksms/manage.py shell
>>> from eksms_core.models import Student
>>> Student._meta.get_field('place_of_birth')
# Should return field object, not error
```

---

## 🔐 CSP Verification

```bash
# Check middleware has blob: support
grep "blob:" eksms/eksms/middleware.py

# Check settings has CSP config
grep "CSP_SCRIPT_SRC" eksms/eksms/settings.py

# Verify in HTTP response
curl -s -I -H "Authorization: Bearer TOKEN" \
  https://backend.pruhsms.africa/api/users/ \
  | grep -A2 "Content-Security-Policy"
```

---

## 📊 Monitoring After Deployment

```bash
# Watch logs for errors
tail -f /var/log/gunicorn/error.log

# Or with systemd
sudo journalctl -u gunicorn -f

# Monitor performance
python eksms/manage.py shell
>>> from django.db import connection
>>> from eksms_core.models import Student
>>> list(Student.objects.values('place_of_birth').all())
# Should complete in < 1 second

# Database stats
python eksms/manage.py dbshell -c "SHOW PROCESSLIST;"
```

---

## 🔄 Rollback (If Needed)

```bash
# Option 1: Quick rollback (manual revert)
cd eksms/eksms
git checkout middleware.py settings.py
sudo systemctl restart gunicorn

# Option 2: Full rollback to previous commit
git reset --hard HEAD~1
sudo systemctl restart gunicorn

# Option 3: Just revert migrations
python eksms/manage.py migrate eksms_core 0028
```

---

## 🎯 Critical Files to Check

```bash
# Ensure these files were modified
ls -la eksms/eksms/middleware.py    # Should be updated with blob: and unsafe-eval
ls -la eksms/eksms/settings.py      # Should have CSP config added

# Check migration file exists
ls -la eksms/eksms_core/migrations/0029_add_student_extended_fields.py

# Verify web server config
cat /etc/nginx/sites-available/ek-sms  # If using nginx
# or
cat /etc/systemd/system/gunicorn.service  # If using systemd
```

---

## 📱 Before & After Comparison

| Check | Before ❌ | After ✅ |
|-------|-----------|----------|
| `/api/grade-alerts/` | 500 Error | 200 OK |
| `/api/users/` | 500 Error | 200 OK |
| place_of_birth column | Missing | Exists |
| CSP blob: support | No | Yes |
| Browser console errors | Many CSP errors | No CSP errors |

---

## ⏱️ Expected Downtime

- **Total Time**: 2-3 minutes
- **Steps**: 5-10 minutes
- **Verification**: 5 minutes

**Can be done during low-traffic hours without impact to users.**

---

## 📞 Emergency Contacts

If something goes wrong:
1. Check error log: `tail -f /var/log/gunicorn/error.log`
2. Revert: `git checkout middleware.py settings.py && sudo systemctl restart gunicorn`
3. Contact: Your DevOps/Backend team

---

## ✅ Pre-Deployment Checklist

- [ ] SSH access to Ubuntu server confirmed
- [ ] Virtual environment exists and can be activated
- [ ] Django management commands work: `python eksms/manage.py --version`
- [ ] Database connection works: `python eksms/manage.py dbshell`
- [ ] Gunicorn service exists: `sudo systemctl status gunicorn`
- [ ] Low-traffic window selected for deployment
- [ ] Monitoring/logging set up and ready
- [ ] Rollback plan understood

---

## 📌 Remember

1. **Always activate venv first**: `source venv/bin/activate`
2. **Always restart after changes**: `sudo systemctl restart gunicorn`
3. **Always verify**: `python eksms/manage.py showmigrations`
4. **Never skip migrations**: They're required for the app to work
5. **Check logs first**: Most issues visible in `/var/log/gunicorn/error.log`

---

Last Updated: 2026-05-06
Ready for Production Deployment
