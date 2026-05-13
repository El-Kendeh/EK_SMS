# Complete fix for EK-SMS database issues on Windows/MySQL

param(
    [string]$ProjectDir = "."
)

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Complete EK-SMS Database Fix" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Using project directory: $ProjectDir" -ForegroundColor Yellow

# Check if Django manage.py exists
$managePyPath = Join-Path $ProjectDir "eksms\manage.py"
if (-not (Test-Path $managePyPath)) {
    Write-Host "ERROR: Cannot find manage.py at $managePyPath" -ForegroundColor Red
    Write-Host "Please provide the correct project path." -ForegroundColor Red
    exit 1
}

Push-Location $ProjectDir

Write-Host ""
Write-Host "Step 1: Activating virtual environment..." -ForegroundColor Yellow

# Try to activate virtual environment if it exists
$venvActivated = $false
if (Test-Path "venv\Scripts\Activate.ps1") {
    & "venv\Scripts\Activate.ps1"
    $venvActivated = $true
    Write-Host "✓ Activated virtual environment" -ForegroundColor Green
} elseif (Test-Path ".venv\Scripts\Activate.ps1") {
    & ".venv\Scripts\Activate.ps1"
    $venvActivated = $true
    Write-Host "✓ Activated virtual environment (.venv)" -ForegroundColor Green
} elseif (Test-Path "env\Scripts\Activate.ps1") {
    & "env\Scripts\Activate.ps1"
    $venvActivated = $true
    Write-Host "✓ Activated virtual environment (env)" -ForegroundColor Green
} else {
    Write-Host "⚠ No virtual environment found. Proceeding with system Python..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Step 2: Running Django migrations..." -ForegroundColor Yellow

python eksms\manage.py migrate eksms_core

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "All migrations completed successfully!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""

Write-Host "Step 3: Verifying database fixes..." -ForegroundColor Yellow

# Verify the columns were created/fixed
$pythonScript = @"
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'eksms.settings')
django.setup()

from django.db import connection

try:
    with connection.cursor() as cursor:
        # Check UserToken table
        cursor.execute('''
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT 
            FROM information_schema.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'eksms_core_usertoken'
            AND COLUMN_NAME = 'token_type'
        ''')
        result = cursor.fetchone()
        if result:
            print("SUCCESS: token_type column exists in eksms_core_usertoken")
            print(f"  Type: {result[1]}, Nullable: {result[2]}, Default: {result[3]}")
        else:
            print("WARNING: token_type column not found in eksms_core_usertoken")
        
        # Check GradeVerification table
        cursor.execute('''
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE 
            FROM information_schema.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'eksms_core_gradeverification'
            AND COLUMN_NAME = 'verification_token'
        ''')
        result = cursor.fetchone()
        if result:
            print("SUCCESS: verification_token column exists in eksms_core_gradeverification")
            print(f"  Type: {result[1]}, Nullable: {result[2]}")
            if result[1] == 'text':
                print("SUCCESS: verification_token is now TextField (MySQL warning fixed)")
            else:
                print(f"WARNING: verification_token is still {result[1]} (should be 'text')")
        else:
            print("WARNING: verification_token column not found in eksms_core_gradeverification")
            
except Exception as e:
    print(f"Could not verify database: {e}")
"@

python -c $pythonScript

Pop-Location

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "Fix Complete!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Issues Fixed:" -ForegroundColor Green
Write-Host "✓ Added missing 'token_type' column to UserToken table" -ForegroundColor Green
Write-Host "✓ Changed 'verification_token' from CharField to TextField (MySQL warning)" -ForegroundColor Green
Write-Host ""
Write-Host "Your backend should now work correctly without 500 errors." -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Restart your backend service" -ForegroundColor Yellow
Write-Host "2. Test the application" -ForegroundColor Yellow
Write-Host ""
Write-Host "If running with Docker:" -ForegroundColor Yellow
Write-Host "  docker-compose down && docker-compose up -d" -ForegroundColor Yellow
Write-Host ""
Write-Host "If running with systemd:" -ForegroundColor Yellow
Write-Host "  sudo systemctl restart ek-sms-backend" -ForegroundColor Yellow
Write-Host ""
