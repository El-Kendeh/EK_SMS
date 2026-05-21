#!/usr/bin/env pwsh

# EK-SMS Complete Local Setup Script
# Usage: .\setup-local.ps1
# Windows PowerShell 5.1+

$ErrorActionPreference = "Stop"
$projectRoot = "c:\Users\Princess Magbie\Desktop\ek-sms"
$backendDir = "$projectRoot\backend_node"

Write-Host "================================" -ForegroundColor Cyan
Write-Host "🚀 EK-SMS LOCAL SETUP" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js
Write-Host "1️⃣  Checking Node.js..." -ForegroundColor Yellow
$nodeVersion = node --version
$npmVersion = npm --version
Write-Host "✅ Node.js: $nodeVersion" -ForegroundColor Green
Write-Host "✅ npm: $npmVersion" -ForegroundColor Green
Write-Host ""

# Check MySQL
Write-Host "2️⃣  Checking MySQL connection..." -ForegroundColor Yellow
try {
    $mysqlTest = & mysql -u root -p"elkinson" -e "SELECT 1;" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ MySQL is running and accessible" -ForegroundColor Green
    } else {
        Write-Host "❌ MySQL connection failed" -ForegroundColor Red
        Write-Host "   Make sure MySQL is running and password is correct" -ForegroundColor Red
        Write-Host "   Windows: Check Services for MySQL80" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host "❌ MySQL not found or not running" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Backend setup
Write-Host "3️⃣  Setting up backend..." -ForegroundColor Yellow
Set-Location $backendDir
Write-Host "   📦 Installing backend dependencies..." -ForegroundColor Gray
npm install --silent
Write-Host "✅ Backend dependencies installed" -ForegroundColor Green
Write-Host ""

# Frontend setup
Write-Host "4️⃣  Setting up frontend..." -ForegroundColor Yellow
Set-Location $projectRoot
Write-Host "   📦 Installing frontend dependencies..." -ForegroundColor Gray
npm install --silent
Write-Host "✅ Frontend dependencies installed" -ForegroundColor Green
Write-Host ""

# Create .env.local for frontend
Write-Host "5️⃣  Creating frontend environment file..." -ForegroundColor Yellow
$envLocal = "$projectRoot\.env.local"
if (-not (Test-Path $envLocal)) {
    "REACT_APP_API_URL=http://localhost:3000" | Set-Content $envLocal
    Write-Host "✅ Created .env.local" -ForegroundColor Green
} else {
    Write-Host "✅ .env.local already exists" -ForegroundColor Green
}
Write-Host ""

Write-Host "================================" -ForegroundColor Cyan
Write-Host "✨ SETUP COMPLETE!" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "📋 NEXT STEPS:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1️⃣  Start Backend (PowerShell #1):" -ForegroundColor Cyan
Write-Host "   cd $backendDir" -ForegroundColor Gray
Write-Host "   npm start" -ForegroundColor Gray
Write-Host ""
Write-Host "2️⃣  Start Frontend (PowerShell #2):" -ForegroundColor Cyan
Write-Host "   cd $projectRoot" -ForegroundColor Gray
Write-Host "   npm start" -ForegroundColor Gray
Write-Host ""
Write-Host "3️⃣  Open browser:" -ForegroundColor Cyan
Write-Host "   http://localhost:3000" -ForegroundColor Gray
Write-Host ""

Write-Host "📊 Database Info:" -ForegroundColor Yellow
Write-Host "   Host: localhost" -ForegroundColor Gray
Write-Host "   Port: 3306" -ForegroundColor Gray
Write-Host "   Database: pruh_db" -ForegroundColor Gray
Write-Host "   User: root" -ForegroundColor Gray
Write-Host ""

Write-Host "🔗 API Endpoints:" -ForegroundColor Yellow
Write-Host "   Backend: http://localhost:3000" -ForegroundColor Gray
Write-Host "   Frontend: http://localhost:3000 (via React proxy)" -ForegroundColor Gray
Write-Host ""

Write-Host "📚 Documentation:" -ForegroundColor Yellow
Write-Host "   See LOCAL_SETUP_GUIDE.md for detailed instructions" -ForegroundColor Gray
Write-Host ""

Write-Host "✅ Ready to start development!" -ForegroundColor Green
