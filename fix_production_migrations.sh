#!/bin/bash
# EK-SMS Production Database Migration Fix
# Run this on your production server (backend.pruhsms.africa)

echo "=== EK-SMS Production Migration Fix ==="
echo "Date: $(date)"
echo "Server: $(hostname)"
echo ""

# Navigate to project directory
cd /path/to/your/eksms/project || {
    echo "ERROR: Cannot find eksms project directory"
    echo "Please update the path in this script"
    exit 1
}

echo "✓ Changed to project directory: $(pwd)"

# Activate virtual environment
source venv/bin/activate || source /opt/venv/bin/activate || {
    echo "ERROR: Cannot activate virtual environment"
    echo "Please check your virtual environment path"
    exit 1
}

echo "✓ Activated virtual environment"

# Check Django installation
python -c "import django; print(f'Django version: {django.get_version()}')" || {
    echo "ERROR: Django not found"
    exit 1
}

echo "✓ Django is available"

# Set Django settings
export DJANGO_SETTINGS_MODULE=eksms.settings

# Check database connection
echo "Checking database connection..."
python manage.py dbshell --command="SELECT 1;" > /dev/null 2>&1 || {
    echo "ERROR: Cannot connect to database"
    echo "Please check your database configuration"
    exit 1
}

echo "✓ Database connection OK"

# Show current migration status
echo ""
echo "=== Current Migration Status ==="
python manage.py showmigrations eksms_core

# Check if migrations are applied
echo ""
echo "=== Checking for Missing Columns ==="
python manage.py dbshell << 'EOF'
DESCRIBE eksms_core_student;
EOF

# Apply migrations
echo ""
echo "=== Applying Migrations ==="
python manage.py migrate eksms_core 0036
python manage.py migrate eksms_core 0037

# Verify migrations applied
echo ""
echo "=== Verification: New Columns ==="
python manage.py dbshell << 'EOF'
DESCRIBE eksms_core_student;
SELECT
    COUNT(*) as total_students,
    SUM(CASE WHEN place_of_birth IS NOT NULL THEN 1 ELSE 0 END) as with_place_of_birth,
    SUM(CASE WHEN nationality IS NOT NULL THEN 1 ELSE 0 END) as with_nationality,
    SUM(CASE WHEN religion IS NOT NULL THEN 1 ELSE 0 END) as with_religion,
    SUM(CASE WHEN sen_tier IS NOT NULL THEN 1 ELSE 0 END) as with_sen_tier,
    SUM(CASE WHEN is_critical_medical = 1 THEN 1 ELSE 0 END) as critical_medical,
    SUM(CASE WHEN vaccinations IS NOT NULL THEN 1 ELSE 0 END) as with_vaccinations
FROM eksms_core_student;
EOF

# Test API endpoint
echo ""
echo "=== Testing API Endpoint ==="
curl -s -o /dev/null -w "API Status: %{http_code}\n" http://localhost:8000/api/school/students/ || {
    echo "API test failed - please check if server is running"
}

echo ""
echo "=== Migration Complete ==="
echo "✓ All new fields should now be available"
echo "✓ Restart your Django application (Gunicorn/WSGI)"
echo ""
echo "Next steps:"
echo "1. Restart your web server"
echo "2. Clear browser cache (Ctrl+Shift+R)"
echo "3. Test student registration"
echo ""
echo "If issues persist, check Django logs for errors"