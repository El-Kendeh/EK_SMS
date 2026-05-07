#!/bin/bash
# Quick verification script for production deployment
# Run this after applying migrations

echo "=== EK-SMS Production Verification ==="
echo "Date: $(date)"
echo ""

# Check if we're in the right directory
if [ ! -f "manage.py" ]; then
    echo "ERROR: Not in Django project directory"
    echo "Please run this from your eksms project root"
    exit 1
fi

# Activate virtual environment
source venv/bin/activate 2>/dev/null || source /opt/venv/bin/activate 2>/dev/null || {
    echo "WARNING: Could not activate virtual environment"
    echo "Continuing without venv..."
}

# Set Django settings
export DJANGO_SETTINGS_MODULE=eksms.settings

echo "=== Migration Status ==="
python manage.py showmigrations eksms_core | grep -E "(0036|0037)"

echo ""
echo "=== Database Schema Check ==="
python manage.py dbshell << 'EOF' 2>/dev/null
SELECT
    'place_of_birth' as field,
    CASE WHEN EXISTS(
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'eksms_core_student'
        AND COLUMN_NAME = 'place_of_birth'
    ) THEN '✓ EXISTS' ELSE '✗ MISSING' END as status
UNION ALL
SELECT 'nationality',
    CASE WHEN EXISTS(
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'eksms_core_student'
        AND COLUMN_NAME = 'nationality'
    ) THEN '✓ EXISTS' ELSE '✗ MISSING' END
UNION ALL
SELECT 'religion',
    CASE WHEN EXISTS(
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'eksms_core_student'
        AND COLUMN_NAME = 'religion'
    ) THEN '✓ EXISTS' ELSE '✗ MISSING' END
UNION ALL
SELECT 'sen_tier',
    CASE WHEN EXISTS(
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'eksms_core_student'
        AND COLUMN_NAME = 'sen_tier'
    ) THEN '✓ EXISTS' ELSE '✗ MISSING' END
UNION ALL
SELECT 'is_critical_medical',
    CASE WHEN EXISTS(
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'eksms_core_student'
        AND COLUMN_NAME = 'is_critical_medical'
    ) THEN '✓ EXISTS' ELSE '✗ MISSING' END
UNION ALL
SELECT 'vaccinations',
    CASE WHEN EXISTS(
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'eksms_core_student'
        AND COLUMN_NAME = 'vaccinations'
    ) THEN '✓ EXISTS' ELSE '✗ MISSING' END;
EOF

echo ""
echo "=== Student Count Check ==="
python manage.py dbshell << 'EOF' 2>/dev/null
SELECT COUNT(*) as total_students FROM eksms_core_student;
EOF

echo ""
echo "=== API Health Check ==="
# Try to make a simple API call
if command -v curl >/dev/null 2>&1; then
    response=$(curl -s -w "HTTPSTATUS:%{http_code}" http://localhost:8000/api/school/students/ 2>/dev/null)
    http_code=$(echo $response | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
    if [ "$http_code" = "200" ]; then
        echo "✓ API responding (HTTP 200)"
    else
        echo "✗ API not responding (HTTP $http_code)"
        echo "Make sure your Django server is running"
    fi
else
    echo "curl not available - skipping API check"
fi

echo ""
echo "=== Summary ==="
echo "If all fields show '✓ EXISTS', migrations are applied correctly."
echo "If any show '✗ MISSING', run: python manage.py migrate eksms_core"
echo "Then restart your web server."