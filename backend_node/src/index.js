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

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Health check endpoint
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Mount routers
app.use('/api', authRouter);
app.use('/api', schoolRouter);
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
