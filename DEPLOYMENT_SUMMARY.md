Vercel Frontend + Render Backend Deployment Setup

Your Production Configuration


Frontend (Vercel)
  URL: https://ek-sms-one.vercel.app/
  Platform: Vercel
  Framework: React 19.2.4
  Status: ✅ Running

Backend (Render)
  Planned URL: https://ek-sms-backend.onrender.com
  Platform: Render
  Framework: Django 5.1.4
  Database: SQLite (ephemeral)
  Status: 🔄 Ready to Deploy


Configuration Summary

Frontend Environment Variables (Already Set in Vercel)
  REACT_APP_API_URL=https://ek-sms-backend.onrender.com
  REACT_APP_ENVIRONMENT=production
  NODE_ENV=production

Backend Environment Variables (Set in Render Dashboard)
  DEBUG=False
  SECRET_KEY=(auto-generated)
  ALLOWED_HOSTS=ek-sms-backend.onrender.com
  CORS_ALLOWED_ORIGINS=https://ek-sms-one.vercel.app
  SECURE_SSL_REDIRECT=True
  SESSION_COOKIE_SECURE=True
  CSRF_COOKIE_SECURE=True
  SECURE_HSTS_SECONDS=31536000


Security Configuration

CORS (Cross-Origin Resource Sharing)
  ✅ Frontend domain: ek-sms-one.vercel.app
  ✅ Backend domain: ek-sms-backend.onrender.com
  ✅ Allowed requests: GET, POST, PUT, PATCH, DELETE
  ✅ Credentials: Included (for session cookies)

CSRF Protection
  ✅ Token automatically included in all requests
  ✅ SameSite=Strict on cookies
  ✅ HttpOnly flag enabled

HTTPS/SSL
  ✅ Enforced on frontend (Vercel)
  ✅ Enforced on backend (Render)
  ✅ HSTS headers configured

Session Security
  ✅ Secure cookies (HTTPS only)
  ✅ HttpOnly flag (JavaScript cannot access)
  ✅ 1-hour timeout configured


API Endpoints

From Frontend to Backend:
  Base URL: https://ek-sms-backend.onrender.com
  
  Authentication:
    POST   /api/login/         - User login
    POST   /api/logout/        - User logout
    GET    /api/csrf-token/    - Get CSRF token
  
  User Management:
    GET    /api/me/            - Get current user
    GET    /api/users/         - List users
    POST   /api/users/         - Create user
    PUT    /api/users/{id}/    - Update user
    DELETE /api/users/{id}/    - Delete user

Admin Panel:
  URL: https://ek-sms-backend.onrender.com/admin/
  Credentials: Will be created via Django management command


Deployment Steps

Step 1: Prepare Backend for Render

1. Push code to GitHub:
   git add .
   git commit -m "Configure for Render deployment with Vercel frontend"
   git push origin main

2. Verify environment files:
   ✅ .env.render              (contains Render config)
   ✅ render.yaml              (Render service definition)
   ✅ RENDER_DEPLOYMENT.md     (deployment guide)


Step 2: Deploy Backend to Render

1. Go to https://render.com
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - Name: ek-sms-backend
   - Environment: Python 3
   - Build Command: 
     pip install -r eksms/requirements.txt && python eksms/manage.py collectstatic --noinput
   - Start Command:
     gunicorn eksms.eksms.wsgi:application --bind 0.0.0.0:$PORT --workers 4
   - Instance Type: Free

5. Add Environment Variables (from .env.render):
   
   DEBUG: False
   SECRET_KEY: (click "Generate" button)
   ALLOWED_HOSTS: ek-sms-backend.onrender.com
   CORS_ALLOWED_ORIGINS: https://ek-sms-one.vercel.app
   SECURE_SSL_REDIRECT: True
   SESSION_COOKIE_SECURE: True
   CSRF_COOKIE_SECURE: True
   SECURE_HSTS_SECONDS: 31536000
   PYTHONUNBUFFERED: 1

6. Click "Create Web Service"
7. Wait for deployment to complete (5-10 minutes)


Step 3: Verify Backend Deployment

After Render finishes deploying:

1. Check status:
   Go to https://dashboard.render.com
   Click on "ek-sms-backend"
   Verify "Live" status

2. Test backend:
   Open: https://ek-sms-backend.onrender.com/admin/
   Should see Django admin login page

3. Create superuser:
   In Render Dashboard:
   - Click "ek-sms-backend"
   - Click "Shell" tab
   - Run: python eksms/manage.py createsuperuser
   - Follow prompts to create admin user


Step 4: Configure Frontend

Your Vercel frontend is already running at:
  https://ek-sms-one.vercel.app/

Update environment variables in Vercel:

1. Go to https://vercel.com/dashboard
2. Click your "ek-sms" project
3. Click "Settings" → "Environment Variables"
4. Add/Update:
   
   REACT_APP_API_URL: https://ek-sms-backend.onrender.com
   REACT_APP_ENVIRONMENT: production

5. Redeploy: Click "Deployments" → Latest deploy → "Redeploy"


Step 5: Test Integration

1. Open frontend: https://ek-sms-one.vercel.app/
2. Check browser console (F12 → Console)
3. Should see: "Security features initialized"
4. Try logging in with superuser credentials
5. Should communicate with https://ek-sms-backend.onrender.com

If CORS errors appear:
- Check backend's CORS_ALLOWED_ORIGINS setting
- Verify frontend URL is exactly: https://ek-sms-one.vercel.app


File Reference

Configuration Files:
  render.yaml                 - Render service definition
  .env.render                 - Render environment variables
  .env.production             - Production frontend environment
  RENDER_DEPLOYMENT.md        - Deployment guide
  DOCKER_SETUP.md             - Docker setup (local development)


Local Development Setup

To test locally before deploying to Render:

1. Terminal 1 - Backend:
   cd c:\Users\Princess Magbie\Desktop\ek-sms
   python eksms/manage.py runserver 0.0.0.0:8000

2. Terminal 2 - Frontend:
   npm start
   (Runs on http://localhost:3000)

3. Test login with local superuser


Docker Deployment (Optional)

If preferring Docker Compose deployment:

Windows:
  .\docker-clean-build.bat

Mac/Linux:
  bash docker-clean-build.sh

Runs on:
  Frontend: http://localhost:3000
  Backend: http://localhost:8000


Troubleshooting

CORS Errors
  Error: Access to XMLHttpRequest blocked by CORS policy
  
  Solution:
  1. Check CORS_ALLOWED_ORIGINS in Render dashboard
  2. Verify: https://ek-sms-one.vercel.app (no trailing slash)
  3. Ensure backend environment variable is set correctly
  4. Check API URL in frontend: .env.production

Blank Page on Vercel Frontend
  1. Check Vercel deployment logs
  2. Verify REACT_APP_API_URL is set
  3. Check browser console for errors
  4. Redeploy: Vercel Dashboard → Deployments → Redeploy

Backend Returns 404
  1. Check Render logs: Dashboard → ek-sms-backend → Logs
  2. Verify Django migrations: python eksms/manage.py migrate
  3. Check ALLOWED_HOSTS includes your domain
  4. Verify SECRET_KEY is set

Session Not Persisting
  1. Check SECURE_SSL_REDIRECT=True
  2. Check SESSION_COOKIE_SECURE=True
  3. Check CSRF_COOKIE_SECURE=True
  4. Verify credentials: 'include' in API calls


Monitoring & Logs

Backend Logs (Render):
  1. Go to https://dashboard.render.com
  2. Click "ek-sms-backend"
  3. Click "Logs" tab
  4. View real-time logs

Frontend Logs (Vercel):
  1. Go to https://vercel.com/dashboard
  2. Click "ek-sms"
  3. Click "Deployments" tab
  4. Click latest deployment → "Logs"

Browser Logs:
  1. Open https://ek-sms-one.vercel.app
  2. Press F12 to open DevTools
  3. Click "Console" tab
  4. View frontend security logs


Performance

Expected Load Times:
  - Frontend: < 2 seconds (Vercel)
  - API requests: 200-500ms (Render)
  - First load: 3-5 seconds

Optimization:
  - Frontend: Already optimized with React build
  - Backend: Using SQLite (suitable for small-medium apps)
  - Later: Consider upgrading to PostgreSQL for production


Database

Current Setup: SQLite
  - File-based database
  - Data stored in: eksms/db.sqlite3
  - Ephemeral on Render (data lost on restart)

For Production Persistence:
  - Upgrade Render plan to use PostgreSQL
  - Or implement daily backups of db.sqlite3
  - Or use external database service


Next Steps

Immediate:
  [ ] Deploy backend to Render
  [ ] Create superuser on Render backend
  [ ] Test API endpoints
  [ ] Update Vercel REACT_APP_API_URL

Future Improvements:
  [ ] Add PostgreSQL database
  [ ] Implement data backup strategy
  [ ] Set up monitoring and alerts
  [ ] Configure custom domain
  [ ] Add SSL certificate
  [ ] Implement CI/CD pipeline
  [ ] Add email integrations
  [ ] Performance optimization


Support Resources

Render Docs: https://render.com/docs
Vercel Docs: https://vercel.com/docs
Django Docs: https://docs.djangoproject.com/
React Docs: https://react.dev/

For Issues:
  Backend: Check Render logs in dashboard
  Frontend: Check Vercel logs and browser console
  CORS: Review backend CORS configuration
  Performance: Check Render and Vercel monitoring


Your Setup is Ready! 🚀

Frontend:  https://ek-sms-one.vercel.app
Backend:   https://ek-sms-backend.onrender.com
Admin:     https://ek-sms-backend.onrender.com/admin/

Ready to deploy to Render whenever you're ready!
