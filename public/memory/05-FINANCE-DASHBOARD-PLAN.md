# Finance / Bursar Dashboard — Build Plan (Priority #2, after Principal)

> ✅ **EXECUTED 2026-06-11** — see [03-FRONTEND-STATUS.md](03-FRONTEND-STATUS.md) §Bursar for what was actually built.
> Deviations from this plan: payments/expenses/fee-categories/finance-users built as planned; **added** a `StudentFees.js` ledger page (`'student-fees'`) for `GET /fees/` + statements; finance users page named `FinanceTeam.js` under key `'finance-team'` (the `'finance-users'` key stays with the schooladmin page); `BursarOverview` kept as a thin `BursarHome` wrapper; dashboard/class-performance/teacher-insights/syllabus endpoints exposed in financeApi but not surfaced on the bursar home (kept finance-focused); grade approvals exposed in financeApi but given no bursar nav entry (principal owns that UI).

> Goal: replace the 4 placeholder files in `src/components/bursar/` with a full Finance dashboard.
> Backend is essentially **100% ready** — all 25 `/api/finance/*` endpoints exist and work
> (see [02-API-REFERENCE.md](02-API-REFERENCE.md)). The entire job here is frontend: API module,
> context/hook, dashboard shell, and 4 real management pages. No backend route fixes needed
> (unlike Principal).

## Step 1 — Create `src/api/financeApi.js` (does not exist yet)

```js
import apiClient from './client';

const financeApi = {
  // Dashboard / overview
  getOverview: () => apiClient.get('/api/finance/overview/'),
  getStats: () => apiClient.get('/api/finance/stats/'),
  getDashboard: () => apiClient.get('/api/finance/dashboard/'),
  getClassPerformance: () => apiClient.get('/api/finance/class-performance/'),
  getTeacherInsights: () => apiClient.get('/api/finance/teacher-insights/'),
  getFinanceSnapshot: () => apiClient.get('/api/finance/finance-snapshot/'),
  getActivityFeed: () => apiClient.get('/api/finance/activity-feed/'),
  getSyllabusProgress: () => apiClient.get('/api/finance/syllabus-progress/'),

  // Fees
  getFees: (params) => apiClient.get('/api/finance/fees/', { params }), // class_id, status, student_id
  getStudentFees: (studentId) => apiClient.get(`/api/finance/students/${studentId}/fees/`),
  getFeeCategories: () => apiClient.get('/api/finance/fee-categories/'),
  createFeeCategory: (payload) => apiClient.post('/api/finance/fee-categories/', payload),
  assignFees: (payload) => apiClient.post('/api/finance/fees/assign/', payload), // fee_category_id, student_ids[], term_id?, discount?

  // Payments
  getPayments: (params) => apiClient.get('/api/finance/payments/', { params }), // student_id, date_from, date_to
  recordPayment: (payload) => apiClient.post('/api/finance/payments/', payload),

  // Expenses
  getExpenses: (params) => apiClient.get('/api/finance/expenses/', { params }), // category, date_from, date_to
  recordExpense: (payload) => apiClient.post('/api/finance/expenses/', payload),

  // Finance users
  getFinanceUsers: () => apiClient.get('/api/finance/finance-users/'),
  createFinanceUser: (payload) => apiClient.post('/api/finance/finance-users/', payload),
  updateFinanceUser: (id, payload) => apiClient.put(`/api/finance/finance-users/${id}/`, payload),

  // Grade approvals & report cards (bursars share this workflow per backend)
  listGradeApprovals: (params) => apiClient.get('/api/finance/grade-approvals/', { params }),
  reviewGradeChange: ({ gradeIds, action, comment }) =>
    apiClient.post('/api/finance/grade-approvals/', { grade_ids: gradeIds, action, comment }),
  listReportCards: () => apiClient.get('/api/finance/report-cards/'),
};

export default financeApi;
```

> Note: confirm the actual export style of `client.js` (`apiClient.get(url, { params })` vs `apiClient.get(url, params)`) by checking `adminApi.js`'s usage before finalizing — match the existing convention exactly.

## Step 2 — `BursarContext.js` + `useBursarDashboard.js`

`src/context/BursarContext.js` + `src/hooks/useBursarDashboard.js` — parallel-fetch on mount:
`getStats()`, `getFinanceSnapshot()`, `getPayments({ limit-style params if supported })`, `getExpenses()`, `getFeeCategories()`, `getActivityFeed()`. Return `{ loading, error, stats, snapshot, recentPayments, recentExpenses, feeCategories, activityItems }`.

## Step 3 — `BursarHome.js` (new dashboard shell)

`src/components/bursar/BursarHome.js` — model on `TeacherHome.js` structure. Props: `navigateTo`, `schoolId`. Sections:

1. **Stat cards** — `stats.total_collected`, `outstanding_balance`, `expenses`, `balance`, `total_students`.
2. **Finance snapshot** — `snapshot.revenue`, `outstanding`, `paymentsToday`, recent `transactions[]`.
3. **Recent payments** — last 5 from `getPayments()`, link to full Payments page.
4. **Recent expenses** — last 5 from `getExpenses()`, link to full Expenses page.
5. **Fee categories overview** — count + list from `getFeeCategories()`, link to full Fee Categories page.
6. **Activity feed** — `activityItems[]`.
7. **Quick actions** — Record Payment, Record Expense, Add Fee Category, Assign Fees, Manage Finance Users.

## Step 4 — Wire into `SuperadminDashboard.js`

- Import `BursarHome`.
- At `activePage === 'overview'` (line ~765), extend the branch from the Principal plan: `user?.role === 'bursar' ? <BursarHome navigateTo={goTo} schoolId={schoolId} /> : ...`.
- Existing nav entries already exist for `fee-dashboard` (→ replace `BursarOverview`'s render target — consider renaming to `bursar-overview` or repointing to `BursarHome` for the bursar's "overview" page specifically), `fee-categories`, `payments`, `expenses`. Add new: `finance-users`, and optionally `bursar-grade-approvals` if bursars should also action grade approvals (`/api/finance/grade-approvals/` exists for them).
- Update `permissions.js` `canAccess()` so these are visible to `ROLES.BURSAR` (currently `bursar`/`fee-*` keys may only allow `SUPERADMIN` — verify and extend).

## Step 5 — Replace `BursarOverview.js` stub
Either becomes `BursarHome.js` content directly, or stays as a thin wrapper rendering `<BursarHome />`. Decide based on whether `'fee-dashboard'` and `'overview'` should be the same page for bursars (recommended: yes, avoid duplication).

## Step 6 — Replace `FeeCategories.js` stub
- Table: name, description, amount, frequency, applicable_classes, is_active — from `getFeeCategories()`.
- "Create category" form modal → `createFeeCategory({ name, amount, description, frequency, applicable_classes })`.
- "Assign to students" action → opens a student/class picker → `assignFees({ fee_category_id, student_ids, term_id, discount })`.
- (No update/delete endpoint exists for fee categories per current API — only GET/POST. If edit is needed, flag as a backend gap, don't invent an endpoint.)

## Step 7 — Replace `Payments.js` stub
- Table: student name, admission #, amount, method, receipt #, date, status — from `getPayments({ student_id?, date_from?, date_to? })`.
- Filters: date range, student search.
- "Record payment" form modal → `recordPayment({ student_id, amount, fee_id?, payment_method?, reference?, notes?, paid_by? })` — show resulting `receipt_number`/`payment_hash` in a success confirmation.
- Optional: "View student fee statement" → `getStudentFees(studentId)` (fees[], payments[], summary).

## Step 8 — Replace `Expenses.js` stub
- Table: date, category, description, amount, receipt, status — from `getExpenses({ category?, date_from?, date_to? })`, plus `total`.
- "Record expense" form modal → `recordExpense({ description, amount, category?, date?, receipt_path? })`.
- Summary cards: total expenses (overall and by category, computed client-side from list or via repeated category-filtered calls).

## Step 9 — `FinanceUsers.js` (new page, medium priority)
Table from `getFinanceUsers()` (name, email, phone, role, access_level, active) + **Add** (`createFinanceUser`) and **Edit/toggle** (`updateFinanceUser`). Mirror `src/components/schooladmin/FinanceUsers/FinanceUsersPage.jsx` for UI consistency, placed under `src/components/bursar/` for the bursar's self-service view.

## CSS / responsiveness
New files: `BursarHome.css`, `FeeCategories.css` (replace stub), `Payments.css` (replace stub), `Expenses.css` (replace stub), `FinanceUsers.css`. Every file needs `@media (max-width: 600px)` rules per root project memory.

## Cross-reference with Principal dashboard
The Principal dashboard's "Finance snapshot" widget (Step 4 of [04-PRINCIPAL-DASHBOARD-PLAN.md](04-PRINCIPAL-DASHBOARD-PLAN.md)) uses `/api/principal/finance-snapshot/` — same underlying data as the Bursar dashboard's snapshot. Consider extracting a shared `FinanceSnapshotCard` component once both dashboards exist, but only if it doesn't expand the scope of either individual build.
