/**
 * Finance / Bursar API helpers.
 * Covers the full `/api/finance/*` suite (routes/finance.js — auth only,
 * school-scoped via the token's school_id) plus the school-scoped lookup
 * endpoints the finance pages need for pickers (classes, students, terms).
 */
import apiClient from './client';

/** Build a query string, skipping empty/null/undefined values. */
const qs = (params = {}) => {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== ''
  );
  return entries.length ? `?${new URLSearchParams(entries).toString()}` : '';
};

export const financeApi = {
  /* ── Overview / dashboard ─────────────────────────────────── */
  async getOverview() {
    return apiClient.get('/api/finance/overview/');
  },
  async getStats() {
    // → { total_collected, outstanding_balance, expenses, balance, total_students }
    return apiClient.get('/api/finance/stats/');
  },
  async getFinanceSnapshot() {
    // → { revenue, outstanding, paymentsToday, transactions[] }
    return apiClient.get('/api/finance/finance-snapshot/');
  },
  async getActivityFeed() {
    // → { items[] } each { kind, text, at }
    return apiClient.get('/api/finance/activity-feed/');
  },
  async getDashboard() {
    return apiClient.get('/api/finance/dashboard/');
  },
  async getAnalytics(params = {}) {
    // params: date_from, date_to (SQL-side aggregation — not capped at 200 rows)
    // → { summary, monthly[], methods[], expense_categories[], top_debtors[] }
    return apiClient.get(`/api/finance/analytics/${qs(params)}`);
  },

  /* ── Fees ─────────────────────────────────────────────────── */
  async getFees(params = {}) {
    // params: class_id, status (pending|partial|paid), student_id
    return apiClient.get(`/api/finance/fees/${qs(params)}`);
  },
  async getStudentFees(studentId) {
    // → { fees[], payments[], summary: { total_due, total_paid, balance } }
    return apiClient.get(`/api/finance/students/${studentId}/fees/`);
  },
  async assignFees({ feeCategoryId, studentIds, termId, discount, discountPercent, discountReason, installments }) {
    return apiClient.post('/api/finance/fees/assign/', {
      fee_category_id: feeCategoryId,
      student_ids: studentIds,
      term_id: termId || null,
      discount: discount || 0,
      // Scholarship as a percentage (0–99.99) wins over the absolute discount.
      discount_percent: discountPercent ?? null,
      discount_reason: discountReason || null,
      // Installment plan: N equal parts of amount_due (1 = pay in full).
      installments: installments || 1,
    });
  },

  /* ── Fee categories (GET/POST only — no update/delete route) ─ */
  async getFeeCategories() {
    return apiClient.get('/api/finance/fee-categories/');
  },
  async createFeeCategory({ name, amount, description, frequency, applicableClasses, lateFeeAmount, graceDays }) {
    return apiClient.post('/api/finance/fee-categories/', {
      name,
      amount,
      description: description || '',
      frequency: frequency || 'term',
      // Late-fee policy (plan 4.1): flat penalty once past due + grace days.
      late_fee_amount: lateFeeAmount ?? 0,
      grace_days: graceDays ?? 0,
      applicable_classes: applicableClasses && applicableClasses.length ? applicableClasses : null,
    });
  },
  // L17: edit a category, or deactivate it (is_active:false) — safer than delete.
  async updateFeeCategory(id, payload) {
    return apiClient.put(`/api/finance/fee-categories/${id}/`, payload);
  },

  /* ── Payments ─────────────────────────────────────────────── */
  async getPayments(params = {}) {
    // params: student_id, date_from, date_to
    return apiClient.get(`/api/finance/payments/${qs(params)}`);
  },
  async recordPayment({ studentId, amount, feeId, paymentMethod, reference, notes, paidBy }) {
    // backend adds amount to fee.amount_paid arithmetically — must be a Number
    return apiClient.post('/api/finance/payments/', {
      student_id: studentId,
      amount: Number(amount),
      fee_id: feeId || null,
      payment_method: paymentMethod || 'cash',
      reference: reference || null,
      notes: notes || null,
      paid_by: paidBy || null,
    });
  },

  /* ── Expenses ─────────────────────────────────────────────── */
  async getExpenses(params = {}) {
    // params: category, date_from, date_to, status (pending|approved|rejected)
    // → { expenses[], total (approved all-time), pending_total, counts:{pending,approved,rejected} }
    return apiClient.get(`/api/finance/expenses/${qs(params)}`);
  },
  async recordExpense({ description, amount, category, date }) {
    // Recorded as PENDING — a principal/school_admin must approve before it hits the books.
    return apiClient.post('/api/finance/expenses/', {
      description,
      amount: Number(amount),
      category: category || 'general',
      date: date || null,
    });
  },
  async reviewExpense({ id, action, reason }) {
    // action: 'approve' | 'reject'. reason required when rejecting.
    return apiClient.post(`/api/finance/expenses/${id}/review/`, {
      action,
      reason: reason || null,
    });
  },

  /* ── Finance users (PUT only toggles is_active) ───────────── */
  async getFinanceUsers() {
    return apiClient.get('/api/finance/finance-users/');
  },
  async createFinanceUser({ fullName, email, phone, username, password, role, accessLevel }) {
    return apiClient.post('/api/finance/finance-users/', {
      full_name: fullName,
      email,
      phone: phone || null,
      username: username || email,
      password: password || undefined,
      role: role || 'Bursar',
      access_level: accessLevel || 'Full',
    });
  },
  async toggleFinanceUser(id) {
    return apiClient.put(`/api/finance/finance-users/${id}/`, {});
  },

  /* ── Grade approvals / report cards (bursar shares workflow) ─ */
  async listGradeApprovals(params = {}) {
    return apiClient.get(`/api/finance/grade-approvals/${qs(params)}`);
  },
  async reviewGradeChange({ gradeIds, action, comment }) {
    return apiClient.post('/api/finance/grade-approvals/', {
      grade_ids: gradeIds, action, comment,
    });
  },
  async listReportCards() {
    return apiClient.get('/api/finance/report-cards/');
  },

  /* ── P1 (plan 4.2/4.3): receipts, finance dashboards, budgets ── */
  async getReceipt(receiptNumber) {
    // → { receipt: { receipt_number, amount, student_name, qr_data_url, verify_url, ... } }
    return apiClient.get(`/api/finance/receipts/${encodeURIComponent(receiptNumber)}/`);
  },
  async getCollectionAnalytics(by = 'term') {
    // → { by, rows: [{ key, label, due, paid, outstanding, rate }] }
    return apiClient.get(`/api/finance/analytics/collection/?by=${by}`);
  },
  async getCashFlow() {
    // → { months: [{ month:'YYYY-MM', inflow, outflow, net }] } (last 12)
    return apiClient.get('/api/finance/analytics/cashflow/');
  },
  async getBudgets() {
    // → { budgets: [{ id, term_id, term_name, category, amount, actual_revenue, variance, attainment }] }
    return apiClient.get('/api/finance/budgets/');
  },
  async saveBudget({ termId, category, amount, notes }) {
    // Upserts on (school, term, category).
    return apiClient.post('/api/finance/budgets/', {
      term_id: termId || null, category: category || 'general', amount: Number(amount), notes: notes || null,
    });
  },
  async deleteBudget(id) {
    return apiClient.delete(`/api/finance/budgets/${id}/`);
  },

  /* ── School-scoped lookups for pickers (auth + schoolScope) ── */
  async getClasses() {
    return apiClient.get('/api/school/classes/');
  },
  async getStudents(params = {}) {
    // params: classroom_id
    return apiClient.get(`/api/school/students/${qs(params)}`);
  },
  async getTerms() {
    return apiClient.get('/api/school/terms/');
  },
};

export default financeApi;
