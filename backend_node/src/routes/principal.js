const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const schoolScope = require('../middleware/schoolScope');
const requireRole = require('../middleware/requireRole');
const requireActiveAccount = require('../middleware/requireActiveAccount');

const {
  getOverview, listGradeApprovals, reviewGradeChange,
  listReportCards, publishReportCard, commentReportCard,
  getSchoolCommandDashboard, getClassPerformance, getTeacherInsights,
  getFinanceSnapshot, getActivityFeed, getSyllabusProgress,
  getPrincipalUsers, createPrincipalUser, updatePrincipalUser,
  getAttendanceReport,
} = require('../controllers/principalController');

// Baseline: principal-console reads are visible to school leadership. The
// school-admin dashboard reuses several of these (attendance/syllabus/report
// cards), so school_admin is included. Students/parents/teachers use their own
// routers and never reach /api/principal/*.
const PRINCIPAL_ACCESS = ['superadmin', 'school_admin', 'principal'];
// Grade governance, report-card release, and minting principal logins are
// principal/superadmin actions (matches permissions.js grade-approvals/principal-users).
const PRINCIPAL_WRITE = ['superadmin', 'principal'];

router.use(authenticateToken);
// schoolScope lets superadmins target a school via ?school_id= (controllers
// resolve the school as req.schoolId || req.user.school_id).
router.use(schoolScope);
// Block tokens whose school was suspended/rejected after the token was minted.
router.use(requireActiveAccount);
// Default gate for the whole console; sensitive writes add a stricter requireRole.
router.use(requireRole(PRINCIPAL_ACCESS));

router.get('/overview/', getOverview);
router.get('/grade-approvals/', listGradeApprovals);
router.post('/grade-approvals/', requireRole(PRINCIPAL_WRITE), reviewGradeChange);
router.get('/report-cards/', listReportCards);
router.post('/report-cards/', requireRole(PRINCIPAL_WRITE), publishReportCard);
router.post('/report-cards/comment/', requireRole(PRINCIPAL_WRITE), commentReportCard);

router.get('/dashboard/', getSchoolCommandDashboard);
router.get('/class-performance/', getClassPerformance);
router.get('/teacher-insights/', getTeacherInsights);
router.get('/finance-snapshot/', getFinanceSnapshot);
router.get('/activity-feed/', getActivityFeed);
router.get('/syllabus-progress/', getSyllabusProgress);
router.get('/attendance-report/', getAttendanceReport);
router.get('/principal-users/', getPrincipalUsers);
router.post('/principal-users/', requireRole(PRINCIPAL_WRITE), createPrincipalUser);
router.put('/principal-users/:id/', requireRole(PRINCIPAL_WRITE), updatePrincipalUser);

module.exports = router;
