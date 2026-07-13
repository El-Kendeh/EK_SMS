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
  getGradeAudit, getAcademicsAnalytics,
  postAnnouncement, listAnnouncements,
  getAtRisk, getStudentProfile,
  getDisciplineIncidents, getTimetableOversight, getTeacherRoster,
} = require('../controllers/principalController');

// Baseline: principal-console reads are visible to school leadership. The
// school-admin dashboard reuses several of these (attendance/syllabus/report
// cards), so school_admin is included. Students/parents/teachers use their own
// routers and never reach /api/principal/*.
const PRINCIPAL_ACCESS = ['superadmin', 'school_admin', 'principal'];
// Governance reads (grade approvals, leadership roster) match permissions.js:
// school_admin has no grade-governance or leadership pages, so it gets no API.
const PRINCIPAL_ONLY_READ = ['superadmin', 'principal'];
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
router.get('/grade-approvals/', requireRole(PRINCIPAL_ONLY_READ), listGradeApprovals);
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
router.get('/principal-users/', requireRole(PRINCIPAL_ONLY_READ), getPrincipalUsers);
router.post('/principal-users/', requireRole(PRINCIPAL_WRITE), createPrincipalUser);
router.put('/principal-users/:id/', requireRole(PRINCIPAL_WRITE), updatePrincipalUser);

// ── Batch-3 leadership features ──
// These are leadership-only surfaces (permissions.js grants them to
// principal/superadmin, NOT school_admin), so they must NOT inherit the
// router-wide PRINCIPAL_ACCESS gate that includes school_admin.
router.get('/grade-audit/', requireRole(PRINCIPAL_ONLY_READ), getGradeAudit);
router.get('/academics-analytics/', requireRole(PRINCIPAL_ONLY_READ), getAcademicsAnalytics);
router.get('/announcements/', requireRole(PRINCIPAL_ONLY_READ), listAnnouncements);
router.post('/announcements/', requireRole(PRINCIPAL_WRITE), postAnnouncement);
router.get('/at-risk/', requireRole(PRINCIPAL_ONLY_READ), getAtRisk);
// P1 oversight surfaces (leadership reads).
router.get('/discipline/', requireRole(PRINCIPAL_ONLY_READ), getDisciplineIncidents);
router.get('/timetable/', requireRole(PRINCIPAL_ONLY_READ), getTimetableOversight);
router.get('/teacher-roster/', requireRole(PRINCIPAL_ONLY_READ), getTeacherRoster);
router.get('/students/:id/', requireRole(PRINCIPAL_ONLY_READ), getStudentProfile);

module.exports = router;
