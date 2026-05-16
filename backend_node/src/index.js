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

console.log('🔍 Checking environment variables...');
console.log('DB_NAME:', process.env.DB_NAME);

/*
|--------------------------------------------------------------------------
| SIMPLE CORS SETUP
|--------------------------------------------------------------------------
*/

app.use(cors({
  origin: [
    'https://pruhsms.africa',
    'https://www.pruhsms.africa',
    'https://ek-sms-one.vercel.app'
  ],
  credentials: true
}));

app.options('*', cors());

/*
|--------------------------------------------------------------------------
| BODY PARSER
|--------------------------------------------------------------------------
*/

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({
  limit: '50mb',
  extended: true
}));

/*
|--------------------------------------------------------------------------
| UPLOADS
|--------------------------------------------------------------------------
*/

const uploadsRoot = path.join(__dirname, '../../uploads');

try {
  fs.mkdirSync(path.join(uploadsRoot, 'branding'), { recursive: true });
  fs.mkdirSync(path.join(uploadsRoot, 'badges'), { recursive: true });
} catch (err) {
  console.error(err);
}

app.use('/uploads', express.static(uploadsRoot));

/*
|--------------------------------------------------------------------------
| PUBLIC ROUTES
|--------------------------------------------------------------------------
*/

app.get('/', (req, res) => {
  res.json({
    message: 'EK-SMS Backend API',
    status: 'Running'
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get(['/api/csrf-token', '/api/csrf-token/'], (req, res) => {
  res.json({
    success: true,
    csrfToken: ''
  });
});

/*
|--------------------------------------------------------------------------
| LOGGING & TEST
|--------------------------------------------------------------------------
*/

app.post('/api/logs', logFrontendEvent);
app.post('/api/logs/', logFrontendEvent);

app.post('/api/test-email', testEmail);
app.post('/api/test-email/', testEmail);

/*
|--------------------------------------------------------------------------
| ROUTES
|--------------------------------------------------------------------------
*/

app.use('/api', authRouter);
app.use('/api', schoolRouter);
app.use('/api', superadminRouter);

app.use('/api/teacher', teacherRouter);
app.use('/api/student', studentRouter);

/*
|--------------------------------------------------------------------------
| DATABASE
|--------------------------------------------------------------------------
*/

db.sync({ alter: true })
  .then(() => {
    console.log('✅ Database synchronized');
  })
  .catch((err) => {
    console.error('❌ Database sync failed:', err);
  });

/*
|--------------------------------------------------------------------------
| 404
|--------------------------------------------------------------------------
*/

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

/*
|--------------------------------------------------------------------------
| START SERVER
|--------------------------------------------------------------------------
*/

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 Backend running on port ${PORT}`);
});

module.exports = app;