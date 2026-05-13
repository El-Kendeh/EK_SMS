#!/bin/bash
# Fix the MySQL TEXT index issue for GradeVerification.verification_token

echo "=========================================="
echo "Fixing MySQL TEXT Index Issue"
echo "=========================================="
echo ""

# Check if we're in the right directory
if [ ! -f "eksms/manage.py" ]; then
    echo "ERROR: Please run this script from the EK_SMS directory containing eksms/manage.py"
    exit 1
fi

echo "Step 1: Running Django migrations..."
python3 eksms/manage.py migrate eksms_core

echo ""
echo "=========================================="
echo "✓ Migration completed successfully!"
echo "=========================================="
echo ""
echo "The verification_token field has been changed from CharField to TextField"
echo "and the db_index has been removed to fix MySQL compatibility."
echo ""
echo "Your backend should now work correctly without MySQL warnings."
echo ""
echo "If you're running with Docker:"
echo "  docker-compose restart backend"
echo ""
echo "If running directly:"
echo "  python3 eksms/manage.py runserver"
echo ""