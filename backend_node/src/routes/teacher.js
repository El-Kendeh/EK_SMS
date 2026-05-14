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

// Middleware to ensure user is a teacher
function isTeacher(req, res, next) {
  console.log(`[AUTH DEBUG] User: ${req.user.username}, Role: ${req.user.role}`);
  if (req.user && (req.user.role === 'teacher' || req.user.role === 'staff' || req.user.is_superuser)) {
    next();
  } else {
    return res.status(403).json({ 
      success: false, 
      message: `Access denied. Teacher role required. Current role: ${req.user.role || 'none'}` 
    });
  }
}

router.use(isTeacher);

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
