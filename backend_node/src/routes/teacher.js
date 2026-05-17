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

router.use(authenticateToken);

async function isTeacher(req, res, next) {
  try {
    const allowedRoles = ['teacher', 'staff', 'superadmin', 'school_admin'];
    if (req.user && allowedRoles.includes(req.user.role)) {
      return next();
    }
    if (req.user && req.user.id) {
      const Teacher = require('../models/Teacher');
      const teacherLink = await Teacher.findOne({ where: { user_id: req.user.id } });
      if (teacherLink) {
        req.user.role = 'teacher';
        return next();
      }
    }
    console.warn(`[AUTH] Teacher access denied — User: ${req.user?.username}, Role: ${req.user?.role}`);
    return res.status(403).json({
      success: false,
      message: `This area is for teachers only. Your account role is "${req.user?.role || 'unknown'}".`
    });
  } catch (err) {
    console.error('isTeacher Middleware Error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error verifying role.' });
  }
}

router.use(isTeacher);

router.get('/me/', getTeacherMe);
router.get('/classes/', getTeacherClasses);
router.get('/students/', getTeacherStudents);
router.get('/gradebook/', getTeacherGradebook);
router.post('/gradebook/', saveGradeDraft);
router.post('/grades/lock/', submitGradesForLocking);
router.get('/grades/:id/history/', getGradeHistory);

module.exports = router;
