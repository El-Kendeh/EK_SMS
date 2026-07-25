const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const schoolScope = require('../middleware/schoolScope');
const requireRole = require('../middleware/requireRole');
const requireActiveAccount = require('../middleware/requireActiveAccount');
const { ROLE_GATES } = require('../config/permissions');

const {
  getOverview, listGradeApprovals, reviewGradeChange,
  listReportCards, publishReportCard, commentReportCard,
  getSchoolCommandDashboard, getClassPerformance, getTeacherInsights,
  getFinanceSnapshot, getActivityFeed, getSyllabusProgress,
  getPrincipalUsers, createPrincipalUser, updatePrincipalUser,
  getAttendanceReport,
  getGradeAudit, getAcademicsAnalytics,
  postAnnouncement, listAnnouncements,
  getAtRisk, getStudentProfile,
} = require('../controllers/principalController');

router.use(authenticateToken);
// schoolScope lets superadmins target a school via ?school_id= (controllers
// resolve the school as req.schoolId || req.user.school_id).
router.use(schoolScope);
// Block tokens whose school was suspended/rejected after the token was minted.
router.use(requireActiveAccount);
// Default gate for the whole console; sensitive writes add a stricter requireRole.
router.use(requireRole(ROLE_GATES.PRINCIPAL_ACCESS));

router.get('/overview/', getOverview);
router.get('/grade-approvals/', requireRole(ROLE_GATES.PRINCIPAL_ONLY_READ), listGradeApprovals);
router.post('/grade-approvals/', requireRole(ROLE_GATES.PRINCIPAL_WRITE), reviewGradeChange);
router.get('/report-cards/', listReportCards);
router.post('/report-cards/', requireRole(ROLE_GATES.PRINCIPAL_WRITE), publishReportCard);
router.post('/report-cards/comment/', requireRole(ROLE_GATES.PRINCIPAL_WRITE), commentReportCard);

router.get('/dashboard/', getSchoolCommandDashboard);
router.get('/class-performance/', getClassPerformance);
router.get('/teacher-insights/', getTeacherInsights);
router.get('/finance-snapshot/', getFinanceSnapshot);
router.get('/activity-feed/', getActivityFeed);
router.get('/syllabus-progress/', getSyllabusProgress);
router.get('/attendance-report/', getAttendanceReport);
router.get('/principal-users/', requireRole(ROLE_GATES.PRINCIPAL_ONLY_READ), getPrincipalUsers);
router.post('/principal-users/', requireRole(ROLE_GATES.PRINCIPAL_WRITE), createPrincipalUser);
router.put('/principal-users/:id/', requireRole(ROLE_GATES.PRINCIPAL_WRITE), updatePrincipalUser);

router.get('/grade-audit/', requireRole(ROLE_GATES.PRINCIPAL_ONLY_READ), getGradeAudit);
router.get('/academics-analytics/', requireRole(ROLE_GATES.PRINCIPAL_ONLY_READ), getAcademicsAnalytics);
router.get('/announcements/', requireRole(ROLE_GATES.PRINCIPAL_ONLY_READ), listAnnouncements);
router.post('/announcements/', requireRole(ROLE_GATES.PRINCIPAL_WRITE), postAnnouncement);
router.get('/at-risk/', requireRole(ROLE_GATES.PRINCIPAL_ONLY_READ), getAtRisk);
router.get('/students/:id/', requireRole(ROLE_GATES.PRINCIPAL_ONLY_READ), getStudentProfile);

module.exports = router;
