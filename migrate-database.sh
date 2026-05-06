#!/bin/bash
# Database Migration Fix Script for Ubuntu Backend
# Run this on your Ubuntu server to fix the database schema

set -e  # Exit on any error

echo "════════════════════════════════════════════════════════════════"
echo "EK-SMS Database Migration Fix Script"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Django project exists
if [ ! -f "eksms/manage.py" ]; then
    echo -e "${RED}ERROR: manage.py not found!${NC}"
    echo "Please run this script from the project root directory (where manage.py is located)"
    exit 1
fi

echo -e "${YELLOW}Step 1: Checking Python virtual environment...${NC}"
if [ -d "venv" ]; then
    source venv/bin/activate
    echo -e "${GREEN}✓ Virtual environment activated${NC}"
elif [ -d ".venv" ]; then
    source .venv/bin/activate
    echo -e "${GREEN}✓ Virtual environment activated${NC}"
else
    echo -e "${RED}ERROR: Virtual environment not found!${NC}"
    echo "Please activate your virtual environment first"
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 2: Checking Django installation...${NC}"
python eksms/manage.py --version
echo -e "${GREEN}✓ Django is installed${NC}"

echo ""
echo -e "${YELLOW}Step 3: Showing migration status BEFORE...${NC}"
python eksms/manage.py showmigrations eksms_core | head -40

echo ""
echo -e "${YELLOW}Step 4: Applying pending migrations...${NC}"
python eksms/manage.py migrate eksms_core --verbosity 2

echo ""
echo -e "${YELLOW}Step 5: Showing migration status AFTER...${NC}"
python eksms/manage.py showmigrations eksms_core | head -40

echo ""
echo -e "${YELLOW}Step 6: Verifying 'place_of_birth' column exists...${NC}"
python eksms/manage.py dbshell <<EOF
SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME='eksms_core_student' AND COLUMN_NAME='place_of_birth';
EOF

echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ Migration completed successfully!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"

echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Restart your Django application:"
echo "   - If using gunicorn: sudo systemctl restart gunicorn"
echo "   - If using Vercel: redeploy your application"
echo ""
echo "2. Test the API endpoints:"
echo "   curl -H 'Authorization: Bearer YOUR_TOKEN' https://backend.pruhsms.africa/api/grade-alerts/"
echo ""
echo "3. Monitor logs for any errors"
echo ""
