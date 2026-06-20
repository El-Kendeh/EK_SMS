# Frontend Build Status by Role (Verified 2026-06-10)

All roles render through the single `SuperadminDashboard.js` shell — see [01-ARCHITECTURE.md](01-ARCHITECTURE.md) §4 for how this works. Status below is per-role **page inventory**, not "is there a separate app".

## Superadmin — ✅ Fully built
- 36 `SA*.js` pages in `src/components/superadmin/`, all imported and wired into `SuperadminDashboard.js`'s `activePage` switch.
- Covers: schools (applications/review/approval/rejection/history/version-compare), grade integrity (report/audit/requests/change-alerts), security (logs/forensics/alert-broadcast/system-health), academics (classes/subjects/academic-system/grading-system/terms/years), accounts (teachers/students/parents/principals/bursars), ref-data manager (countries/regions/cities/institution-types/school-types/syllabus-types/class-subtypes/capacities), settings/profile/analytics/benchmarks/onboarding/governance/users/notifications.

## School Admin — ⚠️ Partially built, shares superadmin shell (architectural debt, lower priority)
- No separate shell; uses same `SuperadminDashboard.js`.
- Account-management sub-pages exist and work: `src/components/schooladmin/Principal/PrincipalPage.jsx` (manage principal user accounts + a *preview* of the principal command dashboard), `FinanceUsers/FinanceUsersPage.jsx` (manage finance user accounts), `Students/`, `Teachers/`, `Parents/` subfolders.
- `SchoolAdminPages.js`, `SAExtraPages.js`, `NewPages.js` provide Grades/Attendance/Finance/Reports/Messages pages.
- Not in scope for the current Principal/Finance dashboard build, but `PrincipalPage.jsx` is currently broken by the same routing bug — see [06-KNOWN-ISSUES.md](06-KNOWN-ISSUES.md) §1.

## Teacher — ⚠️ Pages built, but the "Home" shell is dead code
- 47 files in `src/components/teacher/`. Sub-pages (GradeEntry, MyClasses, Timetable, Attendance, Messages, Assignments, etc.) are real and at least `grade-entry`/`my-classes` are wired into `SuperadminDashboard.js`.
- `TeacherHome.js` (548 lines, fully built: stat cards, calendar, at-risk students, quick actions) is **not imported anywhere** outside its own file — dead code. Teacher's "overview" landing page currently shows `SAOverview` (superadmin's school list), not `TeacherHome`.
- `teacherApi.ts` exports 30+ working methods.
- **Pre-existing issue, not part of the Principal/Finance scope** — flagged for awareness only.

## Student — ⚠️ Same situation as Teacher
- 38 files in `src/components/student/`. `StudentHome.js` (790 lines, built) is **not imported anywhere** — dead code.
- `studentApi.ts` exports 35+ working methods.

## Parent — ⚠️ Same situation as Teacher/Student
- 28 files in `src/components/parent/`. `ParentHome.js` (built) is **not imported anywhere** — dead code.
- `parentApi.ts` exports 40+ working methods.

## Principal — ✅ FULLY BUILT (completed 2026-06-10)
- `PrincipalHome.js` — command-center landing (stats, health score, class performance, teacher panel, finance snapshot, alerts, insights, quick actions, syllabus summary, activity feed). Reuses the shared panels from `schooladmin/Principal/`. Branched at `activePage === 'overview'` for `role === 'principal'`.
- `GradeApprovals.js` — full implementation: status tabs + counts, class/term filters, multi-select bulk approve/reject with comment modal, per-row comments.
- `ReportCardApproval.js` — student-grouped cards, expand to subject grades, publish-all/publish-selected, per-grade comments.
- `PublishedReportCards.js` — NEW: fully-approved (published) report cards, searchable, expandable.
- `AttendanceReport.js` — NEW: per-class attendance bars + status pills via `GET /api/principal/attendance-report/?days=N` (7/30/90/180 ranges).
- `SyllabusProgress.js` — searchable/sortable coverage list with summary stats.
- `PrincipalUsers.js` — leadership team cards, add + edit modal, suspend/activate toggle.
- `PrincipalContext.js` + `usePrincipalDashboard.js` — parallel fetch of all 7 dashboard endpoints, cached in context.
- All 16 backend routes registered in `routes/principal.js`; `principalApi` in `adminApi.js` matches backend shapes.
- Principal gets a dedicated sidebar (`PRINCIPAL_NAV_ITEMS` in `SuperadminDashboard.js`: Command Center / Approvals / Academics / Team / Notifications) and a role-aware mobile bottom nav.
- Every principal CSS file has `@media (max-width: 600px)` (+ smaller) rules; `--ska-*` tokens now have `[data-theme="light"]` overrides.
- ⚠️ Login role bug fixed in `authController.js` — see [06-KNOWN-ISSUES.md](06-KNOWN-ISSUES.md) status update.

## Bursar / Finance — ✅ FULLY BUILT (completed 2026-06-11)
- `src/api/financeApi.js` — all 25 `/api/finance/*` endpoints + `/api/school/classes|students|terms` lookups for pickers.
- `BursarContext.js` + `useBursarDashboard.js` — parallel fetch (stats, snapshot, payments, expenses, categories, activity), cached in context, `invalidate()` to refetch after mutations.
- `bursar/BursarHome.js` — Finance Command Center: 6 KPI cards (collected/outstanding/expenses/net balance/payments today/students), collection-rate bar, recent payments + expenses lists, fee-categories overview, quick actions, activity feed (reuses `schooladmin/Principal/ActivityFeed`). Branched at `activePage === 'overview'` for `role === 'bursar'`.
- `bursar/BursarOverview.js` — thin wrapper rendering `BursarHome` (keeps the `'fee-dashboard'` key for school-admin nav without duplicating pages).
- `bursar/StudentFees.js` — NEW page (`'student-fees'`): fee ledger with class/status/server filters + client search, billed/collected/outstanding summary, per-row Statement modal (`getStudentFees`: fees + payments + summary) and Pay shortcut.
- `bursar/FeeCategories.js` — real page: category cards (amount, frequency, applicable-classes chips — parsed from JSON string, active badge), create modal (classes multi-select chips), Assign-to-Students launch. (No edit/delete — backend has GET/POST only.)
- `bursar/Payments.js` — payment ledger (receipt #, student, amount, method, reference, date, status), date-range + search filters, totals, Receipt detail modal (copy receipt #, integrity hash), Record Payment.
- `bursar/Expenses.js` — expense ledger with category/date filters, KPI chips (all-time / shown / this-month / top category), Record Expense modal. (`total` from backend = all-time; filtered total computed client-side. No receipt upload — no backend route.)
- `bursar/FinanceTeam.js` — NEW page (`'finance-team'`): team cards + Add Finance User modal + confirm-gated Suspend/Activate (backend PUT only toggles `is_active` — no edit form by design).
- Shared: `bursar/RecordPaymentModal.js` (student picker → open-fee link with balance validation → method/reference/notes → receipt confirmation with `receipt_number` + `payment_hash`; sends numeric amount), `bursar/AssignFeesModal.js` (category/term/class → student multi-select with select-all → absolute discount validation → skipped-duplicates reporting), `bursar/bursar.utils.js` (fmtMoney, FEE_STATUS, PAYMENT_METHODS, parseApplicableClasses, …).
- CSS: shared `bursar/Bursar.css` (bur-* fields/filters/summary chips/tables/pickers/receipt) + per-page files; every file has `@media (max-width: 600px)` (+400/360) rules; tables scroll horizontally on mobile; touch targets ≥44px.
- Bursar gets a dedicated sidebar (`BURSAR_NAV_ITEMS`: Finance Center / Fees / Money / Team / Notifications) and a role-aware mobile bottom nav (Home/Fees/Payments/Expenses/Team). Stub keys (`fees-payment`, `receipt-generator`, `fees-structure`, `school-financial-report`) removed from bursar permissions; `'student-fees'` + `'finance-team'` added ([ROLES.BURSAR]).
- `npm run build` compiles clean (zero warnings).
- Stitch project "EK-SMS Finance User Dashboard" (projects/4016626527558747278): gap analysis found fee-categories/expenses/finance-users had no mockups → generated "Fee Categories Management", "Expense Management", "Finance Team Management" screens (Kinetic Ledger design system). Some retries produced duplicate screens — safe to delete in the Stitch UI.
- **2026-06-12 — Stitch screen audit + Reports build** (screens exported to `public/stitch_ek_sms_finance_user_dashboard/`, 31 screens):
  - `bursar/Reports.js` + `Reports.css` — NEW page (`'finance-reports'`, sidebar section "Insights"): period pills (This Month/3M/6M/This Year/12M/All Time), 4 KPI cards with %-vs-prior-period deltas (revenue/expenses/net surplus/collection rate), monthly revenue-vs-expenses CSS bar chart (quiet months padded in), payment-method distribution with share bars + "most popular"/"fastest growing" chips, spending-by-category bars, top-8 outstanding balances list, period summary facts, and an Export modal (summary/payments/expenses CSV with generating→ready states; warns when a ledger export hits the 200-row cap). Covers Stitch screens: fiscal_reports_dashboard, revenue_analytics_dashboard, payment_method_analytics, year_end_summary, configure_export, generating_report, report_ready.
  - Backend: `GET /api/finance/analytics/` (`getFinanceAnalytics` in financeController) — SQL-side GROUP BY aggregations; see 02-API-REFERENCE.md. One-off validation script at `backend_node/scripts/test-analytics.js` (run once local MySQL creds work — root@localhost was access-denied on 2026-06-12, pre-existing env issue that also 500s `/api/login/`).
  - `StudentFees.js` StatementModal: added **Download Statement** (printable HTML → browser print/save-as-PDF) per `student_payment_history_with_payment_action` mock.
  - Bursar mobile bottom nav now Home/Fees/Payments/Expenses/**Reports** (Team stays in sidebar + quick actions); `'finance-reports'` added to permissions ([ROLES.BURSAR]) and BursarHome quick actions.
  - **Screens intentionally NOT implemented (no backend / out of scope):** payment-verification flow (verification_queue, manual_payment_verification, verification_history, select_rejection_reason, rejection_confirmation, payment_verification_rejected_state) — needs parent-submitted payments + receipt upload backend; parent-facing payment screens (select_payment_method, mobile_money_payment, bank_transfer_details, re_upload_receipt, parent_rejection_notification, payment_success_receipt is covered bursar-side by the receipt modal) — parent portal + gateway work; invoicing (create_new_invoice, invoice_management, invoice_preview, invoice_success_confirmation) — fee assignment is the system's invoicing equivalent, no Invoice model; budgets (budget_allocation_tool, budget_audit_log, departmental_spending_details) — no Budget model; security_audit_log / incident_investigation_view — superadmin domain; payment_alert_notifications — push-notification mock, Notifications page already exists.

## Endpoints with backend support but NO frontend UI at all (orphaned)

- ~~All 25 `/api/finance/*` endpoints~~ → **all now consumed by the Bursar dashboard** (2026-06-11), except grade-approvals/report-cards under `/api/finance/*` which the bursar shares with the principal workflow (financeApi exposes them; no bursar nav entry by design — avoids duplicating the Principal's approval pages).
- `/api/principal/syllabus-progress/`, `/api/principal/principal-users/` (GET/POST/PUT) — though `/api/school/principal-users/*` equivalents ARE used by `PrincipalPage.jsx`
- `getSchoolCommandDashboard`, `getClassPerformance`, `getTeacherInsights`, `getFinanceSnapshot`, `getActivityFeed` — used by `PrincipalPage.jsx` via `/api/principal/dashboard/` etc. paths that **don't exist in the route file** (404, silently caught) — see [06-KNOWN-ISSUES.md](06-KNOWN-ISSUES.md) §1
