# Local Setup Guide — MySQL + Node.js Backend + React Frontend

This guide sets up the complete EK-SMS application locally with MySQL database and Node.js backend running together with React frontend.

## Prerequisites

- Node.js v18+ installed
- MySQL 5.7+ running and accessible
- Git installed
- npm or yarn package manager

## Quick Start (Windows PowerShell)

### 1. Check MySQL Connection

```powershell
# Test MySQL is running and credentials work
mysql -u root -p -e "SHOW DATABASES;"
# When prompted, enter password: elkinson
```

**Expected Output:**
```
| Database             |
| information_schema   |
| mysql                |
| performance_schema   |
| pruh_db              |
| sys                  |
```

If MySQL is not running:
- **Windows**: Use MySQL Workbench or Services (press `Win+R`, type `services.msc`)
- Search for "MySQL80" or "MySQL Server" → Right-click → Start

---

### 2. Backend Setup (Node.js + Express + Sequelize)

```powershell
# Navigate to backend directory
cd c:\Users\Princess Magbie\Desktop\ek-sms\backend_node

# Install dependencies
npm install

# Verify .env is configured
cat .env
# Should show:
# DB_NAME=pruh_db
# DB_USER=root
# DB_PASSWORD=elkinson
# DB_HOST=localhost
# DB_PORT=3306
# RESEND_API_KEY=re_fPMuzNgK_Ni6XGFo2p7XYFGCti53FNwfw

# Start backend (runs on port 3000)
npm start
```

**Expected Output:**
```
🔍 Checking environment variables...
   - DB_NAME: pruh_db
   - RESEND_API_KEY: ✅ Loaded (re_fP...)
🚀 Backend listening on http://localhost:3000
✅ Database synchronized
```

**Keep this terminal open!**

---

### 3. Frontend Setup (React)

Open a **new PowerShell window**:

```powershell
# Navigate to project root
cd c:\Users\Princess Magbie\Desktop\ek-sms

# Install dependencies
npm install

# Set frontend API URL to local backend
# Create .env.local file
echo "REACT_APP_API_URL=http://localhost:3000" > .env.local

# Start React development server (runs on port 3000)
npm start
```

**Expected Output:**
```
Compiled successfully!
You can now view ek-sms in the browser.
  Local:            http://localhost:3000
  On Your Network:  http://192.168.x.x:3000
```

---

### 4. Test the Connection

Open **http://localhost:3000** in your browser.

1. Click **Register** to create a new school account
2. Fill in school details and submit
3. Check backend terminal for logs

**Expected Backend Output:**
```
POST /api/registration/register-school-admin 201
School registration submitted successfully.
```

---

## Complete Workflow

### Flow Diagram
```
┌─────────────────────────┐
│   Browser (localhost)   │
│   React App Port 3000   │
└────────┬────────────────┘
         │
         │ HTTP Requests
         │ /api/login
         │ /api/registration/*
         │
┌────────▼────────────────┐
│  Node.js Backend        │
│  Express Port 3000      │
└────────┬────────────────┘
         │
         │ SQL Queries
         │ INSERT users
         │ SELECT schools
         │
┌────────▼────────────────┐
│   MySQL Database        │
│   pruh_db (localhost)   │
└─────────────────────────┘
```

---

## Common Tasks

### Check Database Tables

```powershell
# Connect to MySQL
mysql -u root -p

# Then type password: elkinson

# Inside MySQL shell
USE pruh_db;
SHOW TABLES;

# Check users table
SELECT id, username, email, role_id, is_active FROM users LIMIT 5;

# Check schools table
SELECT id, name, approval_status, is_approved FROM schools LIMIT 5;
```

---

### View Backend Logs

Keep the backend terminal open to see real-time logs of API calls:

```
POST /api/login/ 200
GET /api/registration/check-status 401
POST /api/registration/register-school-admin 201
```

---

### Reset Database

If you need to start fresh:

```powershell
# In MySQL
mysql -u root -p

# Enter password: elkinson

# Drop and recreate
DROP DATABASE pruh_db;
CREATE DATABASE pruh_db;

# Exit
EXIT;

# Restart backend to re-sync tables
# (Press Ctrl+C in backend terminal, then npm start again)
```

---

## Environment Variables

**Backend (.env in `backend_node/`):**
```
DB_NAME=pruh_db
DB_USER=root
DB_PASSWORD=elkinson
DB_HOST=localhost
DB_PORT=3306
RESEND_API_KEY=re_fPMuzNgK_Ni6XGFo2p7XYFGCti53FNwfw
```

**Frontend (.env.local in project root):**
```
REACT_APP_API_URL=http://localhost:3000
```

---

## Troubleshooting

### Problem: "Cannot connect to MySQL"
```
Error: connect ECONNREFUSED 127.0.0.1:3306
```
**Solution:**
- Check MySQL is running: `mysql -u root -p -e "SELECT 1;"`
- Verify credentials match .env file
- On Windows, ensure MySQL Server service is running

---

### Problem: "Module not found" in backend
```
Error: Cannot find module 'C:\Users\...\backend_node\src\index.js'
```
**Solution:**
- Make sure you're in the `backend_node` directory: `cd backend_node`
- Run from `backend_node`, not from root: `npm start`

---

### Problem: "Database sync failed"
```
❌ Database sync failed: ...
⚠️ Continuing without sync
```
**Solution:**
- Tables will be created automatically on first request
- Check MySQL is running
- Verify DB_NAME and credentials in .env

---

### Problem: "401 Unauthorized" on dashboard access
```
Frontend: 401 Unauthorized when accessing dashboard
Backend: "Invalid or expired token"
```
**Solution:**
- Log in first: `/login`
- Save token to localStorage
- Token is sent in `Authorization: Bearer <token>` header
- Check backend auth middleware is running

---

### Problem: Frontend can't reach backend
```
Fetch Error: Failed to fetch
CORS error in console
```
**Solution:**
- Backend must be running on port 3000: `npm start` in `backend_node/`
- Check `.env.local` has `REACT_APP_API_URL=http://localhost:3000`
- Restart React: `npm start` in project root

---

## Architecture Overview

### Database Schema
```
users
├── id (PK)
├── username
├── email
├── password (bcrypt hashed)
├── role_id (FK → roles)
├── is_active
└── created_at

schools
├── id (PK)
├── name
├── email
├── approval_status (pending|approved|rejected)
├── is_approved
├── created_at
└── ...

school_admins (junction)
├── id (PK)
├── user_id (FK → users)
├── school_id (FK → schools)
└── created_at

roles
├── id (PK)
├── code (schooladmin|teacher|parent|etc)
├── name
└── description
```

### API Routes (Backend)

**Public:**
- `POST /api/login/` — Login user
- `POST /api/registration/register-school-admin` — Register new school

**Protected (require auth token):**
- `GET /api/registration/check-status` — Check school approval status
- `GET /api/school/students/` — List students
- `POST /api/school/students/` — Create student
- `GET /api/school/teachers/` — List teachers
- `GET /api/school/context/` — Get school context

---

## Running in Production

For deployment to production, ensure:

1. **Backend Environment:**
   - Set `NODE_ENV=production`
   - Use real database with production password
   - Configure `RESEND_API_KEY` from Resend dashboard
   - Set `JWT_SECRET` to a secure random string

2. **Frontend Environment:**
   - Set `REACT_APP_API_URL` to production backend domain
   - Run `npm run build` instead of `npm start`

3. **Database:**
   - Use MySQL 5.7+ with proper backup strategy
   - Enable SSL/TLS for connections
   - Configure proper user permissions

---

## Support

For issues:
1. Check backend logs: Look in the backend terminal
2. Check browser console: Press `F12` → Console tab
3. Check MySQL: `mysql -u root -p -e "USE pruh_db; SHOW TABLES;"`
4. Enable debug mode: Set `DEBUG=* npm start` in backend

---

**Last Updated:** May 2026
