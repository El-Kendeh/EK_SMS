const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const schoolScope = require('../middleware/schoolScope');
const requireRole = require('../middleware/requireRole');
const requireActiveAccount = require('../middleware/requireActiveAccount');

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

// Baseline: who may reach the finance suite at all. Finance pages are used only by
// the bursar, school leadership, and superadmin (via impersonation/scope); students,
// parents and teachers use their own /api/student|parent|teacher routers.
const FINANCE_ACCESS = ['superadmin', 'school_admin', 'principal', 'bursar'];
// Money-moving writes: record payments, assign fees, create fee categories.
const FINANCE_WRITE = ['superadmin', 'school_admin', 'bursar'];
// Provisioning a finance-staff login is an admin action.
const ACCOUNT_ADMIN = ['superadmin', 'school_admin'];
// Grade governance + report-card release are academic-leadership actions.
const ACADEMIC_WRITE = ['superadmin', 'principal'];
// Finance staff who may RECORD an expense (bursar + school leadership; superadmin for impersonation).
const CAN_RECORD_EXPENSE = ['bursar', 'school_admin', 'principal', 'superadmin'];
// Only school leadership may APPROVE/REJECT — the recording bursar cannot approve their own.
const CAN_APPROVE_EXPENSE = ['school_admin', 'principal', 'superadmin'];

router.use(authenticateToken);
// schoolScope lets superadmins target a school via ?school_id= (controllers
// resolve the school as req.schoolId || req.user.school_id).
router.use(schoolScope);
// Block tokens whose school was suspended/rejected after the token was minted.
router.use(requireActiveAccount);
// Default gate for the whole suite. Sensitive writes add a stricter requireRole below.
router.use(requireRole(FINANCE_ACCESS));

router.get('/overview/', getOverview);
router.get('/grade-approvals/', listGradeApprovals);
router.post('/grade-approvals/', requireRole(ACADEMIC_WRITE), reviewGradeChange);
router.get('/report-cards/', listReportCards);
router.post('/report-cards/', requireRole(ACADEMIC_WRITE), publishReportCard);
router.post('/report-cards/comment/', requireRole(ACADEMIC_WRITE), commentReportCard);

router.get('/dashboard/', getSchoolCommandDashboard);
router.get('/class-performance/', getClassPerformance);
router.get('/teacher-insights/', getTeacherInsights);
router.get('/finance-snapshot/', getFinanceSnapshot);
router.get('/activity-feed/', getActivityFeed);
router.get('/syllabus-progress/', getSyllabusProgress);

router.get('/finance-users/', getFinanceUsers);
router.post('/finance-users/', requireRole(ACCOUNT_ADMIN), createFinanceUser);
router.put('/finance-users/:id/', requireRole(ACCOUNT_ADMIN), updateFinanceUser);

router.get('/stats/', getFinanceStats);
router.get('/analytics/', getFinanceAnalytics);
router.get('/fees/', getFinanceFees);
router.get('/fee-categories/', getFeeCategories);
router.post('/fee-categories/', requireRole(FINANCE_WRITE), createFeeCategory);
router.put('/fee-categories/:id/', requireRole(FINANCE_WRITE), updateFeeCategory);
router.post('/fees/assign/', requireRole(FINANCE_WRITE), assignFees);
router.post('/payments/', requireRole(FINANCE_WRITE), recordPayment);
router.get('/payments/', getPayments);
router.get('/students/:student_id/fees/', getStudentFees);
router.post('/expenses/', requireRole(CAN_RECORD_EXPENSE), recordExpense);
router.get('/expenses/', getExpenses);
router.post('/expenses/:id/review/', requireRole(CAN_APPROVE_EXPENSE), reviewExpense);

module.exports = router;
