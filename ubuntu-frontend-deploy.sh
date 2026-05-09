#!/bin/bash

# Ubuntu Frontend Deployment Script for EK-SMS React App
# Run this script on your Ubuntu server as root or with sudo

set -e

echo "🚀 Starting EK-SMS React Frontend Ubuntu Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration - Update these variables as needed
DOMAIN="pruhsms.africa"  # Your domain name
APP_DIR="/var/www/ek-sms-frontend"
BUILD_DIR="$APP_DIR/build"
NGINX_CONF="/etc/nginx/sites-available/$DOMAIN"
NGINX_CONF_LINK="/etc/nginx/sites-enabled/$DOMAIN"

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root. Please run as a regular user with sudo privileges."
   exit 1
fi

print_step "Step 1: Updating system packages..."
sudo apt update && sudo apt upgrade -y

print_step "Step 2: Installing required packages..."
sudo apt install -y nodejs npm nginx curl git ufw

# Install Node.js 18+ if not available
if ! command -v node &> /dev/null || [[ $(node -v | cut -d'.' -f1 | sed 's/v//') -lt 18 ]]; then
    print_status "Installing Node.js 18..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

print_step "Step 3: Creating application directory..."
sudo mkdir -p $APP_DIR
sudo chown -R $USER:$USER $APP_DIR

print_step "Step 4: Cloning/building React application..."
cd $APP_DIR

# If you have a git repository, uncomment and update the next lines:
# git clone https://github.com/yourusername/ek-sms.git .
# cd ek-sms

# For now, assuming the build files are already prepared
# Copy your React project files here, or build them

print_step "Step 5: Installing Node.js dependencies..."
if [ -f "package.json" ]; then
    npm install --production=false
else
    print_error "package.json not found. Please ensure your React project is in $APP_DIR"
    exit 1
fi

print_step "Step 6: Building React application..."
npm run build

print_step "Step 7: Configuring Nginx..."

# Create Nginx configuration
sudo tee $NGINX_CONF > /dev/null <<EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    root $BUILD_DIR;
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

    # Handle React Router
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API proxy (if needed for backend communication)
    location /api/ {
        proxy_pass https://backend.pruhsms.africa;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Enable the site
sudo ln -sf $NGINX_CONF $NGINX_CONF_LINK

# Remove default nginx site if it exists
sudo rm -f /etc/nginx/sites-enabled/default

print_step "Step 8: Testing Nginx configuration..."
sudo nginx -t

print_step "Step 9: Starting/Restarting Nginx..."
sudo systemctl enable nginx
sudo systemctl restart nginx

print_step "Step 10: Configuring firewall..."
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

print_step "Step 11: Setting up SSL certificate (Let's Encrypt)..."
# Install certbot if not already installed
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate (uncomment if you have a domain)
# sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN

print_step "Step 12: Setting proper permissions..."
sudo chown -R www-data:www-data $BUILD_DIR
sudo chmod -R 755 $BUILD_DIR

print_step "Step 13: Creating systemd service for automatic updates (optional)..."
# Create a simple update script
sudo tee /usr/local/bin/update-ek-sms-frontend > /dev/null <<EOF
#!/bin/bash
cd $APP_DIR
git pull origin main
npm install
npm run build
sudo systemctl reload nginx
EOF

sudo chmod +x /usr/local/bin/update-ek-sms-frontend

print_status "✅ Frontend deployment completed successfully!"
print_status ""
print_status "Your React frontend should now be accessible at:"
print_status "  - http://$DOMAIN"
print_status "  - http://www.$DOMAIN"
print_status ""
print_warning "Don't forget to:"
print_warning "  1. Update the DOMAIN variable in this script to your actual domain"
print_warning "  2. Point your domain's DNS to this server's IP address"
print_warning "  3. Run 'sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN' to enable HTTPS"
print_warning "  4. Update REACT_APP_API_URL in your .env file if needed"
print_status ""
print_status "To update the frontend in the future, run:"
print_status "  sudo /usr/local/bin/update-ek-sms-frontend"