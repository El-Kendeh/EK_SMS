# 00 · Executive Summary

> **Bursar / Finance Dashboard — Audit & Upgrade Report**  ·  EK_SMS  ·  2026-07-03
> Audited against system plan **Module 4 — Finance & Administration** (`EK_SMS/public/docu/ek-sms-complete-plan.md.pdf`) plus Finance-Officer RBAC (Module 1.5/1.6).
> Method: 13 parallel audit agents read the real frontend (`src/components/bursar/*`), backend (`backend_node/src/controllers/financeController.js`, routes, models, migrations) and the plan. **117 findings + 117 plan-gap observations.**

**Severity legend:** 🔴 Critical (broken/unsafe, ship-blocker) · 🟠 High (wrong behaviour or major gap) · 🟡 Medium (correctness/UX) · ⚪ Low (polish).

---

## Verdict

The bursar suite is a **solid recording ledger that stops short of being a finance system**. Eight pages exist and the day-to-day money-recording flow (create fee category → assign fees → record payment → view ledger → record & approve expenses) is wired end to end, and the **expense approval workflow is genuinely well built** (separation of duties, double-review guard, audit logging). But three things pull it below shippable for the role it targets:

1. **The bursar role itself is broken on its two core actions.** A real `bursar` login gets a **403 on the student picker**, so *Record Payment* and *Assign Fees* — the whole point of the dashboard — fail. Today it only works when a `school_admin`/`principal` drives it.
2. **Finance-user management is fake-success on both ends.** New finance users are created **inactive and can never log in**; the **suspend/activate toggle writes to a column that doesn't exist** and silently does nothing. So you can neither onboard nor revoke a bursar through the UI that's built to do exactly that.
3. **The money layer isn't safe for real money.** All currency is stored as **FLOAT**, **receipt numbers aren't unique**, `recordPayment` does **no amount validation** and has a **lost-update race**, and statement balances are computed wrongly for schools past ~200 fee records.

Above that sits the larger truth from the plan: **Module 4 is roughly one-third delivered.** Cashless recording and expense tracking exist; **receipts (QR/PDF/SMS/email/lookup), installment plans, late fees, revenue-vs-budget, mobile-money reconciliation, inventory (4.4), payroll/HR (4.5), document management (4.6), and 2FA for finance staff (1.5) are absent.**

De-duplicated against the plan: **✅ ~19 features present · 🟨 ~30 partial · ❌ ~30 missing.**

---

## Scorecard by area

| Area | Rating | Findings (C/H/M/L) | One-line |
|---|---|---|---|
| Expenses + approval workflow | ✅ Strong | 0 / 1 / 3 / 3 | Best part of the suite; missing budget context + receipt upload |
| Dashboard home / shell | 🟨 Partial | 0 / 1 / 4 / 4 | Works, but a partial fetch failure renders a fake **$0** dashboard |
| Fee Categories + Assign Fees | 🟨 Partial | 0 / 1 / 3 / 2 | Bursar 403 on student picker; no edit UI; flat discount only |
| Student Fees ledger | 🟨 Partial | 0 / 2 / 2 / 2 | Balance wrong (uncredited general payments); 200-row cap skews totals |
| Reports & Analytics | 🟨 Partial | 0 / 2 / 5 / 2 | CSV works; **no** revenue-vs-budget, no term/class breakdown, no PDF |
| Nav / RBAC wiring | 🟨 Partial | 0 / 0 / 2 / 1 | Reachable; some role-gating inconsistencies |
| Backend — money endpoints | 🟠 Weak | 0 / 4 / 6 / 2 | FLOAT money, non-unique receipts, no validation, race |
| Backend — expenses/users/leadership | 🟨 Partial | 0 / 3 / 5 / 4 | Provisioning broken; 2FA absent |
| Data model & migrations | 🟠 Weak | 0 / 7 / 6 / 1 | FLOAT, no FKs, MariaDB-only DDL, no schema for 4.1/4.4/4.5 |
| Modals | 🟨 Partial | 0 / 3 / 4 / 4 | No receipt actions; weak default password; no 2FA |
| FE↔BE contract | 🟠 Weak | 1 / 1 / 1 / 3 | The 403 student-picker break lives here |
| **Finance Team (provisioning)** | 🔴 **Broken** | **2** / 2 / 5 / 2 | Can't onboard or revoke a finance user |

> **Coverage caveat:** the dedicated **Payments-page** audit and the **design/responsiveness** sweep did not finish (session limit). Payments is partly covered via the modals + contract-drift audits; a focused responsiveness pass (mandated `@media 600/400/360`) is still owed.

## Finding counts

| | 🔴 Critical | 🟠 High | 🟡 Medium | ⚪ Low | Total |
|---|---|---|---|---|---|
| **By severity** | 3 | 31 | 50 | 33 | **117** |

By category: data-integrity 31 · missing-feature 21 · contract-drift 14 · security 12 · functionality 11 · modal 10 · backend 6 · ui 4 · ux-copy 4 · performance 2 · accessibility 2.

---

## Top must-fix (ship-blockers first)

| # | Sev | Item | Where | Effort |
|---|---|---|---|---|
| 1 | 🔴 | Bursar gets 403 on student picker → Record Payment & Assign Fees broken for the bursar role | `backend_node/src/routes/school.js:173` | **S** |
| 2 | 🔴 | New finance users created inactive → can never log in | `financeController.js:759` | **S** |
| 3 | 🔴 | Suspend/Activate finance user is a no-op (writes non-existent `SchoolAdmin.is_active`) | `financeController.js:793` | **S–M** |
| 4 | 🟠 | Finance-user role & access-level never stored (all show "Bursar / Full Access") | `financeController.js:769` + model | **M** |
| 5 | 🟠 | "Read Only" access level not enforced — every finance user has full write | `financeController.js:757` | **M** |
| 6 | 🟠 | All money columns are FLOAT → rounding drift, mis-fired "paid" status | `models/Payment.js:9` + migration | **M** |
| 7 | 🟠 | Receipt numbers not unique (no constraint, ms-collision) — violates plan 4.2 | `financeController.js:406` | **S–M** |
| 8 | 🟠 | `recordPayment` — no amount validation (negatives) + lost-update race | `financeController.js:395,425` | **S–M** |
| 9 | 🟠 | Statement balance wrong: general payments uncredited + 200-row cap | `financeController.js:231,527` | **M** |
| 10 | 🟠 | Partial fetch failure renders a fake $0 dashboard instead of an error | `hooks/useBursarDashboard.js:43` | **S** |
| 11 | 🟠 | Migrations use MariaDB-only `IF NOT EXISTS` DDL — may fail on stock MySQL | `migrations/2026-05-18-finance-and-approvals.sql:75` | **S** |
| 12 | 🟠 | No 2FA for finance staff (plan 1.5) + shared weak default password `Finance@123` | `financeController.js:759`, `FinanceTeam.js:97` | **L** |

Items 1–3 are one-line-to-small fixes that unblock the entire role. Do them first.

---

## Roadmap (three waves)

**Wave 1 — Make what exists correct & safe** (days, not weeks). Fix items 1–11 above: unblock the bursar role (student-picker gate), repair finance-user provisioning (activate on create; suspend flips `User.is_active`; persist role/access_level), harden money (DECIMAL, unique receipts, amount validation, row-lock, real balance reconciliation), and stop the fake-$0 dashboard. These are correctness/security repairs on surfaces that already ship.

**Wave 2 — Complete Module 4 on the existing pages.** Receipts to plan 4.2 (unique #, QR verify, PDF, SMS/email delivery, lookup portal); fee engine to plan 4.1 (installment plans, late-fee accrual, real scholarship/discount, mobile-money reference + reconciliation fields); dashboards to plan 4.3 (revenue-vs-budget, cash-flow view, collection-rate by term/class, report PDF/print); edit-finance-user; 2FA for finance roles (plan 1.5).

**Wave 3 — New modules.** Inventory & Resource Management (4.4), Staff Payroll & HR (4.5), Document & Certificate Management (4.6) — each a fresh schema + endpoints + bursar screens, buildable in parallel once Wave 1 lands.

Full build detail — scope, screens, endpoints, data model, effort and sequencing — is in **[05 Roadmap & Features to Build](05-ROADMAP-AND-FEATURES-TO-BUILD.md)**.

---

## The rest of this report

- **[01 · UI/UX & Responsiveness](01-UI-UX-AND-RESPONSIVENESS-AUDIT.md)** — per-page UI issues, states, mobile, shared design-system recommendation.
- **[02 · Backend & Data](02-BACKEND-AND-DATA-AUDIT.md)** — endpoint-by-endpoint security/money/atomicity + data-model & migration gaps.
- **[03 · Functionality & Contract Drift](03-FUNCTIONALITY-AND-CONTRACT-DRIFT.md)** — what silently breaks between React and Express; broken-flow table.
- **[04 · Plan-Gap Matrix](04-PLAN-GAP-MATRIX.md)** — every 4.1–4.6 + RBAC feature: Present / Partial / Missing, with UI/backend coverage.
- **[05 · Roadmap & Features to Build](05-ROADMAP-AND-FEATURES-TO-BUILD.md)** — the build plan for everything not yet implemented.
- **[06 · Modals Audit](06-MODALS-AUDIT.md)** — per-modal fields, validation, a11y, and the updates each needs.
