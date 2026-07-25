Docker Build Troubleshooting

If you encounter npm installation errors in Docker:

1. Check Disk Space
   docker system df
   docker system prune    # Clean up unused images/containers

2. Clear Docker Cache
   docker system prune -a --volumes
   docker-compose build --no-cache

3. Run with More Verbosity
   docker-compose up --build 2>&1 | tee build.log

4. Check Docker Memory
   Allocate more memory to Docker Desktop:
   - Windows: Docker Desktop Settings → Resources → Memory → Increase to 4GB or more
   - Mac: Docker Desktop Settings → Resources → Memory → Increase to 4GB or more

5. If npm ci fails
   Try using npm install instead:
   Change in Dockerfile.frontend: RUN npm install

6. View Container Logs
   docker logs ek-sms-frontend
   docker logs ek-sms-backend

7. Rebuild Everything
   docker-compose down -v
   docker-compose up --build

8. For Windows-specific issues
   - Restart Docker Desktop
   - Check if WSL2 is properly configured
   - Ensure Docker Desktop is running in Linux mode, not Hyper-V


Changes Made to Fix Build Issues

1. Dockerfile.frontend
   - Changed from node:18-alpine to node:18-slim (more stable)
   - Using npm ci instead of npm install (reproducible installs)
   - Added NODE_OPTIONS for memory management
   - Added proper healthcheck
   - Optimized multi-stage build

2. docker-compose.yml
   - Added NODE_OPTIONS: "--max_old_space_size=2048" for frontend
   - Added healthcheck to frontend  
   - Added BUILDKIT_INLINE_CACHE for faster rebuilds

3. package.json
   - Updated npm version specification

Next Steps

Run Docker build again:
   docker-compose up --build

If it still fails, try:
   docker-compose down -v
   docker system prune -a
   docker-compose up --build

Check logs if issues persist:
   docker-compose logs frontend
   docker-compose logs web
