# Ubuntu React Frontend Deployment Guide

This guide will help you deploy your EK-SMS React frontend on an Ubuntu Linux server.

## Prerequisites

- Ubuntu 20.04/22.04 LTS server
- Domain name pointing to your server IP
- SSH access to your server
- Node.js 18+ and npm installed

## Quick Deployment (Automated)

1. **Upload your React project to the server:**
   ```bash
   # On your local machine
   scp -r /path/to/your/react/project user@your-server:/tmp/
   ```

2. **Run the automated deployment script:**
   ```bash
   # On your Ubuntu server
   sudo ./ubuntu-frontend-deploy.sh
   ```

## Manual Deployment Steps

### Step 1: Update System and Install Dependencies

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y nodejs npm nginx curl git ufw
```

### Step 2: Install Node.js 18+ (if not available)

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Step 3: Create Application Directory

```bash
sudo mkdir -p /var/www/ek-sms-frontend
sudo chown -R $USER:$USER /var/www/ek-sms-frontend
cd /var/www/ek-sms-frontend
```

### Step 4: Upload and Build Your React App

```bash
# Upload your React project files to /var/www/ek-sms-frontend
# Then install dependencies and build:

npm install
npm run build
```

### Step 5: Configure Nginx

Create Nginx configuration file:

```bash
sudo nano /etc/nginx/sites-available/pruhsms.africa
```

Add the following configuration (replace `pruhsms.africa` with your domain):

```nginx
server {
    listen 80;
    server_name pruhsms.africa www.pruhsms.africa;

    root /var/www/ek-sms-frontend/build;
    index index.html;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss;

    # Handle React Router (SPA routing)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API proxy to backend (if needed)
    location /api/ {
        proxy_pass https://backend.pruhsms.africa;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/pruhsms.africa /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
```

Test and restart Nginx:

```bash
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx
```

### Step 6: Configure Firewall

```bash
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
```

### Step 7: Set up SSL Certificate (HTTPS)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d pruhsms.africa -d www.pruhsms.africa
```

### Step 8: Set Proper Permissions

```bash
sudo chown -R www-data:www-data /var/www/ek-sms-frontend/build
sudo chmod -R 755 /var/www/ek-sms-frontend/build
```

## Environment Variables

Create a `.env` file in your project root before building:

```bash
# In /var/www/ek-sms-frontend/.env
REACT_APP_API_URL=https://backend.pruhsms.africa
REACT_APP_ENVIRONMENT=production
```

## Testing the Deployment

1. **Check if Nginx is running:**
   ```bash
   sudo systemctl status nginx
   ```

2. **Test your website:**
   - Visit `http://your-domain.com`
   - After SSL setup: `https://your-domain.com`

3. **Check logs if issues occur:**
   ```bash
   sudo tail -f /var/log/nginx/error.log
   sudo tail -f /var/log/nginx/access.log
   ```

## Updating Your Frontend

To update your React app:

```bash
cd /var/www/ek-sms-frontend
git pull origin main  # If using git
npm install
npm run build
sudo systemctl reload nginx
```

## Troubleshooting

### Common Issues:

1. **404 errors on refresh:**
   - This is fixed by the `try_files $uri $uri/ /index.html;` directive in Nginx config

2. **API calls failing:**
   - Check CORS settings on your backend
   - Ensure REACT_APP_API_URL is set correctly

3. **Build failing:**
   - Ensure all dependencies are installed: `npm install`
   - Check Node.js version: `node -v`

4. **Permission denied:**
   - Run build commands as the correct user or with sudo
   - Check file permissions: `ls -la /var/www/ek-sms-frontend/`

### Performance Optimization:

- Enable gzip compression (already configured)
- Set up CDN for static assets
- Implement service worker caching
- Use lazy loading for components

## Security Considerations

- Keep dependencies updated: `npm audit fix`
- Use HTTPS (certbot configured)
- Implement proper CSP headers
- Regular security audits
- Monitor logs for suspicious activity

## Monitoring

- Check Nginx status: `sudo systemctl status nginx`
- Monitor logs: `sudo tail -f /var/log/nginx/access.log`
- Check disk usage: `df -h`
- Monitor memory usage: `free -h`