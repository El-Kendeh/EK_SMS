const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const schoolScope = require('../middleware/schoolScope');

const {
  getOverview, listGradeApprovals, reviewGradeChange,
  listReportCards, publishReportCard, commentReportCard,
  getSchoolCommandDashboard, getClassPerformance, getTeacherInsights,
  getFinanceSnapshot, getActivityFeed, getSyllabusProgress,
  getPrincipalUsers, createPrincipalUser, updatePrincipalUser,
  getAttendanceReport,
} = require('../controllers/principalController');

router.use(authenticateToken);
// schoolScope lets superadmins target a school via ?school_id= (controllers
// resolve the school as req.schoolId || req.user.school_id).
router.use(schoolScope);

router.get('/overview/', getOverview);
router.get('/grade-approvals/', listGradeApprovals);
router.post('/grade-approvals/', reviewGradeChange);
router.get('/report-cards/', listReportCards);
router.post('/report-cards/', publishReportCard);
router.post('/report-cards/comment/', commentReportCard);

router.get('/dashboard/', getSchoolCommandDashboard);
router.get('/class-performance/', getClassPerformance);
router.get('/teacher-insights/', getTeacherInsights);
router.get('/finance-snapshot/', getFinanceSnapshot);
router.get('/activity-feed/', getActivityFeed);
router.get('/syllabus-progress/', getSyllabusProgress);
router.get('/attendance-report/', getAttendanceReport);
router.get('/principal-users/', getPrincipalUsers);
router.post('/principal-users/', createPrincipalUser);
router.put('/principal-users/:id/', updatePrincipalUser);

module.exports = router;
