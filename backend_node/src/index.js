// src/index.js
require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const bodyParser = require('body-parser');
const db = require('./config/db');
require('./models');

const authRouter = require('./routes/auth');
const schoolRouter = require('./routes/school');
const teacherRouter = require('./routes/teacher');
const studentRouter = require('./routes/student');
const superadminRouter = require('./routes/superadmin');
const { logFrontendEvent } = require('./controllers/loggingController');
const { testEmail } = require('./controllers/testController');

const app = express();

const allowedOrigins = [
  'http://localhost:3000',
  'https://pruhsms.africa',
  'https://www.pruhsms.africa',
  'https://backend.pruhsms.africa',
  'https://ek-sms-one.vercel.app'
];

console.log('🔍 Checking environment variables...');
console.log('   - DB_NAME:', process.env.DB_NAME);
if (process.env.RESEND_API_KEY) {
  const maskedKey = process.env.RESEND_API_KEY.substring(0, 5) + '...';
  console.log('   - RESEND_API_KEY: ✅ Loaded (' + maskedKey + ')');
} else {
  console.log('   - RESEND_API_KEY: ❌ NOT LOADED');
}

const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  // Even more permissive check for pruhsms.africa subdomains
  if (origin.includes('pruhsms.africa')) return true;
  return false;
};

app.use(cors({
  origin: function (origin, callback) {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRFToken', 'X-Requested-With'],
  optionsSuccessStatus: 200
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const uploadsRoot = path.join(__dirname, '../../uploads');
try {
  fs.mkdirSync(path.join(uploadsRoot, 'branding'), { recursive: true });
  fs.mkdirSync(path.join(uploadsRoot, 'badges'), { recursive: true });
} catch {
  /* ignore */
}
app.use('/uploads', express.static(uploadsRoot));

// Public endpoints
app.get('/', (req, res) => {
  res.json({
    message: 'EK-SMS Backend API',
    status: 'Running',
    version: '1.0.0',
    documentation: '/api/health'
  });
});

// DEBUG: DB Structure & Files (Temporary)
app.get('/api/debug/db-structure/:table', async (req, res) => {
  try {
    const { table } = req.params;
    const [results] = await db.query(`DESCRIBE ${table}`);
    
    // Also list uploads dir for debugging
    let files = [];
    try {
      files = fs.readdirSync(path.join(uploadsRoot, 'badges'));
    } catch (e) {
      files = [`Error reading uploads: ${e.message}`];
    }

    res.json({ 
      table, 
      columns: results, 
      dirname: __dirname, 
      uploadsRoot, 
      badgeFiles: files.slice(0, 20) 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
// Frontend calls this on 403 to refresh CSRF; Node stack does not use Django CSRF — return 200 to avoid noisy 401s.
app.get(['/api/csrf-token', '/api/csrf-token/'], (req, res) => {
  res.json({ success: true, csrfToken: '' });
});
app.post('/api/logs', logFrontendEvent);
app.post('/api/logs/', logFrontendEvent); // Support both with and without trailing slash
app.post('/api/test-email', testEmail);
app.post('/api/test-email/', testEmail);

// Mount routers
app.use('/api', authRouter);
app.use('/api', schoolRouter);
app.use('/api', superadminRouter); // Now at /api/schools, /api/impersonate, etc.
app.use('/api/teacher', teacherRouter);
app.use('/api/student', studentRouter);

// Sync database models
db.sync({ alter: true }) // Using alter: true to add new tables like 'eksms_core_otp' without dropping data
  .then(() => console.log('✅ Database synchronized'))
  .catch(err => console.error('❌ Database sync failed:', err));

// 404 Handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found on this server.`,
    status: 404
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Backend listening on http://localhost:${PORT}`);
});

module.exports = app;
