// src/routes/teacher.js
const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');

const {
  getTeacherMe,
  getTeacherClasses,
  getTeacherStudents,
  getTeacherGradebook,
  saveGradeDraft,
  submitGradesForLocking,
  getGradeHistory,
} = require('../controllers/teacherController');

// Apply to all teacher routes
router.use(authenticateToken);

// GET /api/teacher/me/
router.get('/me/', getTeacherMe);

// GET /api/teacher/classes/
router.get('/classes/', getTeacherClasses);

// GET /api/teacher/students/
router.get('/students/', getTeacherStudents);

// GET /api/teacher/gradebook/
router.get('/gradebook/', getTeacherGradebook);

// POST /api/teacher/gradebook/
router.post('/gradebook/', saveGradeDraft);

// POST /api/teacher/grades/lock/
router.post('/grades/lock/', submitGradesForLocking);

// GET /api/teacher/grades/:id/history/
router.get('/grades/:id/history/', getGradeHistory);

module.exports = router;
