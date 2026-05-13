// src/routes/student.js
const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');

const {
  getStudentMe,
  getStudentGrades,
  getStudentAttendance,
} = require('../controllers/studentController');

// Apply to all student routes
router.use(authenticateToken);

// GET /api/student/me/
router.get('/me/', getStudentMe);

// GET /api/student/grades/
router.get('/grades/', getStudentGrades);

// GET /api/student/attendance/
router.get('/attendance/', getStudentAttendance);

module.exports = router;
