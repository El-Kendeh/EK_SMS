#!/bin/bash
# Fix script for UserToken token_type column missing error on Ubuntu/MySQL

set -e

echo "=========================================="
echo "Fixing UserToken token_type Column Error"
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
echo "Step 1: Running Django migrations..."
python eksms/manage.py migrate eksms_core

echo ""
echo "=========================================="
echo "✓ Migration completed successfully!"
echo "=========================================="
echo ""
echo "Verifying database column..."

# Optional: Verify the column was created (MySQL only)
python3 << EOF
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'eksms.settings')
django.setup()

from django.db import connection

try:
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT COLUMN_NAME FROM information_schema.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'eksms_core_usertoken'
        """)
        columns = [row[0] for row in cursor.fetchall()]
        
        if 'token_type' in columns:
            print("✓ SUCCESS: token_type column is now present in eksms_core_usertoken table")
        else:
            print("⚠ WARNING: token_type column not found. Migration may not have completed.")
            print(f"Available columns: {', '.join(columns)}")
except Exception as e:
    print(f"⚠ Could not verify: {e}")
EOF

echo ""
echo "=========================================="
echo "Fix Complete!"
echo "=========================================="
echo ""
echo "Your backend should now work correctly."
echo "If you're running with Docker, restart your containers:"
echo "  docker-compose down && docker-compose up -d"
echo ""
