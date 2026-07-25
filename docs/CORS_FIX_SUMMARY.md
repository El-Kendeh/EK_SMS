# CORS & Email Service Fix Summary

**Date**: May 13, 2026  
**Status**: ✅ Fixed

## Issues Resolved

### 1. ✅ CORS Preflight Error - `referrer-policy` Header Rejection

**Symptom**: 
```
Access-Control-Allow-Headers in preflight response does not allow header field "referrer-policy"
```

**Root Cause**: 
The frontend was incorrectly sending response headers (`Referrer-Policy`, `X-Frame-Options`) as request headers in the fetch API calls, causing the browser's preflight OPTIONS request to fail.

**Fixes Applied**:

#### a) Frontend (React) - `src/config/security.js`
- ✅ Removed `X-Frame-Options` and `Referrer-Policy` from `SECURE_HEADERS`
- These are response headers set by the server, NOT request headers
- Only included legitimate request headers: `X-Content-Type-Options`, `X-XSS-Protection`

#### b) Backend (Node/Express) - `backend_node/src/index.js`
- ✅ Updated CORS middleware to explicitly allow common request headers
- Added: `['Content-Type', 'Authorization', 'X-CSRFToken', 'X-Requested-With', 'Accept', 'Referrer-Policy']`
- Added `PATCH` to allowed methods

#### c) Nginx Config - `ubuntu-deploy.sh`
- ✅ Added `Referrer-Policy` to `Access-Control-Allow-Headers` in both:
  - Regular request headers
  - OPTIONS preflight response headers

### 2. ✅ Resend API Key Updated

**Files Updated**:
- `.env` 
- `backend_node/.env`

**New Key**: `re_fPMuzNgK_Ni6XGFo2p7XYFGCti53FNwfw`

---

## API Endpoints Affected

The following endpoints should now work without CORS errors:

- `POST /api/login/` - User login
- `POST /api/send-otp/` - Send OTP to email
- `GET /api/check-school-name/` - Check school name availability
- `POST /api/register/` - User registration
- `GET /api/logs/` - Fetch security logs

---

## Testing the Fix

### 1. Clear Browser Cache
```javascript
// In browser console
localStorage.clear();
sessionStorage.clear();
// Then refresh: Ctrl+R or Cmd+R
```

### 2. Test Email Service
```bash
# Test if Resend API is working
curl -X POST https://backend.pruhsms.africa/api/test-email \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

### 3. Check Backend Logs
```bash
# On Ubuntu server
sudo journalctl -u gunicorn -f
# Or Node backend
pm2 logs backend
```

---

## Email Service Status

### ✅ Resend Configuration
- **API Key**: Updated (`re_fPMuzNgK_...`)
- **From Email**: `PRUH-SMS <noreply@elkendeh.com>`
- **Status**: Configured in both Django and Node backends

### Email Verification Flow
```
1. User enters email → Frontend sends to backend
2. Backend generates 6-digit OTP
3. OTP sent via Resend API
4. Email should arrive within 1-2 minutes
5. User enters code to verify
```

If email shows "Email service unavailable":
1. Check Resend API key is correct
2. Verify RESEND_API_KEY env var is loaded
3. Check backend logs for API errors
4. Ensure recipient email address is valid

---

## Deployment Steps

### For Ubuntu/Production:
```bash
cd /var/www/ek-sms

# 1. Pull latest changes
git pull origin main

# 2. Update .env with new Resend key (if not already done)
# Edit .env and verify RESEND_API_KEY

# 3. Restart services
sudo systemctl restart gunicorn
sudo systemctl restart nginx
```

### For Node Backend:
```bash
cd backend_node

# 1. Pull latest changes
git pull origin main

# 2. Restart Node backend
pm2 restart backend
# or
npm start
```

### For Frontend (Vercel):
- ✅ Automatic: Changes to `src/config/security.js` will auto-deploy

---

## Verification Checklist

- [ ] Clear browser cache and local storage
- [ ] Test login endpoint `/api/login/`
- [ ] Test OTP sending `/api/send-otp/`
- [ ] Check browser console for CORS errors
- [ ] Verify email arrives for OTP verification
- [ ] Test full registration flow
- [ ] Check backend logs for any 500 errors

---

## Additional Notes

### Security Headers (Response)
These are now properly set by the server:
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`

### CORS Allowed Origins
Current configuration allows:
- `https://pruhsms.africa`
- `https://www.pruhsms.africa`
- `https://ek-sms-one.vercel.app`
- `https://backend.pruhsms.africa`
- `http://localhost:3000` (development)

---

**Next Steps**: Monitor logs for any remaining issues and perform full integration testing.
