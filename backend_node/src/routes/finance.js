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
  getFinanceSnapshot, getSchoolCommandDashboard, getClassPerformance,
  getTeacherInsights, getActivityFeed, getSyllabusProgress,
  getFinanceUsers, createFinanceUser, updateFinanceUser,
  getFinanceStats, getFinanceAnalytics, getFinanceFees, recordExpense, getExpenses, reviewExpense,
  getFeeCategories, createFeeCategory, updateFeeCategory, assignFees,
  recordPayment, getPayments, getStudentFees,
} = require('../controllers/financeController');

router.use(authenticateToken);
router.use(schoolScope);
router.use(requireActiveAccount);
router.use(requireRole(ROLE_GATES.FINANCE_ACCESS));

router.get('/overview/', getOverview);
router.get('/grade-approvals/', listGradeApprovals);
router.post('/grade-approvals/', requireRole(ROLE_GATES.ACADEMIC_WRITE), reviewGradeChange);
router.get('/report-cards/', listReportCards);
router.post('/report-cards/', requireRole(ROLE_GATES.ACADEMIC_WRITE), publishReportCard);
router.post('/report-cards/comment/', requireRole(ROLE_GATES.ACADEMIC_WRITE), commentReportCard);

router.get('/dashboard/', getSchoolCommandDashboard);
router.get('/class-performance/', getClassPerformance);
router.get('/teacher-insights/', getTeacherInsights);
router.get('/finance-snapshot/', getFinanceSnapshot);
router.get('/activity-feed/', getActivityFeed);
router.get('/syllabus-progress/', getSyllabusProgress);

router.get('/finance-users/', getFinanceUsers);
router.post('/finance-users/', requireRole(ROLE_GATES.ACCOUNT_ADMIN), createFinanceUser);
router.put('/finance-users/:id/', requireRole(ROLE_GATES.ACCOUNT_ADMIN), updateFinanceUser);

router.get('/stats/', getFinanceStats);
router.get('/analytics/', getFinanceAnalytics);
router.get('/fees/', getFinanceFees);
router.get('/fee-categories/', getFeeCategories);
router.post('/fee-categories/', requireRole(ROLE_GATES.FINANCE_WRITE), createFeeCategory);
router.put('/fee-categories/:id/', requireRole(ROLE_GATES.FINANCE_WRITE), updateFeeCategory);
router.post('/fees/assign/', requireRole(ROLE_GATES.FINANCE_WRITE), assignFees);
router.post('/payments/', requireRole(ROLE_GATES.FINANCE_WRITE), recordPayment);
router.get('/payments/', getPayments);
router.get('/students/:student_id/fees/', getStudentFees);
router.post('/expenses/', requireRole(ROLE_GATES.CAN_RECORD_EXPENSE), recordExpense);
router.get('/expenses/', getExpenses);
router.post('/expenses/:id/review/', requireRole(ROLE_GATES.CAN_APPROVE_EXPENSE), reviewExpense);

module.exports = router;
