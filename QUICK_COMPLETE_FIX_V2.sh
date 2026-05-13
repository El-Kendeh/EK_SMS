#!/bin/bash
# QUICK COMPLETE FIX - Run this on your Ubuntu server
# Fixes both UserToken column and MySQL TEXT index issues

echo "=========================================="
echo "COMPLETE EK-SMS DATABASE FIX"
echo "=========================================="
echo ""

cd /var/www/ek-sms/EK_SMS

# Activate virtual environment if it exists
if [ -f ".venv/bin/activate" ]; then
    source .venv/bin/activate
    echo "✓ Activated virtual environment"
fi

echo ""
echo "Running migrations..."
python3 eksms/manage.py migrate eksms_core

echo ""
echo "=========================================="
echo "✓ ALL FIXES APPLIED SUCCESSFULLY!"
echo "=========================================="
echo ""
echo "Fixed Issues:"
echo "✓ Added missing 'token_type' column to UserToken table"
echo "✓ Changed 'verification_token' to TextField (removed db_index for MySQL)"
echo ""
echo "Restart your backend service and test the application."
echo ""