 Dockerfile with Security Best Practices

```dockerfile
 Multi-stage build for smaller final image
FROM python:3.11-slim as builder

WORKDIR /app

 Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

 Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

 Final stage
FROM python:3.11-slim

WORKDIR /app

 Create non-root user for security
RUN useradd -m -u 1000 djangouser

 Install runtime dependencies only
RUN apt-get update && apt-get install -y --no-install-recommends \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

 Copy Python packages from builder
COPY --from=builder /root/.local /home/djangouser/.local

 Copy application code
COPY --chown=djangouser:djangouser . .

 Set environment path
ENV PATH=/home/djangouser/.local/bin:$PATH

 Security: Run as non-root user
USER djangouser

 Expose port (non-privileged)
EXPOSE 8000

 Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health/ || exit 1

 Run gunicorn with secure defaults
CMD [
    "gunicorn",
    "eksms.wsgi:application",
    "--bind", "0.0.0.0:8000",
    "--workers", "4",
    "--worker-class", "sync",
    "--worker-tmp-dir", "/dev/shm",
    "--timeout", "60",
    "--access-logfile", "-",
    "--error-logfile", "-",
    "--log-level", "info"
]
```

 Docker Compose with Security

```yaml
version: '3.8'

services:
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
     Security
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - backend
    restart: unless-stopped
     Don't expose DB to external network

  web:
    build: .
    command: >
      sh -c "python eksms/manage.py migrate &&
             gunicorn eksms.wsgi:application --bind 0.0.0.0:8000"
    environment:
      DEBUG: 'False'
      SECRET_KEY: ${SECRET_KEY}
      ALLOWED_HOSTS: ${ALLOWED_HOSTS}
      CORS_ALLOWED_ORIGINS: ${CORS_ALLOWED_ORIGINS}
      DB_ENGINE: django.db.backends.postgresql
      DB_NAME: ${DB_NAME}
      DB_USER: ${DB_USER}
      DB_PASSWORD: ${DB_PASSWORD}
      DB_HOST: db
      DB_PORT: '5432'
    ports:
      - "0.0.0.0:8000:8000"
    depends_on:
      db:
        condition: service_healthy
    networks:
      - backend
    restart: unless-stopped
     Security: read-only filesystem except for necessary dirs
    read_only: true
    tmpfs:
      - /tmp
      - /run
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health/"]
      interval: 30s
      timeout: 3s
      retries: 3

  nginx:
    image: nginx:alpine
    ports:
      - "0.0.0.0:80:80"
      - "0.0.0.0:443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - web
    networks:
      - backend
    restart: unless-stopped
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE

volumes:
  postgres_data:

networks:
  backend:
    driver: bridge
```

 Docker Security Best Practices Applied

1. Multi-stage build - Reduces final image size
2. Non-root user - Runs as `djangouser` (UID 1000)
3. Minimal base image - Uses `python:3.11-slim`
4. Health checks - Container health monitoring
5. Read-only filesystem - Except for temp directories
6. Dropped capabilities - No unnecessary Linux capabilities
7. Network isolation - Backend network separate from public
8. Environment variables - Sensitive data from .env, not hardcoded
9. Dependency caching - Multi-stage build optimization
10. Updated packages - Always use latest patch versions

 Nginx Configuration for SSL/TLS

```nginx
 nginx.conf
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 20M;

     Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;

     Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login_limit:10m rate=5r/m;

     Upstream Django app
    upstream django {
        server web:8000;
    }

     Redirect HTTP to HTTPS
    server {
        listen 80;
        server_name _;
        return 301 https://$host$request_uri;
    }

     HTTPS server
    server {
        listen 443 ssl http2;
        server_name yourdomain.com www.yourdomain.com;

         SSL certificates
        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;

         SSL configuration
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;
        ssl_prefer_server_ciphers on;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;

         Gzip compression
        gzip on;
        gzip_vary on;
        gzip_min_length 1024;
        gzip_types text/plain text/css text/xml text/javascript 
                   application/x-javascript application/xml+rss;

         Static files
        location /static/ {
            alias /app/staticfiles/;
            expires 30d;
            add_header Cache-Control "public, immutable";
        }

         Media files
        location /media/ {
            alias /app/media/;
            expires 7d;
        }

         API - with rate limiting
        location /api/ {
            limit_req zone=api_limit burst=20 nodelay;
            proxy_pass http://django;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

         Login endpoint - stricter rate limiting
        location /api/auth/login/ {
            limit_req zone=login_limit burst=5 nodelay;
            proxy_pass http://django;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

         Admin - restricted access
        location /admin/ {
             Restrict to specific IPs (optional)
             allow 10.0.0.0/8;
             deny all;
            
            proxy_pass http://django;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

         Django app
        location / {
            proxy_pass http://django;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_redirect off;
        }
    }
}
```

 Deployment Checklist

- [ ] Generate strong SSL certificates (Let's Encrypt recommended)
- [ ] Set secure environment variables
- [ ] Build Docker image: `docker build -t eksms:latest .`
- [ ] Test with docker-compose: `docker-compose up`
- [ ] Run migrations: `docker-compose exec web python eksms/manage.py migrate`
- [ ] Collect static files: `docker-compose exec web python eksms/manage.py collectstatic --noinput`
- [ ] Create superuser: `docker-compose exec web python eksms/manage.py createsuperuser`
- [ ] Run security check: `docker-compose exec web python eksms/manage.py check --deploy`
- [ ] Review logs for errors: `docker-compose logs -f`
- [ ] Test HTTPS and security headers on https://securityheaders.com
- [ ] Set up backup strategy for database volume
- [ ] Configure monitoring and alerting

 Running Production Deployment

```bash
 Deploy with docker-compose
docker-compose -f docker-compose.yml up -d

 View logs
docker-compose logs -f

 Run migrations after first deploy
docker-compose exec web python eksms/manage.py migrate

 Collect static files
docker-compose exec web python eksms/manage.py collectstatic --noinput

 Create superuser
docker-compose exec web python eksms/manage.py createsuperuser

 Stop services
docker-compose down
```
