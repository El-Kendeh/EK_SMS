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

// Middleware to ensure user is a teacher or authorized staff
async function isTeacher(req, res, next) {
  try {
    const allowedRoles = ['teacher', 'staff', 'superadmin', 'school_admin'];
    if (req.user && allowedRoles.includes(req.user.role)) {
      return next();
    }

    // Fallback: Check DB directly in case of stale token
    if (req.user && req.user.id) {
      const Teacher = require('../models/Teacher');
      const teacherLink = await Teacher.findOne({ where: { user_id: req.user.id } });
      if (teacherLink) {
        req.user.role = 'teacher';
        return next();
      }
    }

    console.warn(`[AUTH] Teacher access denied — User: ${req.user?.username}, Role: ${req.user?.role}, ID: ${req.user?.id}`);
    return res.status(403).json({
      success: false,
      message: `This area is for teachers only. Your account role is "${req.user?.role || 'unknown'}". If you should have teacher access, ask your school admin to link your account to a teacher profile.`,
      debug: { role: req.user?.role, userId: req.user?.id }
    });
  } catch (err) {
    console.error('isTeacher Middleware Error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error verifying role.' });
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
