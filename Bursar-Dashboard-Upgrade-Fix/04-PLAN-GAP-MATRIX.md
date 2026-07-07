# 04 · Plan-Gap Matrix (Module 4 + RBAC)

> **Bursar / Finance Dashboard — Audit & Upgrade Report**  ·  EK_SMS  ·  2026-07-03
> Source of truth: system plan **Module 4 — Finance & Administration** (`EK_SMS/public/docu/ek-sms-complete-plan.md.pdf`) + Finance-Officer RBAC (Module 1.5/1.6).
> Every Module-4 sub-feature and finance-RBAC duty, mapped to what exists today. 117 raw gap observations, de-duplicated below.

**Severity legend:** 🔴 Critical (broken / unsafe, ship-blocker) · 🟠 High (wrong behaviour or major gap) · 🟡 Medium (correctness/UX) · ⚪ Low (polish).

**Coverage note:** 13 of 15 audit agents completed (117 findings). The dedicated **Payments-page** deep-audit and the **design/responsiveness** sweep did not finish (account session limit); their scope is partially covered by the modals, contract-drift, and shell audits. Findings were **not** through the adversarial verify pass — treat severities as auditor-assigned, not double-confirmed.

**Report index:** [00 Executive Summary](00-EXECUTIVE-SUMMARY.md) · [01 UI/UX & Responsiveness](01-UI-UX-AND-RESPONSIVENESS-AUDIT.md) · [02 Backend & Data](02-BACKEND-AND-DATA-AUDIT.md) · [03 Functionality & Contract Drift](03-FUNCTIONALITY-AND-CONTRACT-DRIFT.md) · [04 Plan-Gap Matrix](04-PLAN-GAP-MATRIX.md) · [05 Roadmap & Features to Build](05-ROADMAP-AND-FEATURES-TO-BUILD.md) · [06 Modals Audit](06-MODALS-AUDIT.md)

---

**De-duplicated feature status:** ✅ Present 11 · 🟨 Partial 30 · ❌ Missing 22  (of 63 distinct features)

Status = worst observation across agents. **UI** / **BE** = any evidence a frontend screen / backend endpoint exists for it.

## 4.1 — Cashless Fee Payment System

| Feature | Status | UI | BE | Notes |
|---|---|---|---|---|
| 4.1 Installment plans | ❌ Missing | — | — | No schema, no endpoint, no UI anywhere in finance. |
| 4.1 Late-fee calculation | ❌ Missing | — | — | No late_fee/penalty field or due-date-driven penalty logic; due_date is stored but unused for penalties. |
| 4.1 Late fee calculation | ❌ Missing | — | — | due_date is stored/displayed but no overdue detection or automatic late-fee accrual exists anywhere in the fee/ledger path. |
| 4.1 Installment plans, late-fee calculation, scholarship/discount application | ❌ Missing | — | — | No bursar nav key or page for installment plans, late fees, or scholarship/discount. Bursar Fees section is only student-fees + fee-categories + payments + expenses. |
| 4.1 Mobile money (Orange Money) / bank / card integration | ❌ Missing | ✓ | — | payment_method is a free-text label defaulting to 'cash' (financeController.js:414); there is NO payment-gateway integration, no Orange Money/bank/card API, no webhook, no reconciliation. The 'cashless' system is manual recording of a method name — a significant gap for the Liberia mobile-money-first context. |
| 4.1 Payment method — Mobile money (Orange Money etc.) | ❌ Missing | ✓ | ✓ | 'mobile_money' exists only as a dropdown label (PAYMENT_METHODS in bursar.utils.js) stored as a free string on Payment.payment_method. No Orange Money / mobile-money gateway, no STK/USSD, no verification or reconciliation. recordPayment hardcodes status:'completed' (financeController.js:418) — a bursar can record a mobile-money payment that never actually happened. |
| 4.1 Edit fee category (change name/amount/frequency/description) | 🟨 Partial | — | ✓ | PUT /fee-categories/:id/ and financeApi.updateFeeCategory exist; UI only wires the is_active toggle, no edit form. |
| 4.1 Delete fee category | 🟨 Partial | — | — | No DELETE route by design; replaced with soft deactivate (is_active=false) to avoid orphaning assigned fees. Hard delete intentionally absent. |
| 4.1 Frequency (term/monthly/annual/one-time) | 🟨 Partial | ✓ | ✓ | Stored and displayed as a label only; no recurring-billing engine acts on it. |
| 4.1 Applicable classes scoping | 🟨 Partial | ✓ | ✓ | Collected and stored at create time but never enforced by assignFees; assign class picker ignores it and updateFeeCategory can't edit it. |
| 4.1 Scholarship/discount rule application | 🟨 Partial | ✓ | ✓ | Only a single absolute discount applied uniformly at assign time; no percentage, no named scholarship, no reusable rule. |
| 4.1 Assign fees flow (category, term, class, student multi-select, discount) | 🟨 Partial | ✓ | ✓ | Works for leadership roles; broken for the bursar because GET /school/students/ is gated by LEADERSHIP_READ (bursar excluded) while POST /fees/assign/ allows bursar. |
| 4.1 Scholarship / discount application | 🟨 Partial | ✓ | ✓ | A flat per-assignment discount is subtracted from amount_due at assignFees time and shown in the ledger Discount column, but there is no scholarship entity, percentage discounts, or eligibility tracking. |
| 4.1 Multiple payment methods / channels (mobile money, bank, card, wallet) | 🟨 Partial | ✓ | ✓ | payment_method is unconstrained free text defaulting 'cash'; no provider, gateway_transaction_id, gateway_status, or currency for real mobile-money/online reconciliation. |
| Cross-cutting: money precision | 🟨 Partial | ✓ | ✓ | All finance amounts are FLOAT, not DECIMAL — rounding drift on stored balances. |
| 4.1 Payment processing (Record Payment) | 🟨 Partial | ✓ | ✓ | recordPayment contract is fully correct, but the student picker it needs (GET /school/students/) 403s for the bursar role, so the primary Record Payment entry point is broken for an actual bursar (works only for school_admin/principal). |
| 4.1 Fee assignment / installment-discount | 🟨 Partial | ✓ | ✓ | assignFees supports an absolute discount and skips duplicates correctly, but AssignFeesModal cannot load class students for a bursar (same /school/students/ 403). Installment plans and late-fee calculation from the plan are not implemented (out of current build scope). |
| 4.1 Fee structure configuration — create category (name, amount, frequency, description) | ✅ Present | ✓ | ✓ | Full round-trip via CreateCategoryModal + createFeeCategory; client validation on name/amount. |
| 4.1 Payment receipts | ✅ Present | ✓ | ✓ | Receipt number (RCP-<base36 ts>) + payment_hash + on-screen receipt card and printable statement. See 4.2 for delivery/QR/PDF gaps and a uniqueness caveat. |
| 4.1 Payment method selector (mobile money / bank transfer / card / cash) | ✅ Present | ✓ | ✓ | RecordPaymentModal PAYMENT_METHODS + backend free-string payment_method (financeController.js:414). No provider-specific capture (e.g. Orange Money number) or online-card flow — recording only, which is acceptable for a manual ledger. |

## 4.2 — Automated Receipt Generation

| Feature | Status | UI | BE | Notes |
|---|---|---|---|---|
| 4.2 QR-code verification | ❌ Missing | — | ✓ | No QR on statement/receipt and no verify endpoint; payment_hash is an un-keyed plaintext concat, not verifiable. |
| 4.2 Receipt lookup portal | ❌ Missing | — | — | No route or page to look up/validate a receipt number exists in finance.js or the bursar UI. |
| 4.2 Email/SMS receipt delivery | ❌ Missing | — | — | recordPayment only creates an in-app Notification; no email/SMS delivery, despite the Liberia SMS-fallback requirement. |
| 4.2 QR-code receipt verification | ❌ Missing | — | — | No QR generation and no verification endpoint. payment_hash (financeController.js:407) is a forgeable timestamp string, not a verifiable token. |
| 4.2 PDF receipt generation | ❌ Missing | — | — | No PDF generation anywhere in the finance controller/routes; recordPayment returns only JSON fields. |
| 4.2 PDF generation + Email/SMS delivery | ❌ Missing | — | — | No delivery-tracking columns (sent_at/channel/status) on Payment; no receipt document storage. |
| 4.2 Email / SMS receipt delivery | ❌ Missing | — | — | recordPayment only creates an in-app Notification that is school-wide (no user_id target, financeController.js:435-441). The payer/parent is never emailed or SMS'd — a real miss given the Liberia SMS-fallback context in the plan. |
| Expense receipt attachment (Module 4.2/4.3) | 🟨 Partial | — | ✓ | receipt_path exists on model + recordExpense + getExpenses, but there is no file input, no multipart upload endpoint, and the ledger never displays a receipt. Only a bare path string could ever be stored — nothing sets it. |
| 4.2 PDF receipt/statement generation | 🟨 Partial | ✓ | — | 'Download Statement' is a client print-to-window (Save-as-PDF) that no-ops on popup block; no server-rendered PDF. |
| 4.2 Automated receipt generation with QR verification + receipt lookup portal | 🟨 Partial | — | ✓ | receipt_number is shown in BursarHome recent-payments (BursarHome.js:140), but the 'receipt-generator' key is an empty-permission stub (permissions.js:122) and there is no QR verification or lookup-portal page wired for the bursar. |
| 4.2 Unique receipt numbers | 🟨 Partial | ✓ | ✓ | A receipt_number string is generated (financeController.js:406) but uniqueness is not enforced (no UNIQUE index; millisecond collisions possible across tenants). Generated but not reliably unique. |
| 4.2 PDF generation | 🟨 Partial | ✓ | — | StudentFees.printStatement builds HTML and calls window.print() (save-as-PDF). No server-side PDF, and the receipt itself is not a downloadable PDF. Popup-blocked case fails silently (StudentFees.js:105). |
| 4.2 Receipt PDF / QR verification / Email-SMS delivery | 🟨 Partial | ✓ | — | Unique receipt_number + payment_hash generated and shown; StatementModal prints a PDF-able statement. But no per-payment PDF, no QR code, and no email/SMS delivery/resend from RecordPaymentModal or PaymentDetailModal — SMS fallback is a stated Liberia requirement. |

## 4.3 — Finance & Budget Dashboards

| Feature | Status | UI | BE | Notes |
|---|---|---|---|---|
| Revenue vs Budget (Module 4.3 Finance & Budget Dashboards) | ❌ Missing | ✓ | — | No budget model, column, or endpoint anywhere in financeController/models. Net Balance card is collected−expenses (BursarHome.js:50), not revenue vs a planned budget. |
| Collection rate by term/class (4.3) | 🟨 Partial | ✓ | ✓ | Home shows a single global collection-rate bar (BursarHome.js:42-116). No per-term or per-class breakdown, which the plan explicitly names. getFinanceFees supports class/status filters but is not used to segment the rate. |
| Cash flow visualization (Module 4.3) | 🟨 Partial | ✓ | ✓ | The command-center home has no time-series/cash-flow chart — only a collection-rate progress bar. The monthly revenue+expense series exists (getFinanceAnalytics.monthly, financeController.js:125-141) but is consumed only by Reports.js, not the home. |
| Expense server-side amount validation | 🟨 Partial | ✓ | ✓ | UI validates amount > 0, but recordExpense only checks presence, so negative/garbage amounts and arbitrary categories pass and can skew approved-spend totals. |
| Financial report export as PDF / print (4.3 Financial reports) | 🟨 Partial | ✓ | ✓ | CSV export works well (3 datasets, cap warnings). No PDF and no print — despite StudentFees.js already having a window.print + @media print pattern. |
| 4.3 Cash-flow visualization | 🟨 Partial | ✓ | ✓ | getFinanceAnalytics provides monthly revenue vs expenses, but there is no true cash-flow (inflow/outflow net position over time) construct. |
| Outstanding balances (4.3) | ✅ Present | ✓ | ✓ | 'Outstanding' KPI card (BursarHome.js:48) from getFinanceStats.outstanding_balance; also getFinanceAnalytics.top_debtors and getFinanceSnapshot.outstanding exist. |
| Expense tracking (4.3) | ✅ Present | ✓ | ✓ | Expenses KPI card + Recent Expenses panel on home (BursarHome.js:49,150-176); getExpenses returns totals/counts and an approval-gated workflow (financeController.js:578-707). |
| Expense tracking (Module 4.3) | ✅ Present | ✓ | ✓ | Record + ledger + status/category/date filters + all-time & pending totals work end-to-end. Gaps: no receipts UI, no per-category totals on this page, and summary chips ignore filters. |
| Expense approval workflow (submit→pending→approve/reject) | ✅ Present | ✓ | ✓ | Solid. Reason-required reject, 409 double-review guard, audit logging, and separation of duties enforced at both role and individual level (route + controller), mirrored in UI. Strongest part of the bursar suite. |
| 4.3 Outstanding balances | ✅ Present | ✓ | ✓ | amount_due - amount_paid drives top-debtors and stats. |
| 4.3 Expense tracking | ✅ Present | ✓ | ✓ | Expense table + approval workflow (created_by/approved_by/approved_at/rejection_reason, status). Category is free text; no vendor/budget link. |
| 4.3 Expense tracking (record / approve / list, budget-affecting only when approved) | ✅ Present | ✓ | ✓ | recordExpense/getExpenses/reviewExpense are complete with a correct pending→approved workflow, individual-level self-approval guard, and audit logging. |
| 4.3 Finance & Budget Dashboards | ✅ Present | ✓ | ✓ | Reports/analytics (collection rate, outstanding, revenue-vs-expenses monthly series, methods, expense categories, top debtors, CSV export) are correctly wired FE↔BE. 'Revenue vs budget' from the plan is not implemented (no budget model), but that is a missing-feature not a contract drift. |

## 4.4 — Inventory & Resource Management

| Feature | Status | UI | BE | Notes |
|---|---|---|---|---|
| 4.4 Inventory & resource management | ❌ Missing | — | — | No inventory nav key or page anywhere in the bursar sidebar. |

## 4.5 — Staff Payroll & HR Management

| Feature | Status | UI | BE | Notes |
|---|---|---|---|---|
| 4.5 Staff Payroll & HR (payslips, salary config, deductions, leave) | ❌ Missing | — | — | No payroll/payslip/leave nav key or page in the bursar sidebar. |
| 4.5 Finance staff management (Finance Team) | 🟨 Partial | ✓ | ✓ | Create/list work, but role, access_level and phone are dropped on save (unmapped columns), and suspend/activate is a no-op fake-success because SchoolAdmin.is_active isn't a mapped column. Access level is never enforced. |

## 4.6 — Document & Certificate Management

| Feature | Status | UI | BE | Notes |
|---|---|---|---|---|
| 4.6 Document & certificate management | ❌ Missing | — | ✓ | No document/certificate nav key or page in the bursar sidebar. |

## 1.5 — Two-Factor Authentication (finance staff)

| Feature | Status | UI | BE | Notes |
|---|---|---|---|---|
| 1.5 2FA required for Finance staff | ❌ Missing | — | — | No 2FA setup, required-2FA flag, per-card 2FA status, or login challenge for bursar-role accounts. Finance logins are password-only. |
| 1.5 2FA for finance staff | ❌ Missing | — | — | No 2FA challenge in the bursar login/route path (App.js:177-185). |
| RBAC / 1.5 — 2FA required for Finance staff | ❌ Missing | — | — | login() does bcrypt-check then immediately issues a JWT (authController.js:40-130) — no second factor. OTP (send-otp/verify-otp) is used only for registration email verification, never at login. No TOTP/authenticator enrollment for finance roles. |

## 1.6 — RBAC (Finance Officer)

| Feature | Status | UI | BE | Notes |
|---|---|---|---|---|
| Edit finance user (role / access / contact after creation) | ❌ Missing | — | — | Only Add + toggle exist; updateFinanceUser ignores all profile fields and only flips is_active. The principal controller already implements full edit (principalController.js:405-433) and could be mirrored. |
| Finance staff provisioning (list/add/suspend finance users) | 🟨 Partial | ✓ | ✓ | UI is complete but the backend contract is largely non-functional: role/access_level/is_active are not real columns on SchoolAdmin, so add-role, add-access-level, and suspend are all dropped; created users are inactive and cannot log in. |
| Least-privilege finance roles (Read Only / Accounts Clerk vs Bursar) | 🟨 Partial | ✓ | — | Role/access-level pickers exist in the UI but every user is created with the same bursar role_id and full FINANCE_WRITE; access_level is never enforced. |
| Finance-staff provisioning & lifecycle (create / activate / deactivate / role & access-level) | 🟨 Partial | ✓ | ✓ | Create exists but leaves the account inactive (can't log in); deactivate is a silent no-op; role/access_level/phone are dropped because the SchoolAdmin/User models lack those columns. Effectively non-functional despite a working-looking UI. |
| RBAC — Finance Officer: fee management + payment processing | 🟨 Partial | ✓ | ✓ | Bursar can manage fee categories, assign fees, and record payments (FINANCE_WRITE includes bursar). |
| Finance-staff account management (Finance Team page) | 🟨 Partial | ✓ | ✓ | Create/list/toggle exist but are broken: role, access_level and is_active are never persisted and suspend/activate is a no-op (see findings — SchoolAdmin model lacks those columns). Also lists all SchoolAdmins as 'Bursar'. |

## Cross-cutting / other

| Feature | Status | UI | BE | Notes |
|---|---|---|---|---|
| Cross-cutting: referential integrity | ❌ Missing | — | — | No DB foreign keys on any finance table; orphan rows possible; app-level associations only. |
| Cross-cutting: audit/soft-delete on money records | 🟨 Partial | — | ✓ | Expenses are audited (SecurityAuditLog + approver fields); Fee/Payment have no updated_at, no soft-delete, no void/refund state, no recorded_by FK. |
| Report card generation & publishing (academic-leadership) | 🟨 Partial | ✓ | ✓ | publishReportCard/listReportCards are stubs — publish persists no state and the list is always empty; effectively fake-success. |

---
## Features WITHOUT a bursar UI (backend exists, no screen)
- 4.1 Edit fee category (change name/amount/frequency/description) — PUT /fee-categories/:id/ and financeApi.updateFeeCategory exist; UI only wires the is_active toggle, no edit form.
- Expense receipt attachment (Module 4.2/4.3) — receipt_path exists on model + recordExpense + getExpenses, but there is no file input, no multipart upload endpoint, and the ledger never displays a receipt. Only a bare path string could ever be stored — nothing sets it.
- 4.2 Automated receipt generation with QR verification + receipt lookup portal — receipt_number is shown in BursarHome recent-payments (BursarHome.js:140), but the 'receipt-generator' key is an empty-permission stub (permissions.js:122) and there is no QR verification or lookup-portal page wired for the bursar.
- Cross-cutting: audit/soft-delete on money records — Expenses are audited (SecurityAuditLog + approver fields); Fee/Payment have no updated_at, no soft-delete, no void/refund state, no recorded_by FK.

## Fully missing modules (no UI and no backend)
- 4.1 Installment plans
- 4.1 Late-fee calculation
- 4.1 Late fee calculation
- 4.2 Receipt lookup portal
- 4.2 Email/SMS receipt delivery
- 1.5 2FA required for Finance staff
- Edit finance user (role / access / contact after creation)
- 4.1 Installment plans, late-fee calculation, scholarship/discount application
- 4.4 Inventory & resource management
- 4.5 Staff Payroll & HR (payslips, salary config, deductions, leave)
- 1.5 2FA for finance staff
- 4.2 QR-code receipt verification
- 4.2 PDF receipt generation
- 4.2 PDF generation + Email/SMS delivery
- Cross-cutting: referential integrity
- 4.2 Email / SMS receipt delivery
- RBAC / 1.5 — 2FA required for Finance staff

See [05 Roadmap](05-ROADMAP-AND-FEATURES-TO-BUILD.md) for how to build each of these.
