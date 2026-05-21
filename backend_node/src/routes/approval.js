/**
 * School Approval Routes
 * Superadmin only
 */

const express = require('express');
const { authenticate, requireRole } = require('../middleware/auth');
const {
  getPendingSchools,
  getSchoolForReview,
  approveSchool,
  rejectSchool,
  getApprovedSchools,
} = require('../controllers/approvalController');

const router = express.Router();

// All routes require superadmin authentication
router.use(authenticate);
router.use(requireRole('superadmin'));

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
