# 01 · UI / UX & Responsiveness Audit

> **Bursar / Finance Dashboard — Audit & Upgrade Report**  ·  EK_SMS  ·  2026-07-03
> Source of truth: system plan **Module 4 — Finance & Administration** (`EK_SMS/public/docu/ek-sms-complete-plan.md.pdf`) + Finance-Officer RBAC (Module 1.5/1.6).
> 12 UI-layer findings across the bursar suite.

**Severity legend:** 🔴 Critical (broken / unsafe, ship-blocker) · 🟠 High (wrong behaviour or major gap) · 🟡 Medium (correctness/UX) · ⚪ Low (polish).

**Coverage note:** 13 of 15 audit agents completed (117 findings). The dedicated **Payments-page** deep-audit and the **design/responsiveness** sweep did not finish (account session limit); their scope is partially covered by the modals, contract-drift, and shell audits. Findings were **not** through the adversarial verify pass — treat severities as auditor-assigned, not double-confirmed.

**Report index:** [00 Executive Summary](00-EXECUTIVE-SUMMARY.md) · [01 UI/UX & Responsiveness](01-UI-UX-AND-RESPONSIVENESS-AUDIT.md) · [02 Backend & Data](02-BACKEND-AND-DATA-AUDIT.md) · [03 Functionality & Contract Drift](03-FUNCTIONALITY-AND-CONTRACT-DRIFT.md) · [04 Plan-Gap Matrix](04-PLAN-GAP-MATRIX.md) · [05 Roadmap & Features to Build](05-ROADMAP-AND-FEATURES-TO-BUILD.md) · [06 Modals Audit](06-MODALS-AUDIT.md)

---

| 🔴 Critical | 🟠 High | 🟡 Medium | ⚪ Low | **Total** |
|---|---|---|---|---|
| 0 | 0 | 3 | 9 | **12** |

> ⚠️ The standalone **design/responsiveness sweep** agent did not complete. The per-page `@media (max-width:600/400/360)` audit mandated by project standards is **only partially covered** here (from the shell + modal audits). A focused responsiveness pass is still owed — tracked in [05](05-ROADMAP-AND-FEATURES-TO-BUILD.md).

## Reports & Analytics page

### 🟡 Medium · `accessibility` — Chart figures are only reachable via a native title tooltip — invisible on touch/mobile and inaccessible to screen readers
- **Where:** `EK_SMS/src/components/bursar/Reports.js:458`
- **Impact:** On phones/tablets (the Liberia low-connectivity, mobile-first context) a user cannot read any actual revenue/expense figure from the chart — only relative bar heights. Screen-reader users get nothing from the chart at all.
- **Fix:** Add value labels above bars (or an accessible data table fallback / aria-label per column) and a Y-axis scale or the max-value reference, so figures are legible without hover.
- **Evidence:** Bars carry values only in the title attribute (Reports.js:459-460); there are no numeric labels, no Y-axis, no gridlines. Bars are plain divs with no role/aria-label/text alternative (Reports.js:461-466). title tooltips do not fire on touch, and the horizontal-scroll chart is the mobile presentation.
- **Effort:** M

### ⚪ Low · `ux-copy` — Chart 'no data' empty state is unreachable for preset periods; empty periods render a flat zero-height baseline instead
- **Where:** `EK_SMS/src/components/bursar/Reports.js:453`
- **Impact:** A brand-new school picking 'This Month' sees an empty-looking chart of flat slivers with no explanatory copy, which reads as broken rather than 'no data yet'.
- **Fix:** Detect an all-zero window (sum of revenue+expenses===0) and show the same empty-state copy used in the length===0 branch.
- **Evidence:** For any non-'all' period, monthly is padded to >=1 month via monthKeysFor (Reports.js:304-310), so monthly.length===0 (the empty branch, Reports.js:453-454) only triggers for period 'all' with zero data. A month with no transactions renders bars at 0% height (min-height 2px sliver, Reports.css:72) rather than the 'No transactions in this period yet' message.
- **Effort:** S

## backend — expenses, finance-user provisioning, and leadership/academic

### 🟡 Medium · `performance` — Command-dashboard and class-performance load entire tables into memory
- **Where:** `EK_SMS/backend_node/src/controllers/financeController.js:1023`
- **Impact:** At real data volumes these endpoints pull tens of thousands of rows per request into Node memory, causing slow responses and memory pressure on the low-connectivity target environment — exactly what getFinanceAnalytics avoids by aggregating in SQL.
- **Fix:** Compute averages/counts with SQL aggregation (AVG/COUNT + GROUP BY) instead of findAll+reduce, mirroring getFinanceAnalytics.
- **Evidence:** getSchoolCommandDashboard does Grade.findAll({where:{school_id}}) (1023) and Attendance.findAll({where:{school_id}}) (1028) with no limit, then reduces/filters in JS. getClassPerformance (1064-1080) loads all classes → all students → all grades and aggregates in JS. Attendance grows every school day.
- **Effort:** M

## cross-cutting MODALS audit

### 🟡 Medium · `accessibility` — No bursar modal implements Escape-to-close, a focus trap, focus restoration, or role=dialog/aria-modal
- **Where:** `EK_SMS/src/components/bursar/RecordPaymentModal.js:125`
- **Impact:** Keyboard and screen-reader users cannot dismiss any modal with Escape, Tab escapes to the page behind the open dialog, and closing returns focus to document start instead of the trigger. Assistive tech is not told a dialog is open (no role=dialog/aria-modal/aria-labelledby). This affects all 10 modals uniformly.
- **Fix:** Extract a shared Modal wrapper: add role='dialog' aria-modal='true' aria-labelledby to the title, an Escape handler, a Tab focus trap, and focus restoration to the opener on close. Reuse it across all bursar modals rather than repeating the raw overlay div.
- **Evidence:** Grepping the whole bursar folder for Escape/keydown/role="dialog"/aria-modal returns nothing. Every overlay is a bare div with onClick={onClose} (e.g. RecordPaymentModal.js:125, AssignFeesModal.js:129, FeeCategories.js:61, FinanceTeam.js:60,273, Expenses.js:66,145, Payments.js:30, StudentFees.js:128, Reports.js:185). autoFocus moves focus in, but nothing keeps it there or restores it.
- **Effort:** M

## Home

### ⚪ Low · `performance` — getFinanceSnapshot is fetched on every home load but only paymentsToday is used
- **Where:** `src/components/bursar/BursarHome.js:38`
- **Impact:** Redundant DB work on a low-connectivity target: a joined 10-row query and three sums are run just to display a single 'Payments Today' count that a lightweight count query could provide.
- **Fix:** Either drop getFinanceSnapshot from the home hook and derive Payments Today from a cheap dedicated count, or render the snapshot's revenue/outstanding/transactions so the fetch isn't wasted.
- **Evidence:** sn default = { revenue, outstanding, paymentsToday, transactions } but the component reads only sn.paymentsToday (BursarHome.js:51). getFinanceSnapshot runs a count PLUS three SUM aggregates PLUS a 10-row Payment+Student+User join (financeController.js:1126-1148); revenue/outstanding duplicate getFinanceStats and transactions duplicate getPayments.
- **Effort:** S

### ⚪ Low · `ux-copy` — Activity feed renders raw ISO timestamps and never shows finance-specific events
- **Where:** `src/components/schooladmin/Principal/ActivityFeed.jsx:42`
- **Impact:** On the bursar home the 'Recent Activity' feed shows raw strings like 2026-06-30T14:23:11.000Z and mislabels payments; expense activity is invisible. Low-value, slightly unpolished feed for a finance operator.
- **Fix:** Format it.at with the existing fmtDateTime util before rendering, emit kind:'payment' for payment notifications, and add notifications (or a finance-scoped event source) for expense record/approve so the feed reflects finance activity.
- **Evidence:** ActivityFeed prints <span>{it.at}</span> unformatted (ActivityFeed.jsx:42); getActivityFeed maps Notification rows to kind = type==='alert'?'request':'announce' (financeController.js:1179), so payment notifications (type 'info') render as the generic 'announce'/campaign icon, never the green 'payment' icon in KIND_META, and expense record/approve events create no notification at all so they never appear.
- **Effort:** S

### ⚪ Low · `ui` — Collection-rate sub-note is not gated by loading and flashes '$0 collected of $0 billed'
- **Where:** `src/components/bursar/BursarHome.js:112`
- **Impact:** On first paint the user briefly sees '$0.00 collected of $0.00 billed' under a '…' percentage — a minor inconsistent/misleading flash.
- **Fix:** Gate the note on loading too (render a skeleton or hide it until loaded), matching the percentage's loading treatment.
- **Evidence:** The bar percentage is gated (`{loading ? '…' : `${collectionRate}%`}`, line 102) but the note directly below renders unconditionally: `{fmtMoney(collected)} collected of {fmtMoney(collected + outstanding)} billed` with collected=0 during the initial load (BursarHome.js:112-114).
- **Effort:** S

## Fee Categories page + Assign Fees modal

### ⚪ Low · `ux-copy` — Deactivate/activate failure is shown in the green success banner
- **Where:** `EK_SMS/src/components/bursar/FeeCategories.js:253`
- **Impact:** A failed deactivate shows a green banner with a checkmark and the error text, telling the user the action succeeded when it didn't; rapid clicks can send redundant updates.
- **Fix:** Route the failure to setError (red banner) and disable the toggle button while the request is in flight.
- **Evidence:** On toggle failure the handler does `setBanner(e?.message || 'Failed to update category.')` (FeeCategories.js:253), but `banner` only renders through the success-styled element at line 186 (`bur-banner--success` with a check_circle icon). The red error path uses a separate `error` state (line 187) that this handler never sets. The toggle button also has no in-flight disabled state, so a double-click can fire duplicate PUTs.
- **Effort:** S

## Expenses page & expense-approval workflow

### ⚪ Low · `ux-copy` — 'Shown' chip sums mixed statuses, including rejected, into one money figure
- **Where:** `EK_SMS/src/components/bursar/Expenses.js:228`
- **Impact:** shownTotal reduces over every visible row regardless of status, so with 'All statuses' selected it adds approved + pending + rejected amounts into a single dollar total. Rejected money never left the school, so the combined figure isn't financially meaningful and can mislead at a glance.
- **Fix:** Exclude rejected from the sum (or split into approved/pending), or relabel to make clear it is the raw sum of the currently visible rows.
- **Evidence:** Expenses.js 228-231: expenses.reduce((sum, x) => sum + Number(x.amount||0), 0); rendered as the 'Shown (N)' chip at 287-289 with no status exclusion.
- **Effort:** S

## Student Fees ledger & statement page

### ⚪ Low · `ui` — Statement is two disconnected lists, not a chronological running-balance ledger; payments aren't tied to fees and there's no student/term context
- **Where:** `EK_SMS/src/components/bursar/StudentFees.js:160`
- **Impact:** A 'statement' users expect to read as dated debits/credits with a running balance instead reads as two tables; combined with the unallocated-payment issue above, it is hard to reconcile a specific payment against a specific charge.
- **Fix:** Render a single date-ordered ledger (charges as debits, payments as credits) with a running balance and per-payment fee allocation, and add class/term/year context to the statement header.
- **Evidence:** The statement renders a Fees list (StudentFees.js:160-190) and a separate Payments list (StudentFees.js:192-207) with no chronological interleaving, no running balance, and no linkage of each payment to the fee it settled. The header carries only name + admission_number (StudentFees.js:86-87) — no class, academic year, or term scope.
- **Effort:** M

## Finance Team

### ⚪ Low · `ui` — 'Added —' on every card — created_at is mapped but pruh_core_schooladmin has no created_at
- **Where:** `EK_SMS/backend_node/src/controllers/financeController.js:731`
- **Impact:** Every finance-user card shows a meaningless 'Added —', implying missing data.
- **Fix:** Add a created_at column (or reuse the User.created_at that already exists) and surface it, or drop the 'Added' line until a real timestamp is available.
- **Evidence:** SchoolAdmin model is timestamps:false and defines no created_at; getFinanceUsers itself notes this (comment at line 719) yet still maps `created_at: a.created_at` (line 731) → undefined. FinanceTeam.js:247 renders `Added {fmtDate(u.created_at)}` and fmtDate(undefined) returns '—' (bursar.utils.js:18-22).
- **Effort:** S

## frontend↔backend contract verification

### ⚪ Low · `ui` — Activity feed renders the raw ISO timestamp instead of a formatted date
- **Where:** `EK_SMS/src/components/schooladmin/Principal/ActivityFeed.jsx:42`
- **Impact:** On BursarHome, the Recent Activity list shows raw timestamps like '2026-07-01T13:22:05.000Z' instead of a friendly 'Jul 1, 2026, 01:22 PM'.
- **Fix:** Format it.at with fmtDateTime in ActivityFeed (or format server-side before returning).
- **Evidence:** getActivityFeed returns items with at: n.created_at (a raw Date/ISO string) at financeController.js:1181. ActivityFeed.jsx:42 renders `<span>{it.at}</span>` with no formatting, unlike every other bursar surface which uses fmtDateTime/fmtDate from bursar.utils.js.
- **Effort:** S

---
### Shared design-system recommendation
The eight bursar pages each ship their own `*.css` with one-off card/table/button styling. Extract a shared finance token set + `FinanceCard`, `FinanceTable` (with a mobile stacked/scroll variant), and skeleton-loading states so every page renders loading/empty/error consistently. Verify every page carries the mandated `@media (max-width:600px)`, `400px`, `360px` rules and ≥44px touch targets before ship.
