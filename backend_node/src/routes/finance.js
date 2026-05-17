const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');

const {
  getOverview, listGradeApprovals, reviewGradeChange,
  listReportCards, publishReportCard, commentReportCard,
  getFinanceSnapshot, getSchoolCommandDashboard, getClassPerformance,
  getTeacherInsights, getActivityFeed, getSyllabusProgress,
  getFinanceUsers, createFinanceUser, updateFinanceUser,
} = require('../controllers/financeController');

router.use(authenticateToken);

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

router.get('/finance-users/', getFinanceUsers);
router.post('/finance-users/', createFinanceUser);
router.put('/finance-users/:id/', updateFinanceUser);

module.exports = router;
