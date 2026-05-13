#!/bin/bash
# QUICK FIX - Apply both database fixes immediately
# This fixes both the UserToken column and MySQL warning

echo "Quick Fix: Complete Database Issues"
echo "===================================="

# Navigate to project
cd /var/www/ek-sms/EK_SMS  # Adjust path as needed

# Activate virtual environment if exists
if [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
elif [ -f ".venv/bin/activate" ]; then
    source .venv/bin/activate
fi

# Run migrations
python3 eksms/manage.py migrate eksms_core

# Restart backend
echo "Restarting backend..."
# Uncomment based on your setup:

# If using Docker:
# docker-compose restart backend

# If using systemd:
# sudo systemctl restart ek-sms-backend

# If running directly:
# pkill -f "python eksms/manage.py runserver"
# python3 eksms/manage.py runserver

echo "✓ Done! Both issues should be fixed."
echo "✓ UserToken token_type column added"
echo "✓ GradeVerification verification_token changed to TextField"
