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
const principalRouter = require('./routes/principal');
const financeRouter = require('./routes/finance');
const { logFrontendEvent } = require('./controllers/loggingController');
const { testEmail } = require('./controllers/testController');

const app = express();

const allowedOrigins = [
  'https://backend.pruhsms.africa',
  'https://pruhsms.africa',
  'https://www.pruhsms.africa',
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
  if (origin.includes('pruhsms.africa')) return true;
  return false;
};

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || isAllowedOrigin(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRFToken', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Content-Length', 'X-Request-Id'],
  optionsSuccessStatus: 200,
  preflightContinue: false,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));



app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

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

// Mount routers - SPECIFIC paths BEFORE catch-all /api routers
app.use('/api', authRouter);
app.use('/api/teacher', teacherRouter);
app.use('/api/student', studentRouter);
app.use('/api/principal', principalRouter);
app.use('/api/finance', financeRouter);
app.use('/api', schoolRouter);
app.use('/api', superadminRouter);

// Sync database models — use alter only in dev; in production the schema is managed manually
db.sync({ alter: process.env.NODE_ENV !== 'production' })
  .then(() => console.log('✅ Database synchronized'))
  .catch(err => {
    console.error('❌ Database sync failed:', err.message);
    console.warn('⚠️  Continuing without sync — ensure schema is up to date manually.');
  });

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
