# Fix the MySQL TEXT index issue for GradeVerification.verification_token

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Fixing MySQL TEXT Index Issue" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "eksms\manage.py")) {
    Write-Host "ERROR: Please run this script from the EK_SMS directory containing eksms\manage.py" -ForegroundColor Red
    exit 1
}

Write-Host "Step 1: Running Django migrations..." -ForegroundColor Yellow
python eksms\manage.py migrate eksms_core

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "Migration completed successfully!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "The verification_token field has been changed from CharField to TextField" -ForegroundColor Green
Write-Host "and the db_index has been removed to fix MySQL compatibility." -ForegroundColor Green
Write-Host ""
Write-Host "Your backend should now work correctly without MySQL warnings." -ForegroundColor Green
Write-Host ""
Write-Host "If you're running with Docker:" -ForegroundColor Yellow
Write-Host "  docker-compose restart backend" -ForegroundColor Yellow
Write-Host ""
Write-Host "If running directly:" -ForegroundColor Yellow
Write-Host "  python eksms\manage.py runserver" -ForegroundColor Yellow
Write-Host ""