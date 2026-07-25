ping # IONOS + Vercel Domain Configuration Guide

## Overview
Your setup requires:
- **Frontend**: `pruhsms.africa` → Vercel
- **Backend**: `backend.pruhsms.africa` → Ubuntu server

## Recommended Approach: Use Vercel's Nameservers

### Step 1: Deploy to Vercel First
1. Push your React app to GitHub/GitLab
2. Connect repository to Vercel
3. Deploy the app
4. In Vercel dashboard, go to your project → Settings → Domains
5. Add `pruhsms.africa` as a custom domain

### Step 2: Transfer Nameservers to Vercel
1. **In IONOS Control Panel:**
   - Go to Domains → [your domain] → Nameservers
   - Change nameservers to Vercel's nameservers:
     ```
     ns1.vercel-dns.com
     ns2.vercel-dns.com
     ```

2. **Wait for propagation** (can take 24-48 hours)

### Step 3: Configure DNS Records in Vercel
Once nameservers are transferred, configure DNS in Vercel dashboard:

1. **For the main domain (pruhsms.africa):**
   - Vercel automatically handles this for your frontend

2. **For the backend subdomain (backend.pruhsms.africa):**
   - In Vercel dashboard: Project → Settings → Domains
   - Add `backend.pruhsms.africa` as a domain
   - **Important:** Set it as a redirect domain or configure DNS records

### Step 4: DNS Configuration for Backend Subdomain

Since your backend is on a different server, you need to add DNS records in Vercel:

1. Go to Vercel dashboard → Your project → Settings → Domains
2. Click on `pruhsms.africa`
3. Go to "DNS Records" section
4. Add these records:

**For backend.pruhsms.africa:**
```
Type: A
Name: backend
Value: YOUR_UBUNTU_SERVER_IP (e.g., 123.456.789.0)
TTL: 300
```

**Or if you have multiple backend servers:**
```
Type: CNAME
Name: backend
Value: your-backend-server.example.com
TTL: 300
```

## Alternative Approach: Keep IONOS Nameservers

If you prefer to keep IONOS nameservers:

### Step 1: Get Vercel Domain Information
1. Deploy to Vercel
2. In Vercel dashboard, check the domain assignment
3. Note the Vercel domain (e.g., `your-app.vercel.app`)

### Step 2: Configure DNS in IONOS

**For pruhsms.africa (Frontend):**
```
Type: CNAME
Name: @
Value: cname.vercel-dns.com
TTL: 300
```

**For www.pruhsms.africa (optional):**
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
TTL: 300
```

**For backend.pruhsms.africa (Backend):**
```
Type: A
Name: backend
Value: YOUR_UBUNTU_SERVER_IP
TTL: 300
```

## SSL Certificate Setup

Vercel automatically provides SSL for your domains. For the backend subdomain, you'll need to:

1. **On your Ubuntu server**, install certbot:
   ```bash
   sudo apt install certbot python3-certbot-nginx
   ```

2. **Get SSL certificate**:
   ```bash
   sudo certbot --nginx -d backend.pruhsms.africa
   ```

## Testing Configuration

After setup, test both domains:

```bash
# Test frontend
curl -I https://pruhsms.africa

# Test backend
curl -I https://backend.pruhsms.africa
```

## Troubleshooting

### Issue: Backend subdomain not working
- Check DNS propagation: `nslookup backend.pruhsms.africa`
- Verify A/CNAME record is correct
- Ensure your Ubuntu server firewall allows HTTP/HTTPS

### Issue: Frontend not loading
- Check Vercel deployment status
- Verify CNAME record points to `cname.vercel-dns.com`
- Wait for DNS propagation (up to 48 hours)

### Issue: Mixed content warnings
- Ensure your React app uses HTTPS URLs for API calls
- Update REACT_APP_API_URL to `https://backend.pruhsms.africa`

## Environment Variables

Make sure your Vercel environment has:
```
REACT_APP_API_URL=https://backend.pruhsms.africa
REACT_APP_ENVIRONMENT=production
```

## Recommended: Use Vercel's Nameservers

**Pros:**
- Easier management (all DNS in one place)
- Better performance (Vercel's global CDN)
- Automatic SSL certificates
- Better analytics and monitoring

**Cons:**
- Nameserver change takes time
- Less control over DNS

## Quick Commands for Ubuntu Backend

```bash
# Update nginx config for backend.pruhsms.africa
sudo nano /etc/nginx/sites-available/backend.pruhsms.africa

# Test nginx config
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx

# Get SSL certificate
sudo certbot --nginx -d backend.pruhsms.africa
```