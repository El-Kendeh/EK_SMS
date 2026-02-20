@echo off
REM Docker Clean Build Script for Windows

echo Cleaning Docker resources...
docker-compose down -v
docker system prune -a -f --volumes

echo Building containers...
docker-compose up --build

echo.
echo If build fails, try:
echo   1. Restart Docker Desktop
echo   2. Increase memory in Docker Desktop Settings (4GB+)
echo   3. Run: docker system prune -a
echo   4. Run: docker-compose up --build
