// src/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const db = require('./config/db');

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
console.log('   - RESEND_API_KEY:', process.env.RESEND_API_KEY ? '✅ Loaded' : '❌ NOT LOADED');

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
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['*']
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Public endpoints
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Backend listening on http://localhost:${PORT}`);
});

module.exports = app;
