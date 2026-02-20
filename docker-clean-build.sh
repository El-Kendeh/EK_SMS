#!/bin/bash
# Docker Clean Build Script for Mac/Linux

echo "Cleaning Docker resources..."
docker-compose down -v
docker system prune -a -f --volumes

echo "Building containers..."
docker-compose up --build

echo ""
echo "If build fails, try:"
echo "  1. Restart Docker"
echo "  2. Increase memory in Docker settings (4GB+)"
echo "  3. Run: docker system prune -a"
echo "  4. Run: docker-compose up --build"
