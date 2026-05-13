#!/bin/bash
# QUICK FIX - Run this immediately on your Ubuntu server
# This is the fastest way to fix the UserToken column error

echo "Quick Fix: UserToken token_type Column"
echo "========================================"

# Navigate to project
cd /path/to/ek-sms  # ← Replace with your actual project path

# Run the migration
python eksms/manage.py migrate eksms_core

# Restart backend
echo "Restarting backend..."
# Choose one based on your setup:

# If using Docker:
# docker-compose restart backend

# If using systemd:
# sudo systemctl restart ek-sms-backend

# If running directly:
# pkill -f "python eksms/manage.py runserver"
# python eksms/manage.py runserver

echo "✓ Done! Try accessing your app now."
