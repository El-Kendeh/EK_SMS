Render Deployment Guide

STEP 1: Prepare Your Repository

1. Push your code to GitHub:
   git add .
   git commit -m "Setup for Render deployment"
   git push origin main

2. Make sure .gitignore includes:
   .env
   .env.local
   db.sqlite3
   staticfiles/
   media/


STEP 2: Create Render Account and Service

1. Go to render.com and sign up
2. Connect your GitHub account
3. Click "New +" and select "Web Service"
4. Select your repository (ek-sms)
5. Configure:
   - Name: ek-sms-backend
   - Environment: Python 3
   - Build Command: pip install -r requirements.txt && python manage.py collectstatic --noinput
   - Start Command: gunicorn eksms.wsgi:application --bind 0.0.0.0:$PORT
   - Instance Type: Free (or Starter for production)


STEP 3: Add Environment Variables in Render Dashboard

1. Go to your service settings
2. Add these environment variables:
   
   DEBUG: False
   PYTHONUNBUFFERED: 1
   SECRET_KEY: (generate a strong random key)
   ALLOWED_HOSTS: ek-sms-backend.onrender.com
   CORS_ALLOWED_ORIGINS: https://ek-sms-one.vercel.app
   SECURE_SSL_REDIRECT: True
   SESSION_COOKIE_SECURE: True
   CSRF_COOKIE_SECURE: True
   SECURE_HSTS_SECONDS: 31536000


STEP 4: Database Configuration

SQLite is configured and will work with Render.

IMPORTANT SQLite Limitation on Render:
SQLite stores data in a local file (db.sqlite3). When your Render service restarts, 
the file system is ephemeral and all data will be LOST. This is NOT recommended for 
production environments with persistent data needs.

If you need to persist data in production:
1. Upgrade your Render plan to use a PostgreSQL database
2. Or implement a backup strategy to restore db.sqlite3 from external storage

For development/testing: SQLite works fine on Render as-is.


STEP 5: Deploy

1. Render will automatically deploy when you push to GitHub
2. Monitor the deployment in the "Events" tab
3. Check logs in the "Logs" tab if there are errors


STEP 6: Run Migrations

After first deployment:
1. In Render Dashboard, go to your service
2. Click "Shell" 
3. Run: python eksms/manage.py migrate
4. Run: python eksms/manage.py createsuperuser


STEP 7: Configure Your Frontend

Replace API URLs in your React app:
   REACT_APP_API_URL=https://your-service.onrender.com


Troubleshooting

Build Error: Django==6.0.1
- Solution: Update Django to 5.1.4 (compatible with Python 3.11)
- Already fixed in requirements.txt

Static Files Not Loading
- Solution: Run: python manage.py collectstatic --noinput
- Check STATIC_ROOT and STATIC_URL in settings

CORS Errors
- Update CORS_ALLOWED_ORIGINS with your frontend URL
- Ensure credentials: 'include' in frontend requests

Data Loss on Redeploy (SQLite)
- SQLite data is ephemeral on Render
- Each restart loses all data
- Consider upgrading to PostgreSQL for production


Environment Variables Checklist

[ ] DEBUG=False
[ ] SECRET_KEY=(strong random string)
[ ] ALLOWED_HOSTS=ek-sms-backend.onrender.com
[ ] CORS_ALLOWED_ORIGINS=https://ek-sms-one.vercel.app
[ ] SECURE_SSL_REDIRECT=True
[ ] SESSION_COOKIE_SECURE=True
[ ] CSRF_COOKIE_SECURE=True
[ ] SECURE_HSTS_SECONDS=31536000
[ ] DATABASE_URL=(automatically 

Useful Render Commands

View logs:
- Render Dashboard -> Logs tab

Deploy specific commit:
- Push to GitHub with desired commit
- Render auto-deploys

Access Render Shell:
- Render Dashboard -> Shell tab
- Run Django commands directly

Auto-deploy:
- Every push to main branch triggers deployment
- Disable in service settings if needed


Performance Tips

1. Use Render's PostgreSQL instead of SQLite
2. Enable Gzip compression (already configured)
3. Use WhiteNoise for static files (already configured)
4. Set appropriate SECURE_HSTS_SECONDS
5. Monitor resource usage in Render Dashboard


Useful Links

- Render Docs: https://render.com/docs
- Django Deployment: https://docs.djangoproject.com/en/5.1/howto/deployment/
- Environment Variables: https://render.com/docs/environment-variables
- Free Tier Limits: https://render.com/docs/free


After Deployment

Your backend will be available at:
   https://ek-sms-backend.onrender.com

Admin panel:
   https://ek-sms-backend.onrender.com/admin/

API endpoints:
   https://ek-sms-backend.onrender.com/api/

Frontend:
   https://ek-sms-one.vercel.app/

Connect frontend to:
   REACT_APP_API_URL=https://ek-sms-backend.onrender.com
