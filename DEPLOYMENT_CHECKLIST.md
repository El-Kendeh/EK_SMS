# 📋 DEPLOYMENT CHECKLIST - EK-SMS OTP Configuration

**Quick Status**: ✅ All fixes complete and verified

---

## Pre-Deployment (Do This First)

### Step 1: Get Resend API Key
- [ ] Go to https://resend.com
- [ ] Sign up or log in
- [ ] Navigate to API Keys section
- [ ] Create new API key
- [ ] Copy key (format: `re_xxxxxxxxxxxx`)
- [ ] Keep it safe (you'll need it for .env)

### Step 2: Verify Resend Domain
- [ ] In Resend dashboard, go to **Domains**
- [ ] Add domain: `elkendeh.com`
- [ ] Follow DNS verification instructions
- [ ] Add DKIM, SPF, DMARC records to domain DNS
- [ ] Wait for verification (usually 5-10 minutes)
- [ ] Confirm verified in Resend dashboard

### Step 3: Review Code Changes
- [ ] Open `COMPLETE_FIX_SUMMARY.md`
- [ ] Review what was changed
- [ ] Review OTP flow
- [ ] Understand CORS configuration

---

## Ubuntu Server Setup

### Step 4: Connect to Ubuntu Server
```bash
ssh user@backend.pruhsms.africa
```

### Step 5: Navigate to Project
```bash
cd /var/www/ek-sms/eksms
```

### Step 6: Create .env File
```bash
sudo nano .env
```

Paste the following and replace placeholders:
```env
# === DJANGO CORE ===
DEBUG=False
SECRET_KEY=generate-a-50-char-random-string-here-with-symbols123!@#
DJANGO_SETTINGS_MODULE=eksms.settings_secure

# === SERVER ===
ALLOWED_HOSTS=backend.pruhsms.africa,localhost,127.0.0.1,www.backend.pruhsms.africa
CORS_ALLOWED_ORIGINS=https://ek-sms-one.vercel.app,https://backend.pruhsms.africa,https://pruhsms.africa,https://www.pruhsms.africa

# === DATABASE ===
DATABASE_TYPE=sqlite3

# === EMAIL SERVICE (RESEND) ===
RESEND_API_KEY=re_paste_your_api_key_here
DEFAULT_FROM_EMAIL=EK-SMS <noreply@elkendeh.com>
OTP_EXPIRY_MINUTES=10

# === SECURITY ===
SECURE_SSL_REDIRECT=True
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=False
SECURE_HSTS_SECONDS=31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS=True

# === PYTHON ===
PYTHONUNBUFFERED=1
```

Save: `Ctrl+X`, then `Y`, then `Enter`

### Step 7: Set Permissions
```bash
sudo chmod 600 .env
sudo chown www-data:www-data .env
```

### Step 8: Activate Virtual Environment
```bash
source venv/bin/activate
```

### Step 9: Install/Update Dependencies
```bash
pip install --upgrade pip setuptools wheel
pip install -r requirements.txt
```

This now includes `resend==0.7.0`

### Step 10: Run Migrations
```bash
python manage.py migrate --settings=eksms.settings_secure
```

### Step 11: Collect Static Files
```bash
python manage.py collectstatic --noinput --settings=eksms.settings_secure
```

### Step 12: Create Superuser (Optional, if not exists)
```bash
python manage.py createsuperuser --settings=eksms.settings_secure
```

---

## Service Configuration

### Step 13: Verify Gunicorn Service
```bash
sudo systemctl status eksms
```

If not running:
```bash
sudo systemctl restart eksms
```

### Step 14: Verify Gunicorn is Enabled
```bash
sudo systemctl enable eksms
```

### Step 15: Restart Nginx
```bash
sudo systemctl restart nginx
```

---

## Testing Phase

### Step 16: Verify All Services Running
```bash
sudo systemctl status eksms
sudo systemctl status nginx
```

Both should show `active (running)` - if not, run:
```bash
sudo systemctl restart eksms
sudo systemctl restart nginx
```

### Step 17: Test OTP Endpoint (From Ubuntu Terminal)
```bash
curl -X POST https://backend.pruhsms.africa/api/send-otp/ \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}' \
  -k  # -k ignores SSL self-signed issues
```

Expected response:
```json
{"success": true, "message": "...sent to your email", "expires_in": 600}
```

### Step 18: Test CORS Headers
```bash
curl -i -X OPTIONS \
  -H "Origin: https://ek-sms-one.vercel.app" \
  -H "Access-Control-Request-Method: POST" \
  https://backend.pruhsms.africa/api/send-otp/
```

Look for:
```
Access-Control-Allow-Origin: https://ek-sms-one.vercel.app
```

### Step 19: Check Django Logs
```bash
tail -f /var/www/ek-sms/eksms/logs/django.log
```

Should see normal operations, no errors

### Step 20: Test from Browser
1. Open https://ek-sms-one.vercel.app (Vercel frontend)
2. Click "Register Your School"
3. Fill out registration form (at least Steps 1-6)
4. Continue to "Verify Email" step
5. Click "Send Code"
6. Check your email inbox for OTP
7. If received: ✅ Email working!
8. If not received: Check RESEND_API_KEY and logs

---

## Full Registration Test

### Step 21: Complete Registration Flow

1. **Fill Registration Form** (Vercel)
   - Institution name
   - Admin username
   - Admin email (must be accessible)
   - Password
   - Phone number
   - Institution details

2. **Send OTP** (Step 7)
   - Click "Send Code"
   - Should see success message

3. **Receive Email**
   - Check inbox (may take 1-2 seconds)
   - Look for "Your EK-SMS Verification Code"
   - Copy 6-digit code

4. **Verify OTP**
   - Paste code into input field
   - Click "Verify"
   - Should see success

5. **Submit Registration**
   - Click "Submit Registration"
   - Should see "Application Received!"

6. **Check Admin**
   - Go to Django admin: `https://backend.pruhsms.africa/admin/`
   - Login with superuser
   - Go to Schools section
   - Should see new school with `is_approved = False`

✅ **If all above works**: Registration system is fully functional!

---

## Troubleshooting

### Issue: OTP email not received

**Check 1**: Resend API key valid
```bash
grep RESEND_API_KEY /var/www/ek-sms/eksms/.env
```
Should show: `re_xxxxxxxxxxxx` (real key)

**Check 2**: View Django logs for errors
```bash
tail -f /var/www/ek-sms/eksms/logs/django.log | grep -i "otp\|email\|resend"
```

**Check 3**: Test Resend API directly
```bash
python manage.py shell --settings=eksms.settings_secure
```
Then in shell:
```python
import resend
from django.conf import settings

resend.api_key = settings.RESEND_API_KEY

result = resend.Emails.send({
    "from": settings.DEFAULT_FROM_EMAIL,
    "to": ["your-email@example.com"],
    "subject": "Test",
    "html": "<p>Test</p>"
})

print(f"Sent: {result['id']}")
```

### Issue: CORS errors

**Check 1**: Domain is in CORS_ALLOWED_ORIGINS
```bash
grep CORS_ALLOWED_ORIGINS /var/www/ek-sms/eksms/.env
```
Should include: `https://ek-sms-one.vercel.app`

**Check 2**: Restart services
```bash
sudo systemctl restart eksms
```

**Check 3**: Test with curl
```bash
curl -i -X OPTIONS -H "Origin: https://ek-sms-one.vercel.app" \
  https://backend.pruhsms.africa/api/send-otp/
```

### Issue: 429 Rate Limit

**This is normal!** User tried to resend OTP too soon.
- Need to wait 60 seconds between resend requests
- Frontend should display countdown timer

### Issue: Cooldown error on resend

Click "Resend Code" again after 60 seconds.

---

## Production Verification

### Step 22: Final Security Check

```bash
# 1. Check DEBUG is False
grep "^DEBUG" /var/www/ek-sms/eksms/.env
# Should show: DEBUG=False

# 2. Check SECRET_KEY is strong
grep "^SECRET_KEY" /var/www/ek-sms/eksms/.env
# Should be 50+ characters with symbols

# 3. Check SSL is enabled
grep "SECURE_SSL_REDIRECT" /var/www/ek-sms/eksms/.env
# Should show: SECURE_SSL_REDIRECT=True

# 4. Check HSTS enabled
grep "SECURE_HSTS_SECONDS" /var/www/ek-sms/eksms/.env
# Should show: SECURE_HSTS_SECONDS=31536000
```

### Step 23: Monitor Logs

```bash
# Watch Django logs
sudo tail -f /var/www/ek-sms/eksms/logs/django.log

# In separate terminal, test registration
curl -X POST https://backend.pruhsms.africa/api/register/ \
  -H "Content-Type: application/json" \
  -d '{...registration data...}'
```

Should see entries in log, no errors

### Step 24: Test Email Delivery

```bash
# Check Resend dashboard for email delivery stats
# Open https://dashboard.resend.com/emails
# Filter by date (today)
# Should see OTP emails being sent successfully
```

---

## Daily Operations

### Monitoring the System

**Check service status**:
```bash
sudo systemctl status eksms
sudo systemctl status nginx
```

**View recent logs**:
```bash
tail -50 /var/www/ek-sms/eksms/logs/django.log
```

**Check Resend API usage**:
```bash
# Check Resend dashboard at https://dashboard.resend.com
# View API calls, deliveries, bounces, etc.
```

**Restart if needed**:
```bash
sudo systemctl restart eksms
# Wait 5 seconds
sudo systemctl status eksms
```

---

## Rollback (If Something Goes Wrong)

### Restore from Backup
```bash
# Stop service
sudo systemctl stop eksms

# Restore .env backup
sudo cp /var/www/ek-sms/eksms/.env.backup /var/www/ek-sms/eksms/.env

# Restore code (git only)
cd /var/www/ek-sms
sudo git checkout eksms/eksms/views.py

# Restart
sudo systemctl start eksms
```

### Emergency Disable OTP
If OTP is causing issues:
```bash
sudo nano /var/www/ek-sms/eksms/.env
# Comment out: RESEND_API_KEY=...
# Save and exit

# Restart
sudo systemctl restart eksms
```

OTP will return "Email service not configured" but registration can continue.

---

## Success Indicators

✅ **All of these should be true**:

- [ ] Django system check passes: `python manage.py check`
- [ ] Services running: `systemctl status eksms` shows active
- [ ] OTP endpoint responds: curl returns success
- [ ] CORS headers present: curl shows Access-Control-Allow-Origin
- [ ] Resend API key valid: No errors in logs
- [ ] Email sends successfully: Test email received
- [ ] Full registration works: Can complete from frontend to success screen
- [ ] No errors in logs: `tail -f django.log` shows clean operations
- [ ] Database records created: School/User/SchoolAdmin created
- [ ] Admin can see school: In Django admin Schools list

---

## Quick Reference Commands

```bash
# Test OTP send
curl -X POST https://backend.pruhsms.africa/api/send-otp/ \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# Check service status
sudo systemctl status eksms

# View logs (last 50 lines)
tail -50 /var/www/ek-sms/eksms/logs/django.log

# Restart service
sudo systemctl restart eksms

# Check .env is correct
cat /var/www/ek-sms/eksms/.env

# Test Django setup
python manage.py check --settings=eksms.settings_secure

# Drop into Python shell
python manage.py shell --settings=eksms.settings_secure
```

---

## Support Documents

**See these files for help**:
- `UBUNTU_ENV_SETUP.md` - Complete guide (11 sections)
- `OTP_INTEGRATION_SUMMARY.md` - Integration details
- `COMPLETE_FIX_SUMMARY.md` - What was changed
- `VERIFICATION_REPORT.md` - What's verified

---

## Next Steps After Deployment

1. **Announce to users**: System ready for registration
2. **Monitor registrations**: Track in Django admin
3. **Review approvals**: Superadmin approves schools
4. **Send approval emails**: Notify admins when approved
5. **Monitor Resend**: Watch email delivery stats

---

**Deployment Time**: ~30 minutes total  
**Testing Time**: ~10 minutes  
**Rollback Time**: ~5 minutes (if needed)

---

**🎯 Goal**: Get from this checklist to ✅ all items checked

**Questions?** See support documents above or check logs when troubleshooting.
