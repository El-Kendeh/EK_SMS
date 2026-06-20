const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const schoolScope = require('../middleware/schoolScope');

const {
  getOverview, listGradeApprovals, reviewGradeChange,
  listReportCards, publishReportCard, commentReportCard,
  getFinanceSnapshot, getSchoolCommandDashboard, getClassPerformance,
  getTeacherInsights, getActivityFeed, getSyllabusProgress,
  getFinanceUsers, createFinanceUser, updateFinanceUser,
  getFinanceStats, getFinanceAnalytics, getFinanceFees, recordExpense, getExpenses,
  getFeeCategories, createFeeCategory, assignFees,
  recordPayment, getPayments, getStudentFees,
} = require('../controllers/financeController');

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

router.get('/finance-users/', getFinanceUsers);
router.post('/finance-users/', createFinanceUser);
router.put('/finance-users/:id/', updateFinanceUser);

router.get('/stats/', getFinanceStats);
router.get('/analytics/', getFinanceAnalytics);
router.get('/fees/', getFinanceFees);
router.get('/fee-categories/', getFeeCategories);
router.post('/fee-categories/', createFeeCategory);
router.post('/fees/assign/', assignFees);
router.post('/payments/', recordPayment);
router.get('/payments/', getPayments);
router.get('/students/:student_id/fees/', getStudentFees);
router.post('/expenses/', recordExpense);
router.get('/expenses/', getExpenses);

module.exports = router;
