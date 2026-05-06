# Database Migration Fix Script for Windows
# Run this in PowerShell to fix the database schema

Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "EK-SMS Database Migration Fix Script (Windows)" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Check if Django project exists
if (-Not (Test-Path "eksms\manage.py")) {
    Write-Host "ERROR: manage.py not found!" -ForegroundColor Red
    Write-Host "Please run this script from the project root directory"
    exit 1
}

Write-Host "Step 1: Activating Python virtual environment..." -ForegroundColor Yellow

if (Test-Path "venv\Scripts\Activate.ps1") {
    & "venv\Scripts\Activate.ps1"
    Write-Host "✓ Virtual environment activated" -ForegroundColor Green
} elseif (Test-Path ".venv\Scripts\Activate.ps1") {
    & ".venv\Scripts\Activate.ps1"
    Write-Host "✓ Virtual environment activated" -ForegroundColor Green
} else {
    Write-Host "ERROR: Virtual environment not found!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Step 2: Checking Django installation..." -ForegroundColor Yellow
python eksms\manage.py --version
Write-Host "✓ Django is installed" -ForegroundColor Green

Write-Host ""
Write-Host "Step 3: Showing migration status BEFORE..." -ForegroundColor Yellow
python eksms\manage.py showmigrations eksms_core | Select-Object -First 40

Write-Host ""
Write-Host "Step 4: Applying pending migrations..." -ForegroundColor Yellow
python eksms\manage.py migrate eksms_core --verbosity 2

Write-Host ""
Write-Host "Step 5: Showing migration status AFTER..." -ForegroundColor Yellow
python eksms\manage.py showmigrations eksms_core | Select-Object -First 40

Write-Host ""
Write-Host "Step 6: Verifying 'place_of_birth' column exists..." -ForegroundColor Yellow
python eksms\manage.py dbshell -c "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='eksms_core_student' AND COLUMN_NAME='place_of_birth';"

Write-Host ""
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "✓ Migration completed successfully!" -ForegroundColor Green
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Green

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Restart your Django application:"
Write-Host "   - If using gunicorn: sudo systemctl restart gunicorn"
Write-Host "   - If using Vercel: redeploy your application"
Write-Host ""
Write-Host "2. Test the API endpoints:"
Write-Host "   curl -H 'Authorization: Bearer YOUR_TOKEN' https://backend.pruhsms.africa/api/grade-alerts/"
Write-Host ""
Write-Host "3. Monitor logs for any errors"
Write-Host ""
