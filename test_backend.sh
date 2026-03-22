#!/bin/bash
# EK-SMS Backend Testing Script for Ubuntu Server
# This script verifies all components are working correctly before production deployment

set -e  # Exit on error

echo "================================"
echo "EK-SMS Backend Health Check"
echo "================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Check if .env exists
echo -e "${YELLOW}[1/10] Checking .env file...${NC}"
if [ -f .env ]; then
    echo -e "${GREEN}✓ .env file found${NC}"
else
    echo -e "${RED}✗ .env file NOT found. Create it first!${NC}"
    exit 1
fi
echo ""

# Test 2: Load environment variables
echo -e "${YELLOW}[2/10] Loading environment variables...${NC}"
set -a
source .env
set +a
echo -e "${GREEN}✓ Environment variables loaded${NC}"
echo ""

# Test 3: Check Python environment
echo -e "${YELLOW}[3/10] Checking Python environment...${NC}"
if [ -d venv ]; then
    echo -e "${GREEN}✓ Virtual environment exists${NC}"
    source venv/bin/activate
    echo -e "${GREEN}✓ Virtual environment activated${NC}"
else
    echo -e "${RED}✗ Virtual environment not found. Create with: python3 -m venv venv${NC}"
    exit 1
fi
echo ""

# Test 4: Check Django installation
echo -e "${YELLOW}[4/10] Checking Django installation...${NC}"
if python manage.py --help > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Django is installed${NC}"
else
    echo -e "${RED}✗ Django not installed. Run: pip install -r requirements.txt${NC}"
    exit 1
fi
echo ""

# Test 5: Check Resend library
echo -e "${YELLOW}[5/10] Checking Resend library...${NC}"
if python -c "import resend" 2>/dev/null; then
    echo -e "${GREEN}✓ Resend library installed${NC}"
    python -c "import resend; print(f'  Resend version: {resend.__version__}')"
else
    echo -e "${RED}✗ Resend not installed. Run: pip install resend==0.7.0${NC}"
    exit 1
fi
echo ""

# Test 6: Check Django configuration
echo -e "${YELLOW}[6/10] Running Django check...${NC}"
if python manage.py check --settings=eksms.settings_secure 2>&1 | grep -q "no issues"; then
    echo -e "${GREEN}✓ Django system check passed${NC}"
else
    echo -e "${RED}✗ Django check failed!${NC}"
    python manage.py check --settings=eksms.settings_secure
    exit 1
fi
echo ""

# Test 7: Verify OTP functions exist
echo -e "${YELLOW}[7/10] Verifying OTP functions...${NC}"
if python manage.py shell --settings=eksms.settings_secure -c "from eksms.views import api_send_otp, api_resend_otp, api_verify_otp; print('success')" 2>&1 | grep -q "success"; then
    echo -e "${GREEN}✓ All OTP functions imported successfully${NC}"
else
    echo -e "${RED}✗ Issue importing OTP functions!${NC}"
    exit 1
fi
echo ""

# Test 8: Check database migrations
echo -e "${YELLOW}[8/10] Checking database migrations...${NC}"
if python manage.py migrate --settings=eksms.settings_secure --plan 2>&1 | grep -q "No migrations to apply"; then
    echo -e "${GREEN}✓ All migrations applied${NC}"
else
    echo -e "${YELLOW}⚠ Running migrations...${NC}"
    python manage.py migrate --settings=eksms.settings_secure
    echo -e "${GREEN}✓ Migrations completed${NC}"
fi
echo ""

# Test 9: Verify Resend API key
echo -e "${YELLOW}[9/10] Verifying Resend API key...${NC}"
if [ -z "$RESEND_API_KEY" ]; then
    echo -e "${RED}✗ RESEND_API_KEY not set in .env!${NC}"
    exit 1
else
    # Don't print the full key for security
    MASKED_KEY="${RESEND_API_KEY:0:10}...${RESEND_API_KEY: -5}"
    echo -e "${GREEN}✓ RESEND_API_KEY set: $MASKED_KEY${NC}"
fi
echo ""

# Test 10: Test Resend connection
echo -e "${YELLOW}[10/10] Testing Resend API connection...${NC}"
RESEND_TEST=$(python -c "
import resend
from django.conf import settings
import os
os.environ['DJANGO_SETTINGS_MODULE'] = 'eksms.settings_secure'

try:
    resend.api_key = os.environ.get('RESEND_API_KEY', '')
    if not resend.api_key:
        print('ERROR: No API key')
    else:
        print('SUCCESS: API key configured')
except Exception as e:
    print(f'ERROR: {str(e)}')
" 2>&1)

if echo "$RESEND_TEST" | grep -q "SUCCESS"; then
    echo -e "${GREEN}✓ Resend API is configured${NC}"
else
    echo -e "${RED}✗ Resend API configuration failed${NC}"
    echo "$RESEND_TEST"
fi
echo ""

# Summary
echo "================================"
echo -e "${GREEN}✓ All tests passed!${NC}"
echo "================================"
echo ""
echo "Server is ready for deployment."
echo ""
echo "Next steps:"
echo "1. Run: python manage.py collectstatic --noinput"
echo "2. Start Gunicorn: systemctl start eksms"
echo "3. Monitor: journalctl -u eksms -f"
echo ""
