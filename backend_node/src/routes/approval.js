/**
 * School Approval Routes
 * Superadmin only
 */

const express = require('express');
const authenticateToken = require('../middleware/auth');
const {
  getPendingSchools,
  getSchoolForReview,
  approveSchool,
  rejectSchool,
  getApprovedSchools,
} = require('../controllers/approvalController');

const router = express.Router();

function isSuperadmin(req, res, next) {
  if (req.user && (req.user.is_superuser || req.user.role === 'superadmin' || req.user.role === 'admin')) {
    next();
  } else {
    return res.status(403).json({ success: false, message: 'Access denied. Superadmin only.' });
  }
}

// All routes require superadmin authentication
router.use(authenticateToken);
router.use(isSuperadmin);

/**
 * GET /api/approval/pending-schools
 * List all schools awaiting approval
 */
router.get('/pending-schools', getPendingSchools);

/**
 * GET /api/approval/approved-schools
 * List all approved schools
 */
router.get('/approved-schools', getApprovedSchools);

/**
 * GET /api/approval/school/:schoolId
 * Get detailed school info for review
 */
router.get('/school/:schoolId', getSchoolForReview);

/**
 * POST /api/approval/approve-school
 * Approve a school registration
 */
router.post('/approve-school', approveSchool);

/**
 * POST /api/approval/reject-school
 * Reject a school registration with reason
 */
router.post('/reject-school', rejectSchool);

module.exports = router;
