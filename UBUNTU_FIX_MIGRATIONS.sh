#!/bin/bash

################################################################################
# EK-SMS DATABASE MIGRATION FIX SCRIPT
# Purpose: Apply missing migrations to fix 500 errors
# Run on: Ubuntu Server where Django backend is deployed
# Status: PRODUCTION-CRITICAL
################################################################################

set -e  # Exit on first error

echo "=============================================="
echo "EK-SMS Database Migration Fix"
echo "=============================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="/path/to/ek-sms"  # UPDATE THIS
VENV_DIR="$PROJECT_DIR/venv"
DJANGO_DIR="$PROJECT_DIR/eksms"
DB_NAME="eksms_db"

echo -e "${YELLOW}Step 1: Verify environment${NC}"
echo "========================================"

# Check if project directory exists
if [ ! -d "$PROJECT_DIR" ]; then
    echo -e "${RED}✗ Error: Project directory not found: $PROJECT_DIR${NC}"
    echo "  Please update PROJECT_DIR in this script"
    exit 1
fi

if [ ! -d "$VENV_DIR" ]; then
    echo -e "${RED}✗ Error: Virtual environment not found: $VENV_DIR${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Project directory found${NC}"
echo -e "${GREEN}✓ Virtual environment found${NC}"
echo ""

echo -e "${YELLOW}Step 2: Activate virtual environment${NC}"
echo "========================================"

cd "$PROJECT_DIR"
source "$VENV_DIR/bin/activate"
echo -e "${GREEN}✓ Virtual environment activated${NC}"
echo ""

echo -e "${YELLOW}Step 3: Check pending migrations${NC}"
echo "========================================"

cd "$DJANGO_DIR"
python manage.py showmigrations eksms_core | grep -E "\[|eksms_core" | tail -20
echo ""

echo -e "${YELLOW}Step 4: Show migration plan (DRY RUN)${NC}"
echo "========================================"
echo "This will show what will be applied without actually applying:"
echo ""

python manage.py migrate eksms_core --plan | tail -30
echo ""

echo -e "${YELLOW}Step 5: Check current database state${NC}"
echo "========================================"

python manage.py dbshell <<EOF
USE $DB_NAME;
SELECT COUNT(*) as total_columns FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME='eksms_core_student' AND TABLE_SCHEMA='$DB_NAME';
SHOW COLUMNS FROM eksms_core_student LIKE 'place_of_birth';
EOF

echo ""
echo -e "${YELLOW}Step 6: Backup database (RECOMMENDED)${NC}"
echo "========================================"

BACKUP_FILE="/tmp/eksms_db_backup_$(date +%Y%m%d_%H%M%S).sql"
echo "Creating backup at: $BACKUP_FILE"

# Get DB credentials from settings
DB_USER=$(python -c "from eksms.settings import DATABASES; print(DATABASES['default']['USER'])")
DB_PASSWORD=$(python -c "from eksms.settings import DATABASES; print(DATABASES['default']['PASSWORD'])")
DB_HOST=$(python -c "from eksms.settings import DATABASES; print(DATABASES['default']['HOST'])")
DB_PORT=$(python -c "from eksms.settings import DATABASES; print(DATABASES['default']['PORT'])")

# Set default port if not specified
DB_PORT=${DB_PORT:-3306}

mysqldump -u"$DB_USER" -p"$DB_PASSWORD" -h"$DB_HOST" -P"$DB_PORT" "$DB_NAME" > "$BACKUP_FILE"
echo -e "${GREEN}✓ Database backed up to: $BACKUP_FILE${NC}"
echo "  Keep this backup until you verify the fix works!"
echo ""

read -p "Ready to apply migrations? (yes/no): " -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Migration cancelled by user${NC}"
    exit 0
fi

echo -e "${YELLOW}Step 7: Apply migrations${NC}"
echo "========================================"

python manage.py migrate eksms_core --verbosity 2

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Migrations applied successfully${NC}"
else
    echo -e "${RED}✗ Migration failed!${NC}"
    echo "  Your database backup is at: $BACKUP_FILE"
    exit 1
fi
echo ""

echo -e "${YELLOW}Step 8: Verify column was created${NC}"
echo "========================================"

python manage.py dbshell <<EOF
USE $DB_NAME;
SHOW COLUMNS FROM eksms_core_student LIKE 'place_of_birth';
EOF

echo ""

echo -e "${YELLOW}Step 9: Test Django ORM access${NC}"
echo "========================================"

python manage.py shell <<EOF
from eksms_core.models import Student
import inspect

# Check if field exists in model
fields = {f.name for f in Student._meta.get_fields()}
if 'place_of_birth' in fields:
    print("✓ place_of_birth field exists in Django model")
else:
    print("✗ place_of_birth field NOT in Django model")

# Test query
try:
    count = Student.objects.count()
    sample = Student.objects.values('place_of_birth', 'first_name').first()
    if sample:
        print(f"✓ Can query place_of_birth - sample: {sample}")
    else:
        print("✓ Can query place_of_birth (no students yet)")
except Exception as e:
    print(f"✗ Error querying: {e}")
EOF

echo ""

echo -e "${YELLOW}Step 10: Restart Django application${NC}"
echo "========================================"

# Check which service is running
if systemctl is-active --quiet gunicorn; then
    echo "Restarting gunicorn..."
    sudo systemctl restart gunicorn
    sleep 3
    sudo systemctl status gunicorn
elif systemctl is-active --quiet ek-sms; then
    echo "Restarting ek-sms service..."
    sudo systemctl restart ek-sms
    sleep 3
    sudo systemctl status ek-sms
else
    echo -e "${YELLOW}Warning: Could not detect running Django service${NC}"
    echo "Please manually restart your Django application:"
    echo "  sudo systemctl restart gunicorn"
    echo "  OR"
    echo "  sudo systemctl restart ek-sms"
fi

echo ""

echo -e "${YELLOW}Step 11: Test API endpoints${NC}"
echo "========================================"

# Get a test token (you may need to adjust this)
echo "Testing API endpoints..."
echo "Note: You may need to manually test these with your actual token:"
echo ""
echo "  curl -H 'Authorization: Bearer YOUR_TOKEN' \\"
echo "       https://backend.pruhsms.africa/api/grade-alerts/"
echo ""
echo "  curl -H 'Authorization: Bearer YOUR_TOKEN' \\"
echo "       https://backend.pruhsms.africa/api/users/"
echo ""

echo ""
echo -e "${GREEN}=============================================="
echo "Migration Fix Complete!"
echo "===============================================${NC}"
echo ""
echo "✓ Database column 'place_of_birth' created"
echo "✓ Django application restarted"
echo ""
echo "Next Steps:"
echo "1. Test API endpoints in your browser DevTools console"
echo "2. Verify no more 500 errors for grade-alerts or users endpoints"
echo "3. Check for any CSP errors (will be handled separately)"
echo ""
echo "If issues persist:"
echo "  - Check logs: sudo journalctl -u gunicorn -n 50 --no-pager"
echo "  - Database backup: $BACKUP_FILE"
echo ""
