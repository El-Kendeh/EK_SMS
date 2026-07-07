# 05 · Roadmap & Features to Build

> **Bursar / Finance Dashboard — Audit & Upgrade Report**  ·  EK_SMS  ·  2026-07-03
> The build plan for everything the plan requires that isn't there yet. Grouped into three waves. Effort: **S** ≤1 day · **M** 2–4 days · **L** 1–2 weeks · **XL** multi-week epic.
> Read with [04 Plan-Gap Matrix](04-PLAN-GAP-MATRIX.md) (what's missing) and [00 Executive Summary](00-EXECUTIVE-SUMMARY.md) (why).

Context that shapes sequencing: this is a **Liberia, mobile-money-first, low-connectivity** deployment. Prod DB auto-sync is **OFF** — every schema change ships as a hand-run migration. Money must be exact.

---

## Wave 1 — Make what exists correct & safe

These are repairs, not new features. Each is small and unblocks a surface that already ships. Ship this wave before building anything new.

### 1.1 Unblock the bursar role on its core actions — **S**
`GET /api/school/students/` is gated to `LEADERSHIP_READ`, which excludes `bursar`; every finance page reaches the bursar but the student picker 403s, so **Record Payment** and **Assign Fees** break for the role that owns them.
- **Fix:** gate the student lookup with a finance-inclusive set (`school.js` already defines `FINANCE_READ = ['superadmin','school_admin','principal','bursar']` at line 166) — or add a finance-scoped `GET /api/finance/students/` and point the pickers at it.
- **Touches:** `backend_node/src/routes/school.js:173`. Verify `AssignFeesModal` and `RecordPaymentModal` load students under a real bursar token.

### 1.2 Repair finance-user provisioning — **M**
Three linked defects on the Finance Team page:
- New users are created `is_active: false` behind "pending Superadmin approval" → **can never log in**. Set `is_active: true` in the `User.create` inside `createFinanceUser` (`financeController.js:759`); set `must_change_password: true`.
- Suspend/Activate writes `SchoolAdmin.is_active`, which **isn't a column** → silent no-op. Make it flip **`User.is_active`** (the field the login gate reads) and return the persisted value.
- Chosen **role** and **access_level** are never stored → every card shows "Bursar / Full Access". Add `role`, `access_level`, `is_active` columns to `pruh_core_schooladmin` (migration) **and** declare them on `models/SchoolAdmin.js` so Sequelize persists/selects them.
- **Touches:** `financeController.js:757-793`, `models/SchoolAdmin.js`, new migration.

### 1.3 Enforce "Read Only" access level — **M**
`access_level` is presented as a permission control but never enforced; a read-only clerk has full money-moving rights. Block writes in the `FINANCE_WRITE`-gated handlers when the caller's `access_level === 'ReadOnly'`, or introduce distinct `role_id`s per finance role. Don't ship a control that does nothing.

### 1.4 Make money exact — **M**
- Migrate every finance amount (`Fee.amount_due/amount_paid/discount`, `Payment.amount`, `Expense.amount`, `FeeCategory.amount`) from **FLOAT → `DECIMAL(12,2)`** (or store integer cents); update the Sequelize models to `DECIMAL`. Fixes drift and the early/late `paid` status flip.
- **Touches:** all finance models + an `ALTER … MODIFY` migration.

### 1.5 Unique, safe receipts + payment integrity — **S–M**
- Add a **UNIQUE index** on `(school_id, receipt_number)`; generate per-school sequential (or crypto-random + retry-on-conflict) numbers — `RCP-<schoolId>-<year>-<seq>`. Satisfies plan 4.2 "unique receipt numbers" and readies the lookup portal.
- Validate amounts server-side: `const amt = Number(amount); if (!Number.isFinite(amt) || amt <= 0) return 400`. Apply to `recordPayment`, `createFeeCategory.amount`, `assignFees.discount`.
- Close the **lost-update race** on `fee.amount_paid`: lock the row (`lock: t.LOCK.UPDATE`) or do an atomic `amount_paid = amount_paid + :amt` and recompute status from the result, all inside the existing transaction.
- **Touches:** `financeController.js:395,406,425-430`, `models/Payment.js`, migration.

### 1.6 Correct the student statement — **M**
- Reconcile balances against actual `Payment` rows, not just `Fee.amount_paid`; either force every payment to allocate to a fee (auto-allocate to oldest open fee) or add the unallocated credit into the summary. Fixes statements that show a payment in the list but ignore it in the balance.
- Replace the **200-row cap** in the ledger totals with SQL `SUM` aggregation (like `getFinanceStats`) and push search to the server; show "showing X of N".
- **Touches:** `financeController.js:231,505-540`, `StudentFees.js`.

### 1.7 Stop the fake-$0 dashboard — **S**
`useBursarDashboard` only surfaces an error if **all six** calls fail; one failed call renders `$0` everywhere. Track per-section failure and show `—` + retry on the affected card instead of a zero. `hooks/useBursarDashboard.js:43`.

### 1.8 Fix the migrations for the real engine — **S**
`2026-05-18-finance-and-approvals.sql` uses MariaDB-only `IF NOT EXISTS` on `CREATE INDEX` / `ADD COLUMN`. Confirm the prod engine; if MySQL, guard via `INFORMATION_SCHEMA` + dynamic SQL. These migrations are the only path to prod schema (auto-sync is off).

### 1.9 Add finance FK constraints — **S–M**
No foreign keys on any finance table. Add FKs with explicit `ON DELETE` (RESTRICT for `fee.fee_category_id`/`fee.student_id`, CASCADE/SET NULL for `payment.fee_id`).

---

## Wave 2 — Complete Module 4 on the existing pages

New features that hang off surfaces already built. Each references the plan section it satisfies.

### 2.1 Receipts to plan 4.2 — **L**
Today: a receipt number + on-screen card + client-side print. Missing: QR verification, real PDF, SMS/email delivery, lookup portal.
- **Data:** delivery columns on `Payment` (`sent_at`, `channel`, `delivery_status`); optional stored receipt document.
- **Backend:** `GET /api/finance/receipts/:receiptNumber/` (lookup), `POST /api/finance/payments/:id/resend/` (SMS/email), a server-rendered PDF (or a signed print view), and a **public** `GET /verify/receipt/:hash` that recomputes a keyed HMAC (not the current forgeable plaintext `payment_hash`). Note: a QR + `/verify/:hash` pattern **already exists for grade receipts** (`routes/verify.js` + `GradeReceipt`) — mirror it.
- **UI:** receipt-action row on `RecordPaymentModal` success step and `PaymentDetailModal` (Print / Save-PDF / Send SMS-Email / QR); a receipt-lookup page (staff, and optionally a public parent portal).
- **Liberia note:** SMS delivery is the plan's stated fallback — wire it to the existing SMS path, not just an in-app notification.

### 2.2 Fee engine to plan 4.1 — **L**
- **Installment plans:** new `pruh_finance_installment_plan` (`fee_id`, `total`, `num_installments`) + `pruh_finance_installment` (`plan_id`, `seq`, `amount_due`, `due_date`, `amount_paid`, `status`); link `Payment.installment_id`. UI: an installment-schedule builder in `CreateCategoryModal`/`AssignFeesModal` and a per-installment view on the statement.
- **Late-fee calculation:** `Fee.due_date` is already stored but never read. Add a late-fee policy (fixed/percentage, grace days) on `FeeCategory`, an overdue-detection job, and applied-penalty columns; surface a "late fee" line on the ledger and an override in `RecordPaymentModal`.
- **Scholarship/discount:** replace the single flat per-assignment discount with a `Scholarship`/discount-rule entity (percentage or absolute, named, eligibility) reusable across assignments.
- **Mobile-money reconciliation:** add `provider`, `gateway_transaction_id`, `gateway_status`, `currency` to `Payment`. Even before a live Orange Money gateway, capturing the mobile-money reference makes recorded payments reconcilable. `status` is currently hardcoded `completed` — a bursar can record a mobile-money payment that never cleared; gate `completed` on a reference or an approval.
- **New `financeApi`/routes:** `getInstallmentPlan`, `createInstallmentPlan`, scholarship CRUD.

### 2.3 Dashboards to plan 4.3 — **M–L**
- **Revenue vs Budget** (entirely missing): a `Budget` model (`school_id`, term/period, optional category, `amount`) + `GET/POST /api/finance/budget/`; then budget-vs-actual on Reports and the home (progress bar / target line).
- **Cash-flow visualization:** the monthly revenue+expense series already exists in `getFinanceAnalytics.monthly` (consumed only by Reports) — add a net-position-over-time chart to the home command center.
- **Collection rate by term/class:** add term + class selectors that scope the analytics call and surface per-class/per-term collection rate (`getFinanceFees` already returns per-fee balances by `class_id`).
- **Report export:** add PDF/print to Reports (reuse the `window.print` + `@media print` pattern already in `StudentFees.js`). CSV already works.

### 2.4 Edit finance user — **S**
`updateFinanceUser` only flips `is_active`. Add an edit form (role, access level, contact) once the role/access columns from 1.2 exist. The principal controller already has an editable-user pattern to mirror.

### 2.5 2FA for finance staff — plan 1.5 — **L**
Mandatory for finance roles; absent today. Add TOTP secret/enabled columns to `User`, enforce enrollment for `bursar` role at first login, add a second-factor challenge in the login flow for finance roles, and a per-card 2FA status on the Finance Team page. Pair with the unique-temp-password fix in 1.2 (drop the shared `Finance@123` default).

---

## Wave 3 — New modules (fresh schema + endpoints + screens)

Each is a self-contained epic with no UI or backend today. Buildable in parallel once Wave 1 lands.

### 3.1 Inventory & Resource Management — plan 4.4 — **XL**
Textbooks, lab equipment, furniture, sports gear, stationery; stock levels, assignment to students/rooms, condition tracking, reorder alerts, loss/damage.
- **Data:** `pruh_finance_inventory_item` (category, name, quantity, unit_cost, reorder_level, condition), `pruh_finance_inventory_assignment` (item_id, assignee, qty, returned), `pruh_finance_inventory_movement` (item_id, delta, reason, at).
- **Backend:** CRUD + assignment + movement endpoints under `/api/finance/inventory/`, reorder-alert query.
- **UI:** new bursar nav section: item list, item detail, assign/return, low-stock alerts.

### 3.2 Staff Payroll & HR — plan 4.5 — **XL**
Employee profiles, contracts, salary config, deductions, payslip generation, leave, performance. `CoreBursar` has a few profile fields (`contract_type`, `salary_grade`, `bank_*`) — nothing to run payroll against.
- **Data:** `pruh_hr_salary_structure`, `pruh_hr_payroll_run`, `pruh_hr_payslip` (+ line items/deductions), `pruh_hr_leave_request`, `pruh_hr_performance_record`, keyed to a staff/user id.
- **Backend:** payroll-run, payslip-generate (PDF), leave-request workflow, endpoints under `/api/finance/payroll/` (or a dedicated HR router).
- **UI:** payroll run screen, payslip viewer, leave calendar, performance notes. This is arguably its own domain — consider a separate HR area rather than the bursar sidebar.

### 3.3 Document & Certificate Management — plan 4.6 — **L–XL**
Certificates, official letters, policy docs, minutes; secure storage, version control, access logging, expiry tracking, search. (The existing `Document` model is a per-student file store, not this.)
- **Data:** `pruh_finance_document` (type, title, file_ref, version, owner, expiry, access-log link).
- **Backend:** upload/version/search/expiry endpoints + access logging.
- **UI:** document library with type filters, version history, expiry warnings.

---

## Sequencing summary

| Wave | Theme | Rough size | Gate |
|---|---|---|---|
| 1 | Correctness & security repairs | ~1–2 weeks total (mostly S/M) | Ship before any new feature |
| 2 | Complete 4.1/4.2/4.3 + 2FA + edit-user | ~3–5 weeks | Needs Wave 1 money + provisioning fixes |
| 3 | Inventory, Payroll/HR, Documents | multi-week each, parallelizable | Independent; schedule after Wave 1 |

Also still owed (from the two audit agents that didn't finish): a **Payments-page** deep audit and a **responsiveness** pass verifying the mandated `@media (max-width:600/400/360)` rules and ≥44px touch targets across all eight pages.
