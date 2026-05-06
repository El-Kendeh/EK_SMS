#!/bin/bash

################################################################################
# QUICK MANUAL FIX - Copy-Paste Commands for Ubuntu Server
# Status: DO THIS NOW TO FIX THE 500 ERRORS
################################################################################

cat << 'EOF'

╔════════════════════════════════════════════════════════════════════════════╗
║                   EK-SMS CRITICAL FIX - RUN ON UBUNTU                      ║
║                  Missing Database Column "place_of_birth"                   ║
╚════════════════════════════════════════════════════════════════════════════╝

ISSUE: 
  500 Error: Unknown column 'eksms_core_student.place_of_birth' in 'field list'
  Affects: /api/grade-alerts/, /api/users/, /api/school/students/

ROOT CAUSE:
  The migration exists but hasn't been applied to the database

FIX TIME: ~5 minutes

═══════════════════════════════════════════════════════════════════════════════
STEP 1: SSH to your Ubuntu server
═══════════════════════════════════════════════════════════════════════════════

ssh your-user@your-server-ip
# Enter your password when prompted

═══════════════════════════════════════════════════════════════════════════════
STEP 2: Navigate to project and activate virtual environment
═══════════════════════════════════════════════════════════════════════════════

cd /path/to/ek-sms
source venv/bin/activate

# You should see (venv) at the start of your terminal prompt

═══════════════════════════════════════════════════════════════════════════════
STEP 3: Check what migrations are pending
═══════════════════════════════════════════════════════════════════════════════

cd eksms
python manage.py showmigrations eksms_core | tail -15

EXPECTED OUTPUT:
  You should see something like:
  [ ] 0029_add_student_extended_fields    ← This one is pending (not applied yet)

═══════════════════════════════════════════════════════════════════════════════
STEP 4: BACKUP DATABASE FIRST (CRITICAL!)
═══════════════════════════════════════════════════════════════════════════════

# Get credentials from Django settings
DB_USER=$(python -c "from eksms.settings import DATABASES; print(DATABASES['default']['USER'])")
DB_PASS=$(python -c "from eksms.settings import DATABASES; print(DATABASES['default']['PASSWORD'])")
DB_HOST=$(python -c "from eksms.settings import DATABASES; print(DATABASES['default']['HOST'])")

# Create backup
mysqldump -u"$DB_USER" -p"$DB_PASS" -h"$DB_HOST" eksms_db > /tmp/eksms_backup_$(date +%Y%m%d_%H%M%S).sql

# List backups
ls -lh /tmp/eksms_backup_*

SAVE THIS PATH! You need it if something goes wrong.

═══════════════════════════════════════════════════════════════════════════════
STEP 5: Apply the migration
═══════════════════════════════════════════════════════════════════════════════

python manage.py migrate eksms_core

EXPECTED OUTPUT:
  Running migrations:
    Applying eksms_core.0029_add_student_extended_fields... OK

═══════════════════════════════════════════════════════════════════════════════
STEP 6: Verify the column was created in MySQL
═══════════════════════════════════════════════════════════════════════════════

python manage.py dbshell

Then type:
  USE eksms_db;
  SHOW COLUMNS FROM eksms_core_student LIKE 'place_of_birth';
  exit

EXPECTED OUTPUT:
  Field          | Type         | Null | Key | Default | Extra
  place_of_birth | varchar(200) | YES  |     | NULL    |

═══════════════════════════════════════════════════════════════════════════════
STEP 7: Test Django can access the column
═══════════════════════════════════════════════════════════════════════════════

python manage.py shell

Then type:
  from eksms_core.models import Student
  Student.objects.values('place_of_birth').first()
  exit

EXPECTED OUTPUT:
  Should return data or None (not an error about unknown column)

═══════════════════════════════════════════════════════════════════════════════
STEP 8: Restart your Django application
═══════════════════════════════════════════════════════════════════════════════

If using Gunicorn:
  sudo systemctl restart gunicorn
  sudo systemctl status gunicorn
  sudo journalctl -u gunicorn -n 20 --no-pager

If using Systemd service:
  sudo systemctl restart ek-sms
  sudo systemctl status ek-sms
  sudo journalctl -u ek-sms -n 20 --no-pager

═══════════════════════════════════════════════════════════════════════════════
STEP 9: Test the API endpoints
═══════════════════════════════════════════════════════════════════════════════

# Get a login token first:
curl -X POST https://backend.pruhsms.africa/api/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"YOUR_PASSWORD"}'

# Save the token, then test:
TOKEN="your_token_from_above"

# Test grade-alerts (should return 200, not 500)
curl -H "Authorization: Bearer $TOKEN" \
  https://backend.pruhsms.africa/api/grade-alerts/

# Test users (should return 200, not 500)
curl -H "Authorization: Bearer $TOKEN" \
  https://backend.pruhsms.africa/api/users/

# Test students endpoint
curl -H "Authorization: Bearer $TOKEN" \
  https://backend.pruhsms.africa/api/school/students/ | head -100

EXPECTED: HTTP 200 responses with data, not 500 errors

═══════════════════════════════════════════════════════════════════════════════
STEP 10: Test in browser
═══════════════════════════════════════════════════════════════════════════════

1. Open https://ek-sms-one.vercel.app in your browser
2. Open Developer Tools (F12)
3. Go to Console tab
4. Refresh the page (Ctrl+R)
5. Look for errors:
   ✓ GOOD: No red CSP errors about "Unknown column"
   ✗ BAD: Red errors about 500 responses or unknown columns

═══════════════════════════════════════════════════════════════════════════════
IF SOMETHING GOES WRONG - ROLLBACK
═══════════════════════════════════════════════════════════════════════════════

# Restore from backup
mysql -u"$DB_USER" -p"$DB_PASS" -h"$DB_HOST" eksms_db < /tmp/eksms_backup_YOURDATE.sql

# Restart service
sudo systemctl restart gunicorn

═══════════════════════════════════════════════════════════════════════════════
VERIFICATION CHECKLIST
═══════════════════════════════════════════════════════════════════════════════

After migration is complete, verify these:

✓ Migration shows as applied:
  python manage.py showmigrations eksms_core | grep 0029
  Should show: [X] 0029_add_student_extended_fields

✓ Column exists in database:
  python manage.py dbshell
  SHOW COLUMNS FROM eksms_core_student WHERE Field='place_of_birth';
  (Should return 1 row, not empty set)

✓ No errors in logs:
  sudo journalctl -u gunicorn -n 50 --no-pager | grep -i error
  (Should be empty or only show old errors)

✓ API returns 200 (not 500):
  curl -H "Authorization: Bearer $TOKEN" https://backend.pruhsms.africa/api/grade-alerts/
  (Check HTTP status code at the start)

✓ No "Unknown column" errors in browser console
  Open browser DevTools → Console tab → No red CSP errors

═══════════════════════════════════════════════════════════════════════════════

DONE! Your 500 errors should be fixed.

Next: Check frontend for CSP violations (separate issue with headers)

Questions? Check logs with:
  sudo journalctl -u gunicorn -f  # Live log viewing

EOF
