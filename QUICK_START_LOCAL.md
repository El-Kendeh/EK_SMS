# 🚀 EK-SMS Local Setup — Quick Reference

## One-Command Setup (First Time)

```powershell
# Windows PowerShell - Run once to set everything up
cd c:\Users\Princess Magbie\Desktop\ek-sms
.\setup-local.ps1
```

This will:
- ✅ Install backend dependencies
- ✅ Install frontend dependencies  
- ✅ Create `.env.local`
- ✅ Verify MySQL connection
- ✅ Show next steps

---

## Daily Development Startup

**Terminal 1 — Backend (Node.js + MySQL):**
```powershell
cd c:\Users\Princess Magbie\Desktop\ek-sms\backend_node
npm start
```
Runs on: **http://localhost:3000**

**Terminal 2 — Frontend (React):**
```powershell
cd c:\Users\Princess Magbie\Desktop\ek-sms
npm start
```
Runs on: **http://localhost:3000** (React proxy to backend)

**Browser:**
```
http://localhost:3000
```

---

## Database Credentials

```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=pruh_db
DB_USER=root
DB_PASSWORD=elkinson
```

Connect:
```powershell
mysql -u root -p
# password: elkinson
```

---

## Quick Health Check

```powershell
# Test MySQL
mysql -u root -p"elkinson" -e "SELECT 1;"

# Check backend is running (should return JSON)
curl http://localhost:3000/api/health

# Check frontend loads
curl http://localhost:3000 | Select-String "React"
```

---

## Environment Files

**Backend (.env in `backend_node/`):**
```
DB_NAME=pruh_db
DB_USER=root
DB_PASSWORD=elkinson
DB_HOST=localhost
DB_PORT=3306
RESEND_API_KEY=re_fPMuzNgK_Ni6XGFo2p7XYFGCti53FNwfw
```

**Frontend (.env.local in root):**
```
REACT_APP_API_URL=http://localhost:3000
```

---

## What Each Terminal Shows

### Backend Terminal (npm start in backend_node/)
```
🔍 Checking environment variables...
   - DB_NAME: pruh_db
   - RESEND_API_KEY: ✅ Loaded (re_fP...)
🚀 Backend listening on http://localhost:3000
✅ Database synchronized

(Then live API logs)
POST /api/login/ 200
GET /api/school/students/ 200
POST /api/registration/register-school-admin 201
```

### Frontend Terminal (npm start in root)
```
Compiled successfully!

You can now view ek-sms in the browser.

  Local:            http://localhost:3000
  On Your Network:  http://192.168.x.x:3000

Note that the development build is not optimized.
To create a production build, use npm run build.
```

### Browser
Opens: **http://localhost:3000**
Shows: PRUH-SMS landing page with Login/Register buttons

---

## Typical Workflow

### 1. Register New School
```
Frontend: Click "Register" → Fill form → Submit
Backend logs: POST /api/registration/register-school-admin 201
MySQL: INSERT INTO schools, users
Frontend: Shows success
```

### 2. Login as School Admin
```
Frontend: Enter email/password → Click "Login"
Backend: Validates credentials → Returns JWT token
Frontend: Stores token in localStorage → Shows dashboard
Backend logs: POST /api/login 200
```

### 3. Access School Admin Dashboard
```
Frontend: Loads dashboard with DashboardGate
DashboardGate: Calls GET /api/registration/check-status
Backend: Checks school approval_status from MySQL
Returns: { status: 'pending'|'approved'|'rejected' }
Frontend: Shows approval modal or dashboard
```

---

## Common Commands

```powershell
# Check Node.js version
node --version

# Check npm version
npm --version

# Install backend dependencies
cd backend_node && npm install

# Install frontend dependencies
npm install

# Start backend dev server
cd backend_node && npm start

# Start frontend dev server
npm start

# Build React for production
npm run build

# Connect to database
mysql -u root -p

# List database tables
mysql -u root -p -e "USE pruh_db; SHOW TABLES;"

# Backup database
mysqldump -u root -p pruh_db > backup.sql

# Restore database
mysql -u root -p pruh_db < backup.sql
```

---

## Port Quick Fix

If port 3000 is in use:

```powershell
# Find what's using port 3000
netstat -ano | findstr ":3000"

# Kill process (replace PID from output)
taskkill /PID 12345 /F

# Or change backend port in src/index.js
# Change: const PORT = process.env.PORT || 3000;
# To:     const PORT = process.env.PORT || 3001;
```

---

## Reset Database

```powershell
# 1. Stop backend (Ctrl+C)

# 2. Drop and recreate
mysql -u root -p
# password: elkinson

DROP DATABASE pruh_db;
CREATE DATABASE pruh_db;
EXIT;

# 3. Restart backend (will auto-sync tables)
cd backend_node && npm start
```

---

## Documentation

📖 **Full Guides:**
- `LOCAL_SETUP_GUIDE.md` — Complete setup with troubleshooting
- `BACKEND_VERIFICATION_GUIDE.md` — Step-by-step verification
- `PRUH_SMS_SYSTEM_DOCUMENTATION.md` — Full system architecture

---

## File Locations

```
c:\Users\Princess Magbie\Desktop\ek-sms\
├── backend_node/
│   ├── src/
│   │   ├── index.js                    (Backend entry point)
│   │   ├── routes/                     (API endpoints)
│   │   ├── controllers/                (Business logic)
│   │   ├── models/                     (Database schemas)
│   │   ├── middleware/                 (Auth, CORS, etc)
│   │   └── config/
│   │       └── db.js                   (MySQL connection)
│   ├── .env                            (Database credentials)
│   └── package.json                    (Backend dependencies)
├── src/
│   ├── index.js                        (React entry point)
│   ├── App.js                          (Main React app)
│   ├── api/
│   │   ├── client.js                   (API client)
│   │   └── ...
│   ├── components/
│   │   ├── DashboardGate.js            (Auth gating)
│   │   └── ...
│   └── config/
│       └── security.js                 (API URL config)
├── .env                                (Main env - DO NOT EDIT)
├── .env.local                          (Frontend API URL - AUTO-CREATED)
├── package.json                        (Frontend dependencies)
├── setup-local.ps1                     (Automation script)
├── run-dev.bat                         (Quick start script)
├── LOCAL_SETUP_GUIDE.md                (This guide)
└── BACKEND_VERIFICATION_GUIDE.md       (Verification guide)
```

---

## Status Check

```powershell
# All running?
$checks = @{
    "MySQL" = $(mysql -u root -p"elkinson" -e "SELECT 1;" 2>&1 | Select-String "1").Count -gt 0
    "Backend Port 3000" = $(netstat -ano | findstr ":3000").Count -gt 0
    "Frontend Running" = $(curl -s http://localhost:3000 | Select-String "React").Count -gt 0
    "Backend API" = $(curl -s http://localhost:3000/api/health | Select-String "ok").Count -gt 0
    "Database pruh_db" = $(mysql -u root -p"elkinson" -e "SHOW DATABASES;" | Select-String "pruh_db").Count -gt 0
}

$checks | ForEach-Object {
    Write-Host "$($_.Name): " -NoNewline
    Write-Host $(if ($_.Value) { "✅" } else { "❌" }) -ForegroundColor $(if ($_.Value) { "Green" } else { "Red" })
}
```

---

## Need Help?

1. **Read** → `LOCAL_SETUP_GUIDE.md` (Troubleshooting section)
2. **Verify** → `BACKEND_VERIFICATION_GUIDE.md` (Step-by-step verification)
3. **Check** → Backend logs in terminal (red text = errors)
4. **Test** → `curl http://localhost:3000/api/health`
5. **Database** → `mysql -u root -p pruh_db` then `SHOW TABLES;`

---

**Last Updated:** May 2026 | EK-SMS v1.0
