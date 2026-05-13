const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');

const {
  getAllSchools,
  handleSchoolAction,
  impersonate,
  getGradeAlerts,
  getSystemHealth
} = require('../controllers/superadminController');

// Middleware to ensure the user is a superadmin
function isSuperadmin(req, res, next) {
  if (req.user && (req.user.is_superuser || req.user.role === 'superadmin' || req.user.role === 'admin')) {
    next();
  } else {
    return res.status(403).json({ success: false, message: "Access denied. Superadmin only." });
  }
}

// Apply auth and superadmin check to all routes in this router
router.use(authenticateToken);
router.use(isSuperadmin);

// GET /api/schools/
router.get('/schools/', getAllSchools);

// POST /api/schools/approve/
router.post('/schools/approve/', handleSchoolAction);

// POST /api/impersonate/
router.post('/impersonate/', impersonate);

// GET /api/grade-alerts/
router.get('/grade-alerts/', getGradeAlerts);

// GET /api/system-health/
router.get('/system-health/', getSystemHealth);

module.exports = router;
