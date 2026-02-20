Docker Setup Guide

Running the Full Stack with Docker Compose

This setup runs both the Django backend and React frontend in Docker containers.


Prerequisites

- Docker Desktop installed (https://www.docker.com/products/docker-desktop)
- Windows, Mac, or Linux with Docker support


Quick Start

1. Start all services:
   docker-compose up

   This will:
   - Build the Django backend image
   - Build the React frontend image
   - Start the backend on port 8000
   - Start the frontend on port 3000
   - Create a shared Docker network between services


2. Wait for services to start
   - Backend startup: 10-20 seconds
   - Frontend build and startup: 1-2 minutes
   - Watch the logs in your terminal for "ready" messages


3. Access the application:
   - Frontend: http://localhost:3000
   - Backend Admin: http://localhost:8000/admin/
   - Backend API: http://localhost:8000/api/


Service Details

Backend (Django)
   - Service name: ek-sms-backend
   - Port: 8000
   - Dockerfile: Dockerfile
   - Runtime: Python 3.12
   - Server: Gunicorn with 4 workers
   - Database: SQLite (persisted as volume)
   - Health check: Every 30 seconds

Frontend (React)
   - Service name: ek-sms-frontend
   - Port: 3000
   - Dockerfile: Dockerfile.frontend
   - Runtime: Node.js 18 Alpine
   - Server: serve (static file server)
   - API URL: http://localhost:8000


Common Commands

Start all services:
   docker-compose up

Start in background:
   docker-compose up -d

Stop all services:
   docker-compose down

View logs:
   docker-compose logs -f

View logs for specific service:
   docker-compose logs -f web      # Backend
   docker-compose logs -f frontend # Frontend

Rebuild images:
   docker-compose build

Rebuild and start:
   docker-compose up --build

Access container shell (backend):
   docker exec -it ek-sms-backend sh
   python manage.py createsuperuser
   python manage.py migrate

Access container shell (frontend):
   docker exec -it ek-sms-frontend sh


Initial Setup

First time running the application:

1. Start the services:
   docker-compose up --build

2. Wait for the backend to finish starting (watch logs)

3. In another terminal, create a superuser:
   docker exec ek-sms-backend python manage.py createsuperuser

4. Navigate to:
   http://localhost:3000 (Frontend)
   http://localhost:8000/admin/ (Backend Admin)


Troubleshooting

Port Already in Use
   If ports 3000 or 8000 are busy, change them in docker-compose.yml:
   - "3001:3000" instead of "3000:3000"
   - "8001:8000" instead of "8000:8000"

Backend Container Exits
   docker-compose logs web
   Check the output for errors

Frontend Container Exits
   docker-compose logs frontend
   Check for npm build errors

API Connection Issues
   Verify CORS settings in Django settings_secure.py
   Default: CORS_ALLOWED_ORIGINS includes frontend service name

Database Issues (SQLite)
   Data persists in ./db.sqlite3 on your host machine
   To reset: docker exec ek-sms-backend rm /app/db.sqlite3
   Then restart: docker-compose restart web


Performance Tips

1. Run in background:
   docker-compose up -d

2. Monitor resources:
   docker stats

3. Clean up unused resources:
   docker system prune

4. Check disk space:
   docker system df


Network

Services communicate via Docker network (ek-sms-network):
   - Backend service: accessible as 'web' from frontend
   - Frontend service: accessible as 'frontend' from backend

From host machine:
   - Backend: http://localhost:8000
   - Frontend: http://localhost:3000


Production Notes

This docker-compose setup is for development. For production:
   1. Use environment variables from .env.render
   2. Set DEBUG=False
   3. Use a proper database (PostgreSQL)
   4. Enable HTTPS/SSL
   5. Use a reverse proxy (Nginx)
   6. See RENDER_DEPLOYMENT.md for production deployment


Volume Mounting

Current volumes:
   - eksms/ folder: Hot reload changes in backend code
   - db.sqlite3: Persists database between container restarts

To remove volumes on shutdown:
   docker-compose down -v


Updating Dependencies

If you modify package.json or requirements.txt:
   docker-compose up --build

This rebuilds the images with new dependencies


Tips

1. Keep logs visible during development:
   docker-compose up

2. Use multiple terminals:
   Terminal 1: docker-compose up
   Terminal 2: docker exec ek-sms-backend python manage.py shell
   Terminal 3: Use for git commands, etc.

3. Check health:
   docker ps
   Shows status of all containers


For More Help

- Docker Docs: https://docs.docker.com/
- Docker Compose Docs: https://docs.docker.com/compose/
- Django with Docker: https://docs.djangoproject.com/en/5.1/howto/deployment/
- React with Docker: https://create-react-app.dev/deployment/docker/
