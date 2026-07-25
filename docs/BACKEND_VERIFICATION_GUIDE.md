# Backend-to-MySQL Connection Verification

Run this guide to verify your local setup is working correctly.

## Step-by-Step Verification

### 1. Verify MySQL is Running

```powershell
# Test MySQL connection
mysql -u root -p -e "SELECT 1 as mysql_status;"
```

**Expected Output:**
```
+---------------+
| mysql_status  |
+---------------+
|             1 |
+---------------+
```

**If this fails:**
- MySQL is not running or password is wrong
- Windows: `services.msc` → find MySQL80 → Start
- Check .env has correct credentials

---

### 2. Check Database and Tables

```powershell
# Connect to MySQL
mysql -u root -p

# Enter password: elkinson
```

Inside MySQL shell:

```sql
-- Check database exists
SHOW DATABASES;

-- Select database
USE pruh_db;

-- Check tables exist
SHOW TABLES;

-- Check users table structure
DESCRIBE users;

-- Check schools table structure
DESCRIBE schools;

-- Exit
EXIT;
```

**Expected Tables:**
```
Tables_in_pruh_db
├── users
├── schools
├── school_admins
├── roles
├── academic_years
├── terms
├── students
├── teachers
├── grades
└── ... (60+ tables from Sequelize models)
```

---

### 3. Check Backend Dependencies

```powershell
# Navigate to backend
cd c:\Users\Princess Magbie\Desktop\ek-sms\backend_node

# Check if node_modules exists and has required packages
ls node_modules | Select-String "express|sequelize|mysql2|bcryptjs"
```

**Expected:**
```
express
mysql2
sequelize
bcryptjs
dotenv
```

---

### 4. Verify Backend Configuration

```powershell
# Check .env file in backend_node
type .env
```

**Expected Output:**
```
DB_NAME=pruh_db
DB_USER=root
DB_PASSWORD=elkinson
DB_HOST=localhost
DB_PORT=3306
RESEND_API_KEY=re_fPMuzNgK_Ni6XGFo2p7XYFGCti53FNwfw
```

---

### 5. Start Backend and Check Logs

```powershell
# Navigate to backend
cd c:\Users\Princess Magbie\Desktop\ek-sms\backend_node

# Start backend
npm start
```

**Expected Output (within 3-5 seconds):**
```
🔍 Checking environment variables...
   - DB_NAME: pruh_db
   - RESEND_API_KEY: ✅ Loaded (re_fP...)
🚀 Backend listening on http://localhost:3000
✅ Database synchronized
```

**Keep this running!**

---

### 6. Test Backend API (New PowerShell Window)

```powershell
# Test health endpoint
curl -X GET http://localhost:3000/api/health

# Test public registration endpoint (should return 400, not error)
curl -X POST http://localhost:3000/api/registration/register-school-admin `
  -Headers @{"Content-Type"="application/json"} `
  -Body '{"institutionName":"Test"}'
```

**Expected Responses:**
```json
{"status":"ok"}
{"success":false,"message":"Required fields missing"}
```

---

### 7. Verify Database Synced

Inside MySQL (in new terminal):

```powershell
mysql -u root -p -e "USE pruh_db; SHOW TABLES; SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema='pruh_db';"
```

**Expected:**
```
60+ tables created automatically
```

---

### 8. Test Frontend Connection

```powershell
# In another terminal, start frontend
cd c:\Users\Princess Magbie\Desktop\ek-sms
npm start
```

**Expected:**
```
Compiled successfully!
Local: http://localhost:3000
```

---

### 9. Test End-to-End (Browser)

Open **http://localhost:3000** in browser:

1. **Homepage loads** ✅
   - Should see PRUH-SMS landing page
   - No console errors

2. **Click "Register"** ✅
   - Should go to registration page
   - Form should load without errors

3. **Fill and submit registration** ✅
   - School name, admin email, password, etc.
   - Click submit
   - Should see success message

4. **Check backend logs** ✅
   - Should see: `POST /api/registration/register-school-admin 201`
   - Database INSERT was successful

5. **Verify in MySQL** ✅
   ```sql
   USE pruh_db;
   SELECT * FROM schools ORDER BY created_at DESC LIMIT 1;
   SELECT * FROM users WHERE role_id = 5 ORDER BY created_at DESC LIMIT 1;
   ```

---

## Troubleshooting Matrix

| Issue | Cause | Solution |
|-------|-------|----------|
| `ECONNREFUSED 127.0.0.1:3306` | MySQL not running | Start MySQL service |
| `Access denied for user 'root'@'localhost'` | Wrong password | Check `.env` has correct password |
| `Unknown database 'pruh_db'` | Database not created | Backend will auto-create on start |
| `Cannot find module 'express'` | Dependencies not installed | Run `npm install` in `backend_node/` |
| `REACT_APP_API_URL` not set | Frontend env not configured | Create `.env.local` with `REACT_APP_API_URL=http://localhost:3000` |
| `POST /api/registration/... 404` | Backend not running | Run `npm start` in `backend_node/` |
| `Fetch error in browser console` | CORS or backend down | Check backend is running on port 3000 |
| `Database sync failed` | Connection error | Verify MySQL credentials and connection |

---

## Quick Health Check Commands

Save this as `health-check.ps1` for quick verification:

```powershell
# Quick health check
Write-Host "EK-SMS Health Check" -ForegroundColor Cyan
Write-Host ""

# MySQL
Write-Host "MySQL: " -NoNewline
$mysqlStatus = mysql -u root -p"elkinson" -e "SELECT 1;" 2>&1
if ($LASTEXITCODE -eq 0) { Write-Host "✅" -ForegroundColor Green } else { Write-Host "❌" -ForegroundColor Red }

# Backend process
Write-Host "Backend (port 3000): " -NoNewline
$backend = netstat -ano | Select-String ":3000"
if ($backend) { Write-Host "✅" -ForegroundColor Green } else { Write-Host "⏸️  (not running)" -ForegroundColor Yellow }

# Frontend process
Write-Host "Frontend (React): " -NoNewline
$frontend = netstat -ano | Select-String "3000" | Select-String "node"
if ($frontend) { Write-Host "✅" -ForegroundColor Green } else { Write-Host "⏸️  (not running)" -ForegroundColor Yellow }

# Database tables
Write-Host "Database tables: " -NoNewline
$tableCount = mysql -u root -p"elkinson" -e "USE pruh_db; SELECT COUNT(*) as cnt FROM information_schema.tables WHERE table_schema='pruh_db';" 2>&1 | Select-String "[0-9]" | Select-Object -Last 1
Write-Host "$tableCount" -ForegroundColor Green

Write-Host ""
Write-Host "All systems operational! ✨" -ForegroundColor Cyan
```

---

## Port Usage

Make sure these ports are available:

| Port | Service | Command |
|------|---------|---------|
| 3000 | Node.js Backend | `npm start` in `backend_node/` |
| 3000 | React Frontend | `npm start` in project root |
| 3306 | MySQL | `mysql -u root -p` |

**Check port usage:**
```powershell
# Find what's using port 3000
netstat -ano | findstr ":3000"

# Kill process if needed (replace PID)
taskkill /PID <PID> /F
```

---

## Database Backup/Restore

Quick backup:
```powershell
# Backup
mysqldump -u root -p pruh_db > C:\backup_pruh_db.sql

# Restore
mysql -u root -p pruh_db < C:\backup_pruh_db.sql
```

---

## Reset Everything

To start fresh:

```powershell
# 1. Stop backend (Ctrl+C in backend terminal)

# 2. Drop database
mysql -u root -p -e "DROP DATABASE pruh_db;"

# 3. Restart backend (will recreate database)
cd c:\Users\Princess Magbie\Desktop\ek-sms\backend_node
npm start

# 4. Verify database recreated
mysql -u root -p -e "USE pruh_db; SHOW TABLES;"
```

---

**Last Updated:** May 2026
