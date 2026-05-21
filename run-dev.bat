@echo off
REM Quick start script for EK-SMS local development
REM Usage: run-dev.bat

echo.
echo ================================
echo  EK-SMS Local Development Start
echo ================================
echo.

REM Colors via echo (limited in batch, will just use basic text)
echo [1] Backend (Node.js + Express)
echo [2] Frontend (React)
echo [3] Both (requires 2 terminals)
echo [4] Help
echo.
set /p choice="Choose option (1-4): "

if "%choice%"=="1" goto backend
if "%choice%"=="2" goto frontend
if "%choice%"=="3" goto both
if "%choice%"=="4" goto help
goto invalid

:backend
cd c:\Users\Princess Magbie\Desktop\ek-sms\backend_node
echo.
echo Starting Backend on http://localhost:3000
echo.
npm start
goto end

:frontend
cd c:\Users\Princess Magbie\Desktop\ek-sms
echo.
echo Starting Frontend on http://localhost:3000
echo Create .env.local if needed...
if not exist ".env.local" (
    echo REACT_APP_API_URL=http://localhost:3000 > .env.local
    echo Created .env.local
)
echo.
npm start
goto end

:both
echo Opening two terminals...
echo.
start cmd /k "cd c:\Users\Princess Magbie\Desktop\ek-sms\backend_node && npm start"
echo Waiting 3 seconds before starting frontend...
timeout /t 3 /nobreak
start cmd /k "cd c:\Users\Princess Magbie\Desktop\ek-sms && npm start"
echo.
echo Both terminals opened! Backend on port 3000, Frontend also on 3000 (React proxy)
echo Open http://localhost:3000 in browser
goto end

:help
echo.
echo EK-SMS LOCAL DEVELOPMENT SETUP
echo ==============================
echo.
echo Prerequisites:
echo   - Node.js v18+
echo   - MySQL running (localhost:3306)
echo   - npm installed
echo.
echo Quick Start:
echo   1. Run: setup-local.ps1 (PowerShell)
echo      or
echo   2. Run: run-dev.bat (this script)
echo.
echo Credentials (.env):
echo   - DB_NAME: pruh_db
echo   - DB_USER: root
echo   - DB_PASSWORD: elkinson
echo   - RESEND_API_KEY: configured
echo.
echo First Time:
echo   - Run setup-local.ps1 to install dependencies
echo   - Then use this script to start services
echo.
echo Documentation:
echo   - See LOCAL_SETUP_GUIDE.md for detailed info
echo.
goto end

:invalid
echo Invalid choice. Please try again.
goto backend

:end
