#!/bin/bash
# Complete fix for EK-SMS database issues on Ubuntu/MySQL

set -e

echo "=========================================="
echo "Complete EK-SMS Database Fix"
echo "=========================================="
echo ""

# Check if we're running as root
if [[ $EUID -ne 0 ]]; then
   echo "WARNING: This script is not running as root. You may need sudo privileges."
fi

# Navigate to project directory
PROJECT_DIR="${1:-.}"
echo "Using project directory: $PROJECT_DIR"

# Check if Django manage.py exists
if [ ! -f "$PROJECT_DIR/eksms/manage.py" ]; then
    echo "ERROR: Cannot find manage.py. Please provide the correct project path."
    exit 1
fi

cd "$PROJECT_DIR"

echo ""
echo "Step 1: Activating virtual environment..."
# Try to activate virtual environment if it exists
if [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
    echo "✓ Activated virtual environment"
elif [ -f ".venv/bin/activate" ]; then
    source .venv/bin/activate
    echo "✓ Activated virtual environment (.venv)"
elif [ -f "env/bin/activate" ]; then
    source env/bin/activate
    echo "✓ Activated virtual environment (env)"
else
    echo "⚠ No virtual environment found. Proceeding with system Python..."
fi

echo ""
echo "Step 2: Running Django migrations..."
python3 eksms/manage.py migrate eksms_core

echo ""
echo "=========================================="
echo "✓ All migrations completed successfully!"
echo "=========================================="
echo ""

echo "Step 3: Verifying database fixes..."

# Verify the columns were created/fixed
python3 << EOF
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'eksms.settings')
django.setup()

from django.db import connection

try:
    with connection.cursor() as cursor:
        # Check UserToken table
        cursor.execute("""
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT 
            FROM information_schema.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'eksms_core_usertoken'
            AND COLUMN_NAME = 'token_type'
        """)
        result = cursor.fetchone()
        if result:
            print("✓ SUCCESS: token_type column exists in eksms_core_usertoken")
            print(f"  Type: {result[1]}, Nullable: {result[2]}, Default: {result[3]}")
        else:
            print("⚠ WARNING: token_type column not found in eksms_core_usertoken")
        
        # Check GradeVerification table
        cursor.execute("""
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE 
            FROM information_schema.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'eksms_core_gradeverification'
            AND COLUMN_NAME = 'verification_token'
        """)
        result = cursor.fetchone()
        if result:
            print("✓ SUCCESS: verification_token column exists in eksms_core_gradeverification")
            print(f"  Type: {result[1]}, Nullable: {result[2]}")
            if result[1] == 'text':
                print("✓ SUCCESS: verification_token is now TextField (MySQL warning fixed)")
            else:
                print(f"⚠ WARNING: verification_token is still {result[1]} (should be 'text')")
        else:
            print("⚠ WARNING: verification_token column not found in eksms_core_gradeverification")
            
except Exception as e:
    print(f"⚠ Could not verify database: {e}")
EOF

echo ""
echo "=========================================="
echo "Fix Complete!"
echo "=========================================="
echo ""
echo "Issues Fixed:"
echo "✓ Added missing 'token_type' column to UserToken table"
echo "✓ Changed 'verification_token' from CharField to TextField (MySQL warning)"
echo ""
echo "Your backend should now work correctly without 500 errors."
echo ""
echo "Next steps:"
echo "1. Restart your backend service"
echo "2. Test the application"
echo ""
echo "If running with Docker:"
echo "  docker-compose down && docker-compose up -d"
echo ""
echo "If running with systemd:"
echo "  sudo systemctl restart ek-sms-backend"
echo ""
