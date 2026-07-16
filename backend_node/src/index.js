// src/index.js
require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const db = require('./config/db');
require('./models');

const authRouter = require('./routes/auth');
const registrationRouter = require('./routes/registration');
// routes/approval removed — queried a nonexistent School.approval_status column
// (500 on every call) and duplicated the live path POST /api/schools/approve/.
const schoolRouter = require('./routes/school');
const teacherRouter = require('./routes/teacher');
const studentRouter = require('./routes/student');
const superadminRouter = require('./routes/superadmin');
const principalRouter = require('./routes/principal');
const financeRouter = require('./routes/finance');
const parentRouter = require('./routes/parent');
const whistleblowerRouter = require('./routes/whistleblower');
const liveClassesRouter = require('./routes/live-classes');
const verifyRouter = require('./routes/verify');
const { logFrontendEvent } = require('./controllers/loggingController');
const { testEmail } = require('./controllers/testController');
const { sendContact, contactLimiter } = require('./controllers/contactController');

const app = express();

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5000',
  'http://127.0.0.1:3000',
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
  // Match the pruhsms.africa apex + its subdomains ONLY. The old
  // origin.includes('pruhsms.africa') also matched attacker lookalikes like
  // https://pruhsms.africa.evil.com — check the parsed hostname instead.
  try {
    const host = new URL(origin).hostname;
    if (host === 'pruhsms.africa' || host.endsWith('.pruhsms.africa')) return true;
  } catch { /* non-URL origin → not allowed */ }
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

// Security headers. CSP is disabled here — this is a JSON API and the SPA
// (served from Vercel) owns its own CSP; a restrictive default would break
// nothing useful. crossOriginResourcePolicy is relaxed so the frontend origin
// can load badge/branding images served from /uploads.
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// Request logging (morgan was installed but never wired). 'combined' (Apache
// common log) in prod for log aggregators; concise 'dev' locally.
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));



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

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
// Frontend calls this on 403 to refresh CSRF; Node stack does not use Django CSRF — return 200 to avoid noisy 401s.
app.get(['/api/csrf-token', '/api/csrf-token/'], (req, res) => {
  res.json({ success: true, csrfToken: '' });
});
app.post('/api/logs', logFrontendEvent);
app.post('/api/logs/', logFrontendEvent); // Support both with and without trailing slash
app.post('/api/test-email', testEmail);
app.post('/api/test-email/', testEmail);
app.post('/api/contact', contactLimiter, sendContact);
app.post('/api/contact/', contactLimiter, sendContact);

// Mount routers - SPECIFIC paths BEFORE catch-all /api routers
app.use('/api', authRouter);
app.use(['/api/registration', '/registration'], registrationRouter);
app.use('/api/teacher', teacherRouter);
app.use('/api/student', studentRouter);
app.use('/api/principal', principalRouter);
app.use('/api/finance', financeRouter);
app.use('/api/parent', parentRouter);
app.use('/api/whistleblower', whistleblowerRouter);
app.use('/api/live-classes', liveClassesRouter);
app.use('/api/verify', verifyRouter); // public, no auth — before the /api catch-alls
app.use('/api', schoolRouter);
app.use('/api', superadminRouter);

// Sync database models — use alter only in dev; in production the schema is managed manually.
// Wait for the database to exist first (db.databaseReady) so a fresh deploy
// doesn't race "Unknown database" against the CREATE DATABASE step.
const dbReady = Promise.resolve(db.databaseReady)
  .then(() => db.sync({ alter: process.env.NODE_ENV !== 'production' }))
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

// Central error handler — catches anything routes forward via next(err) or a
// sync throw, logs it, and returns generic JSON. Without this, Express's
// default handler renders an HTML stack trace (info leak) on unexpected errors.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(`[error] ${req.method} ${req.originalUrl}:`, err.message);
  if (res.headersSent) return next(err);
  res.status(err.status || 500).json({
    success: false,
    message: 'Internal server error',
    status: err.status || 500,
  });
});

const PORT = process.env.PORT || 3000;
// Start listening only AFTER the schema sync settles. In dev, `alter: true`
// re-issues ALTERs on each boot and invalidates mysql2's prepared-statement
// cache; serving requests mid-sync caused transient ER_NEED_REPREPARE 500s.
dbReady.finally(() => app.listen(PORT, () => {
  console.log(`🚀 Backend listening on http://localhost:${PORT}`);
}));

module.exports = app;
