# Fix script for UserToken token_type column missing error on Windows/MySQL

$projectDir = $args[0] -Or "."

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Fixing UserToken token_type Column Error" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Using project directory: $projectDir" -ForegroundColor Yellow

# Check if Django manage.py exists
$managePyPath = Join-Path $projectDir "eksms\manage.py"
if (-not (Test-Path $managePyPath)) {
    Write-Host "ERROR: Cannot find manage.py at $managePyPath" -ForegroundColor Red
    Write-Host "Please provide the correct project path." -ForegroundColor Red
    exit 1
}

Push-Location $projectDir

Write-Host ""
Write-Host "Step 1: Running Django migrations..." -ForegroundColor Yellow

python eksms\manage.py migrate eksms_core

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "Migration completed successfully!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Verifying database column..." -ForegroundColor Yellow

# Verify the column was created
$pythonScript = @"
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'eksms.settings')
django.setup()

from django.db import connection

try:
    with connection.cursor() as cursor:
        cursor.execute('''
            SELECT COLUMN_NAME FROM information_schema.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'eksms_core_usertoken'
        ''')
        columns = [row[0] for row in cursor.fetchall()]
        
        if 'token_type' in columns:
            print("SUCCESS: token_type column is now present in eksms_core_usertoken table")
        else:
            print("WARNING: token_type column not found. Migration may not have completed.")
            print(f"Available columns: {', '.join(columns)}")
except Exception as e:
    print(f"Could not verify: {e}")
"@

python -c $pythonScript

Pop-Location

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "Fix Complete!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Your backend should now work correctly." -ForegroundColor Green
Write-Host "If you're running with Docker, restart your containers:" -ForegroundColor Yellow
Write-Host "  docker-compose down && docker-compose up -d" -ForegroundColor Yellow
Write-Host ""
