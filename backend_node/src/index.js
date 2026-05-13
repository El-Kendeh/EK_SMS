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

const app = express();

const allowedOrigins = [
  'http://localhost:3000',
  'https://pruhsms.africa',
  'https://www.pruhsms.africa',
  'https://backend.pruhsms.africa',
  'https://ek-sms-one.vercel.app'
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Health check endpoint
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

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
