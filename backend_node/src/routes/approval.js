/**
 * School Approval Routes
 * Superadmin only
 */

const express = require('express');
const authenticateToken = require('../middleware/auth');
const approvalController = require('../controllers/approvalController');

if (!approvalController || typeof approvalController !== 'object') {
  throw new Error('Approval controller failed to load');
}
if (typeof approvalController.getPendingSchools !== 'function') {
  throw new Error('Missing getPendingSchools export in approvalController');
}
if (typeof approvalController.getSchoolForReview !== 'function') {
  throw new Error('Missing getSchoolForReview export in approvalController');
}
if (typeof approvalController.approveSchool !== 'function') {
  throw new Error('Missing approveSchool export in approvalController');
}
if (typeof approvalController.rejectSchool !== 'function') {
  throw new Error('Missing rejectSchool export in approvalController');
}
if (typeof approvalController.getApprovedSchools !== 'function') {
  throw new Error('Missing getApprovedSchools export in approvalController');
}
if (typeof authenticateToken !== 'function') {
  throw new Error('Missing authenticateToken export in auth middleware');
}

const router = express.Router();

function assertHandler(fn, name) {
  if (typeof fn !== 'function') {
    throw new Error(`Route handler "${name}" is not defined or not a function`);
  }
  return fn;
}

const {
  getPendingSchools,
  getSchoolForReview,
  approveSchool,
  rejectSchool,
  getApprovedSchools,
} = approvalController;

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
router.get(
  '/pending-schools',
  assertHandler(getPendingSchools, 'getPendingSchools')
);

/**
 * GET /api/approval/approved-schools
 * List all approved schools
 */
router.get(
  '/approved-schools',
  assertHandler(getApprovedSchools, 'getApprovedSchools')
);

/**
 * GET /api/approval/school/:schoolId
 * Get detailed school info for review
 */
router.get(
  '/school/:schoolId',
  assertHandler(getSchoolForReview, 'getSchoolForReview')
);

/**
 * POST /api/approval/approve-school
 * Approve a school registration
 */
router.post(
  '/approve-school',
  assertHandler(approveSchool, 'approveSchool')
);

/**
 * POST /api/approval/reject-school
 * Reject a school registration with reason
 */
router.post(
  '/reject-school',
  assertHandler(rejectSchool, 'rejectSchool')
);

module.exports = router;
