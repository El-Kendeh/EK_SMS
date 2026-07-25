require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const bodyParser = require('body-parser');
require('./models');

const authRouter = require('./routes/auth');
const registrationRouter = require('./routes/registration');
const approvalRouter = require('./routes/approval');
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
const { notFoundHandler, serverErrorHandler } = require('./middleware/errorHandler');

const app = express();

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5000',
  'http://127.0.0.1:3000',
  'https://backend.pruhsms.africa',
  'https://pruhsms.africa',
  'https://www.pruhsms.africa',
  'https://ek-sms-one.vercel.app',
];

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

app.get('/', (req, res) => {
  res.json({
    message: 'EK-SMS Backend API',
    status: 'Running',
    version: '1.0.0',
    documentation: '/api/health',
  });
});

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.get(['/api/csrf-token', '/api/csrf-token/'], (req, res) => {
  res.json({ success: true, csrfToken: '' });
});
app.post('/api/logs', logFrontendEvent);
app.post('/api/logs/', logFrontendEvent);
app.post('/api/test-email', testEmail);
app.post('/api/test-email/', testEmail);
app.post('/api/contact', contactLimiter, sendContact);
app.post('/api/contact/', contactLimiter, sendContact);

app.use('/api', authRouter);
app.use(['/api/registration', '/registration'], registrationRouter);
app.use('/api/approval', approvalRouter);
app.use('/api/teacher', teacherRouter);
app.use('/api/student', studentRouter);
app.use('/api/principal', principalRouter);
app.use('/api/finance', financeRouter);
app.use('/api/parent', parentRouter);
app.use('/api/whistleblower', whistleblowerRouter);
app.use('/api/live-classes', liveClassesRouter);
app.use('/api/verify', verifyRouter);
app.use('/api', schoolRouter);
app.use('/api', superadminRouter);

app.use(notFoundHandler);
app.use(serverErrorHandler);

module.exports = app;
