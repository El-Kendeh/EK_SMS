# 02 · Backend & Data Audit

> **Bursar / Finance Dashboard — Audit & Upgrade Report**  ·  EK_SMS  ·  2026-07-03
> Source of truth: system plan **Module 4 — Finance & Administration** (`EK_SMS/public/docu/ek-sms-complete-plan.md.pdf`) + Finance-Officer RBAC (Module 1.5/1.6).
> 49 backend / security / data-integrity findings in `financeController.js`, routes, models & migrations.

**Severity legend:** 🔴 Critical (broken / unsafe, ship-blocker) · 🟠 High (wrong behaviour or major gap) · 🟡 Medium (correctness/UX) · ⚪ Low (polish).

**Coverage note:** 13 of 15 audit agents completed (117 findings). The dedicated **Payments-page** deep-audit and the **design/responsiveness** sweep did not finish (account session limit); their scope is partially covered by the modals, contract-drift, and shell audits. Findings were **not** through the adversarial verify pass — treat severities as auditor-assigned, not double-confirmed.

**Report index:** [00 Executive Summary](00-EXECUTIVE-SUMMARY.md) · [01 UI/UX & Responsiveness](01-UI-UX-AND-RESPONSIVENESS-AUDIT.md) · [02 Backend & Data](02-BACKEND-AND-DATA-AUDIT.md) · [03 Functionality & Contract Drift](03-FUNCTIONALITY-AND-CONTRACT-DRIFT.md) · [04 Plan-Gap Matrix](04-PLAN-GAP-MATRIX.md) · [05 Roadmap & Features to Build](05-ROADMAP-AND-FEATURES-TO-BUILD.md) · [06 Modals Audit](06-MODALS-AUDIT.md)

---

| 🔴 Critical | 🟠 High | 🟡 Medium | ⚪ Low | **Total** |
|---|---|---|---|---|
| 1 | 18 | 18 | 12 | **49** |

### Headline backend risks
- **Money stored as FLOAT** across Fee/Payment/Expense/FeeCategory → rounding drift, mis-firing `paid` status, reconciliation mismatch vs Orange Money/bank amounts. Migrate to `DECIMAL(12,2)` (or integer cents).
- **Receipt numbers are not unique** — no DB constraint, millisecond-collision generator — directly violates plan 4.2 and breaks receipt lookup/audit.
- **No amount validation** in `recordPayment` — negative / non-numeric amounts corrupt the ledger; **lost-update race** on `fee.amount_paid` under concurrent payments.
- **Finance-user provisioning is broken end-to-end** — new users are created inactive (can't log in) and suspend/activate writes to a non-existent `SchoolAdmin.is_active` column (fake success). Role/access-level are never persisted.
- **2FA for finance staff (Module 1.5) is absent**; no FK constraints on any finance table.
- **Migrations use MariaDB-only `IF NOT EXISTS`** on `CREATE INDEX`/`ADD COLUMN` — may silently fail on stock MySQL (and prod auto-sync is OFF, so migrations are the only path).

## Finance Team

### 🔴 Critical · `data-integrity` — Suspend/Activate is a silent no-op — is_active is not a column on the SchoolAdmin model, so the toggle never disables a login (fake success)
- **Where:** `EK_SMS/backend_node/src/controllers/financeController.js:793`
- **Impact:** A departed or compromised bursar cannot be suspended through this UI. The admin sees a success toast, the account stays fully active. This is a security control that does not work, presented as if it did.
- **Fix:** Add is_active (TINYINT default 1), role (VARCHAR), access_level (VARCHAR) columns to pruh_core_schooladmin via migration AND declare them in models/SchoolAdmin.js so Sequelize actually selects/persists them. Until then the toggle should not report success.
- **Evidence:** models/SchoolAdmin.js defines only user_id, school_id, must_change_password. updateFinanceUser does `admin.update({ is_active: !admin.is_active })` — admin.is_active is undefined (not a model attribute) and Sequelize drops unknown attributes, so the UPDATE writes nothing yet returns 200. getFinanceUsers maps `is_active: a.is_active !== false` → `undefined !== false` → always true. FinanceTeam.js:170 shows the banner 'X suspended' and reloads; FinanceTeam.js:221 recomputes `active = u.is_active !== false` → the card immediately shows Active again.
- **Effort:** M

### 🟠 High · `security` — Access-level 'Read Only' is not enforced — every finance user gets full bursar write permission
- **Where:** `EK_SMS/backend_node/src/controllers/financeController.js:757`
- **Impact:** The access_level control gives a false sense of least-privilege. A read-only finance clerk actually has full money-moving rights, contradicting Module 1.6 (Finance Officer vs Bursar) and 4.x expectations.
- **Fix:** Either enforce access_level in FINANCE_WRITE-gated handlers (block writes when the caller's SchoolAdmin.access_level==='ReadOnly'), or introduce distinct role_ids per finance role. Do not present a control that has no effect.
- **Evidence:** All created users get `role_id = await requireRoleId('bursar')` (lines 757, 766). Route authorization is by JWT role, which resolves to 'bursar' for anyone with that role_id (authController.js:147-148). FINANCE_WRITE = ['superadmin','school_admin','bursar'] (finance.js:24) — so a user tagged 'Read Only' or 'Accounts Clerk' can still record payments, assign fees, create fee categories and record expenses.
- **Effort:** L

### 🟡 Medium · `data-integrity` — Team list is unfiltered SchoolAdmin rows — the school's own admin/principal appear as 'finance users' and become suspend targets
- **Where:** `EK_SMS/backend_node/src/controllers/financeController.js:714`
- **Impact:** The Finance Team roster is polluted with non-finance leadership accounts, and a school_admin could click Suspend on the school's own admin/principal. It is latent today only because the toggle is currently a no-op (critical finding #1); once is_active is wired up this becomes a self-lockout / suspend-your-boss foot-gun.
- **Fix:** Scope getFinanceUsers to finance roles (e.g. join on User.role_id = bursar, or filter by SchoolAdmin.role once persisted), and never allow suspending the primary school_admin/principal from this page.
- **Evidence:** getFinanceUsers returns ALL pruh_core_schooladmin rows for the school with no role filter (line 714-720). That table also holds the primary school_admin (registrationController registerSchoolAdmin) and principal leadership links (authController.js comment at 136). All render as 'Bursar / Full / Active'.
- **Effort:** M

### ⚪ Low · `security` — Temp password shown in plaintext, defaults to a shared constant, with no forced rotation; new-user form fields lack autoComplete guards
- **Where:** `EK_SMS/src/components/bursar/FinanceTeam.js:99`
- **Impact:** Every finance account starts with a guessable, publicly-known password and no rotation requirement; on-screen plaintext exposure during creation; potential prefill of the creating admin's own credentials into the new-user fields.
- **Fix:** Set must_change_password:true on create; generate a random temp password instead of a shared constant; add autoComplete="new-password" to the password field and autoComplete="off" to email/username; consider masking the temp password with a reveal toggle.
- **Evidence:** Temporary Password input uses type="text" (line 99) so it renders on screen; placeholder and backend both default to the fixed value 'Finance@123' (line 99; financeController.js:755). createFinanceUser never sets must_change_password, so the shared default persists until the user voluntarily changes it. No field carries autoComplete="new-password"/"off", so the admin's saved email/username can prefill the new-user Email/Username inputs (the autofill-leak class the team fixed on Add-Student/Teacher).
- **Effort:** S

## Home

### 🟠 High · `data-integrity` — Partial fetch failure silently renders a fake $0 dashboard (error only shown if ALL six calls fail)
- **Where:** `src/hooks/useBursarDashboard.js:43`
- **Impact:** A bursar whose stats endpoint 500s (or times out on a low-connectivity Liberia link — the target context) sees a calm, fully-rendered dashboard reporting $0 collected, $0 outstanding, 0% collection rate. That is indistinguishable from a real empty school and actively misleads financial decisions. Same applies to any single failed call (e.g. snapshot fails → 'Payments Today: 0').
- **Fix:** Track per-section failure. Surface a non-blocking inline banner on any card whose source call failed (e.g. show '—' plus a retry affordance instead of 0), and only fall back to zeros when the call genuinely returned empty success. Do not treat a rejected/500 stats call as 'zero'.
- **Evidence:** const allFailed = [st, sn, pay, exp, cat, act].every((r) => r.status === 'rejected' || r.value?.success === false); if (allFailed) { setError(...) }. Because Promise.allSettled never rejects the batch, if only getStats() fails, no error is set. BursarHome.js:35-37 then falls back to `st = stats || { total_collected:0, outstanding_balance:0, expenses:0, balance:0, total_students:0 }`, so every KPI card, the Net Balance, and the collection-rate bar render 0 / 0% with NO error indicator.
- **Effort:** M

### 🟡 Medium · `data-integrity` — Collection-rate 'billed' figure mixes the Payment ledger with the Fee ledger and can misreport
- **Where:** `src/components/bursar/BursarHome.js:113`
- **Impact:** Whenever payments are recorded without linking a fee (allowed by RecordPaymentModal), total_collected diverges from the fee ledger's total_paid, so 'billed' (collected+outstanding) no longer equals actual amount_due and the collection rate is skewed (can even exceed the true billed total). Financial reporting shown to the bursar is internally inconsistent.
- **Fix:** Base collection rate on a single ledger: use Fee.amount_paid / Fee.amount_due (both from the Fee table) for the rate and the 'billed' figure, and keep total_collected as a separate 'cash received' KPI, or require fee_id on payments.
- **Evidence:** collected = st.total_collected (SUM of completed Payment.amount, financeController.js:40) while outstanding = st.outstanding_balance (Fee.amount_due − Fee.amount_paid, financeController.js:41-43). The bar note computes billed = collected + outstanding and prints 'fmtMoney(collected) collected of fmtMoney(collected + outstanding) billed' (BursarHome.js:112-114). recordPayment allows fee_id = null (financeApi.js:90, financeController.js:412), and such payments increment total_collected but NOT any Fee.amount_paid.
- **Effort:** M

## Student Fees ledger & statement page

### 🟠 High · `data-integrity` — General/unallocated payments are never credited to the statement balance — summary contradicts its own Payments list and overstates what the family owes
- **Where:** `EK_SMS/backend_node/src/controllers/financeController.js:527`
- **Impact:** An official fee statement handed to a parent shows a payment in the transactions list while simultaneously showing a Balance that ignores it — the student appears to still owe money already paid. Same defect silently inflates the main ledger's Outstanding total and getFinanceStats outstanding, all of which sum Fee balances only.
- **Fix:** Reconcile balances against actual Payments, not just Fee.amount_paid. Either (a) force every payment to allocate to a fee (drop the general-payment option or auto-allocate to oldest open fee), or (b) compute total_paid/balance in getStudentFees as SUM(payments.amount) with an explicit 'unallocated credit' line, and surface unallocated payments distinctly on the statement.
- **Evidence:** getStudentFees derives the statement summary purely from Fee rows: totalPaid = fees.reduce((s,f)=>s+f.amount_paid) and balance = totalDue-totalPaid (financeController.js:527-533). But recordPayment only updates a Fee.amount_paid when fee_id is present — `if (fee_id) { ...fee.update... }` (financeController.js:423-433). The shared RecordPaymentModal explicitly offers '— General payment (no specific fee) —' (RecordPaymentModal.js:206-207) and it is the default whenever no fee is preset. So a $500 general payment IS listed in the statement's Payments section (StudentFees.js:197-205, which lists ALL payments) yet is NOT reflected in Total Paid or Balance. The printed statement (StudentFees.js:88-100) inherits the same inconsistency.
- **Effort:** M

### 🟠 High · `data-integrity` — 200-row cap makes the ledger's Billed/Collected/Outstanding totals wrong for any school past ~200 fee records; search only sees the loaded subset
- **Where:** `EK_SMS/backend_node/src/controllers/financeController.js:231`
- **Impact:** A 300-student school with a single assigned fee already exceeds 200 rows; across terms/years it is far past. The finance officer's primary Outstanding figure is silently understated (only the newest 200 fees count), and searching for a student whose fees fall outside the newest 200 returns nothing on this page. This directly undermines plan 4.3 'Outstanding balances'.
- **Fix:** Add pagination or server-side aggregation for the totals (like getFinanceStats/analytics which use SQL SUM), display a total-count / 'showing X of N' indicator, and push the search term to the server (getFinanceFees already accepts student_id) instead of filtering only the loaded page.
- **Evidence:** getFinanceFees runs Fee.findAll({ ..., order:[['created_at','DESC']], limit: 200 }) (financeController.js:223-232) and returns only those rows. StudentFees then computes the headline totals by summing the loaded client set: totals = visible.reduce(... acc.due/paid/balance ...) (StudentFees.js:264-269), and the Billed/Collected/Outstanding chips render those sums (StudentFees.js:321-329). There is no pagination, no total count, and no 'showing 200 of N' indicator. Search is client-side over `fees` only (StudentFees.js:255-262).
- **Effort:** M

### 🟡 Medium · `security` — Plan 4.2 receipt integrity is unmet and mis-stated: no QR verification, no receipt-lookup portal, and payment_hash is an un-keyed plaintext concat the statement calls 'tamper-evident'
- **Where:** `EK_SMS/src/components/bursar/StudentFees.js:101`
- **Impact:** The document makes an integrity guarantee it cannot back — anyone can forge a matching 'hash' from visible fields. Plan 4.2's QR-code verification and receipt lookup portal are entirely absent, so a presented receipt cannot actually be validated by the school.
- **Fix:** Drop or soften the 'tamper-evident' wording until real integrity exists; implement an HMAC-signed receipt token, render it as a QR on the statement, and add a receipt-lookup/verify endpoint + portal per plan 4.2.
- **Evidence:** The statement footer prints 'All payments carry tamper-evident receipt hashes' (StudentFees.js:101). The referenced payment_hash is built as `${student_id}-${fee_id||'none'}-${amount}-${Date.now()}` with non-alphanumerics stripped (financeController.js:407) — no secret/HMAC, fully reconstructable, and never verified by any endpoint. There is no QR code on the statement/receipt, no receipt-lookup portal, and no verification route anywhere in finance.js.
- **Effort:** L

### ⚪ Low · `data-integrity` — No server-side overpayment guard on recordPayment; a general or direct-API payment can push Fee.amount_paid past amount_due, yielding a negative student balance shown as an unlabeled credit
- **Where:** `EK_SMS/backend_node/src/controllers/financeController.js:427`
- **Impact:** Overpayments and mis-keyed amounts create silent negative balances with no credit-tracking, complicating refunds/reconciliation.
- **Fix:** Validate amount <= outstanding server-side (or explicitly model overpayment as a credit balance), and label negative balances as 'Credit' in the ledger/statement.
- **Evidence:** recordPayment does newPaid = amount_paid + amount and sets status 'paid' when newPaid>=amount_due with no upper bound (financeController.js:427-431). The FE modal blocks overpayment only for fee-linked amounts (RecordPaymentModal.js:91-92) — general payments and any direct API call are unguarded. The statement/ledger then compute balance = due-paid (StudentFees.js:166, 374) which can go negative; the red-balance styling only triggers on balance>0 (StudentFees.js:387), so a credit prints as a plain/green number with no 'credit/overpaid' label.
- **Effort:** S

## backend — money-movement endpoints

### 🟠 High · `data-integrity` — Receipt numbers are not unique — no DB constraint and millisecond-collision generation (violates plan 4.2)
- **Where:** `EK_SMS/backend_node/src/controllers/financeController.js:406`
- **Impact:** Plan 4.2 explicitly requires 'unique receipt numbers'. Duplicate receipts break receipt lookup/verification and audit reconciliation; a parent could receive a receipt number that maps to another payment. Receipts are also globally sequential/timestamp-predictable, leaking cross-tenant payment timing.
- **Fix:** Add a UNIQUE index on receipt_number (and drop payment_hash or make it a real unique idempotency key). Generate per-school sequential or crypto-random receipt numbers (e.g. RCP-<schoolId>-<year>-<counter> or include crypto.randomBytes), and retry on the unique-violation. Mirror the pruh_core_grade_receipt.verification_hash approach the team already uses.
- **Evidence:** receiptNumber = `RCP-${Date.now().toString(36).toUpperCase()}` and payment_hash = `${student_id}-${fee_id||'none'}-${amount}-${Date.now()}` (lines 406-407). The column is a plain VARCHAR(255) with NO UNIQUE index — confirmed in migrations/2026-05-18-finance-and-approvals.sql:48-49 and no later migration adds one (grep over migrations/ shows uniqueness was added for pruh_core_grade_receipt.verification_hash but NOT for finance). Two payments recorded in the same millisecond — across ANY school, since the value is global not per-school — produce identical receipt_number AND identical payment_hash, and both INSERTs succeed.
- **Effort:** M

### 🟠 High · `data-integrity` — All currency columns are FLOAT — precision loss and drift on money math
- **Where:** `EK_SMS/backend_node/src/models/Payment.js:9`
- **Impact:** IEEE-754 FLOAT cannot represent decimal currency exactly. Repeated partial payments accumulate error; a fully-paid fee can land at 99.999999 and never flip to 'paid' (see the >= comparison at line 430), and SUM aggregates in getFinanceStats/getFinanceAnalytics drift over many rows. Real money in a production school ledger.
- **Fix:** Migrate all finance money columns to DECIMAL(12,2) and change the models to DECIMAL, handling values as strings/integer-cents in JS. This is the correct fix for stored money; the current Math.round on output only masks display, not the stored corruption.
- **Evidence:** Payment.amount is DataTypes.FLOAT (Payment.js:9); Fee.amount/discount/amount_due/amount_paid are all FLOAT (Fee.js:10-13); FeeCategory.amount is FLOAT (FeeCategory.js:9); DDL uses FLOAT NOT NULL (migrations/2026-05-18-finance-and-approvals.sql:16,30-33,45). recordPayment does raw float arithmetic newPaid = (fee.amount_paid||0) + amount (financeController.js:427) and stores it back unrounded.
- **Effort:** L

### 🟠 High · `data-integrity` — recordPayment does no real amount validation — negative and non-numeric amounts corrupt the ledger
- **Where:** `EK_SMS/backend_node/src/controllers/financeController.js:395`
- **Impact:** A bursar (or a malformed/hostile client) can post negative payments to zero-out or reverse balances silently, or a stringly-typed amount from the form can write nonsensical amount_paid values. Both directly corrupt outstanding-balance and collection totals.
- **Fix:** Coerce and validate: `const amt = Number(amount); if (!Number.isFinite(amt) || amt <= 0) return 400`. Apply the same to createFeeCategory.amount and assignFees.discount. Handle refunds/reversals as an explicit, audited operation, not a negative payment.
- **Evidence:** Validation is only `if (!student_id || !amount)` (line 395). A negative amount (e.g. -500) is truthy so it passes, is stored as a negative Payment.amount, and reduces fee.amount_paid via line 427 — effectively an un-audited reversal/refund with no permission. A string amount '100' also passes `!amount`, then `(fee.amount_paid||0) + amount` performs string concatenation (0 + '100' → '0100'; 50 + '100' → '50100'), writing garbage into amount_paid. There is no Number() coercion and no amount > 0 check.
- **Effort:** S

### 🟠 High · `data-integrity` — Lost-update race on fee.amount_paid — concurrent payments under-count
- **Where:** `EK_SMS/backend_node/src/controllers/financeController.js:425`
- **Impact:** Two mobile-money payments landing near-simultaneously on the same fee record only one increment — the school under-records collected money and over-states the student's outstanding balance. Silent money loss.
- **Fix:** Lock the fee row: `Fee.findOne({ ..., lock: transaction.LOCK.UPDATE, transaction })`, or perform an atomic `amount_paid = amount_paid + :amt` UPDATE and recompute status from the returned value. A DB unique/row lock is required for correctness under concurrency.
- **Evidence:** Inside the transaction, `const fee = await Fee.findOne({ where: { id: fee_id, school_id }, transaction })` (line 425) reads amount_paid with NO row lock, then `fee.update({ amount_paid: (fee.amount_paid||0)+amount })` (lines 427-431). Two concurrent payments for the same fee both read the same amount_paid snapshot and the second commit overwrites the first (classic read-modify-write lost update; InnoDB default isolation does not prevent it without SELECT ... FOR UPDATE).
- **Effort:** S

### 🟡 Medium · `data-integrity` — Overpayment is uncapped — amount_paid can exceed amount_due, poisoning outstanding aggregates
- **Where:** `EK_SMS/backend_node/src/controllers/financeController.js:427`
- **Impact:** Overpaying one student understates the school's true total outstanding (collection-rate and revenue-vs-budget dashboards read wrong). No credit balance is tracked, so the surplus is effectively lost in reporting.
- **Fix:** Reject or split payments that exceed the remaining balance, or record the surplus as an explicit credit/wallet balance (the plan mentions a 'Local wallet'). At minimum clamp status and surface an overpayment warning.
- **Evidence:** recordPayment adds the full amount with no comparison to the remaining balance (lines 427-431); amount_paid can exceed amount_due with no credit/overpayment handling. getFinanceStats then computes outstanding = totalDue - totalPaid (financeController.js:41-43), so an overpaid fee produces a negative per-fee balance that nets against other students' genuine outstanding balances.
- **Effort:** M

### 🟡 Medium · `security` — Money movements are not audit-logged and paid_by is trusted from the request body
- **Where:** `EK_SMS/backend_node/src/controllers/financeController.js:420`
- **Impact:** No server-side accountability for money movement: the recording officer is not captured and paid_by is caller-controlled, so the financial audit trail can be falsified. This undermines the Finance-Officer RBAC/2FA intent (Module 1.5/1.6).
- **Fix:** Set a server-derived recorded_by = req.user.id on Payment, keep paid_by only as an informational payer label, and write a SecurityAuditLog entry for every payment/fee-assignment/category change.
- **Evidence:** recordPayment stores `paid_by: paid_by || null` straight from req.body (line 420) and never records WHICH user (req.user.id) recorded the payment. appendSecurityAuditLog is imported (line 19) but is not called in recordPayment, assignFees, createFeeCategory or updateFeeCategory. Contrast recordExpense which correctly sets created_by: req.user?.id (line 558).
- **Effort:** M

### 🟡 Medium · `data-integrity` — assignFees discount is unvalidated — can produce negative amount_due
- **Where:** `EK_SMS/backend_node/src/controllers/financeController.js:360`
- **Impact:** Negative or oversized discounts create nonsensical fee rows (negative balances, or students charged more than the fee) that then corrupt outstanding/collection aggregates. This is the plan-4.1 scholarship/discount path, so it is the primary discount entry point.
- **Fix:** Validate `0 <= disc <= category.amount` (coerce with Number) and reject otherwise; consider supporting percentage discounts explicitly for scholarships.
- **Evidence:** `const disc = discount || 0; const amountDue = category.amount - disc;` (lines 360-361). discount comes straight from req.body with no bound check. A discount greater than category.amount yields a negative amount_due; a negative discount silently becomes a surcharge above the category price.
- **Effort:** S

### 🟡 Medium · `data-integrity` — recordPayment does not verify fee_id belongs to student_id — cross-student fee credit within a school
- **Where:** `EK_SMS/backend_node/src/controllers/financeController.js:425`
- **Impact:** Payment/fee linkage can be mismatched, so a student's fee gets credited by a payment logged under a different student — receipts and per-student ledgers disagree, and reconciliation breaks.
- **Fix:** Add student_id to the fee lookup: `Fee.findOne({ where: { id: fee_id, student_id, school_id } })` and 400/404 if it does not match.
- **Evidence:** The fee is looked up by `{ id: fee_id, school_id }` only (line 425); student_id is not part of the where clause. A payment recorded with student A's student_id but student B's fee_id (both in the same school) creates a Payment row attributed to A while incrementing B's fee.amount_paid.
- **Effort:** S

### 🟡 Medium · `backend` — getFinanceStats collected-vs-outstanding can never reconcile for payments with no fee_id
- **Where:** `EK_SMS/backend_node/src/controllers/financeController.js:40`
- **Impact:** Collections and outstanding balances are computed from two unlinked sources, so the finance dashboard's collection rate / outstanding figures do not reconcile whenever a payment is recorded without selecting a fee.
- **Fix:** Either require fee_id (or an explicit 'unallocated' bucket) on payment, or compute outstanding from (assigned fees - payments allocated to fees) consistently so the two numbers tie out.
- **Evidence:** total_collected comes from Payment.sum(amount) (line 40) but outstanding comes from Fee.amount_due - Fee.amount_paid (lines 41-43). recordPayment only updates a fee when fee_id is supplied (line 423), and fee_id is optional. A general payment (no fee_id) increases total_collected but never reduces any fee.amount_paid.
- **Effort:** M

### ⚪ Low · `data-integrity` — createFeeCategory amount is not validated (negative/zero/non-numeric); frequency free-form
- **Where:** `EK_SMS/backend_node/src/controllers/financeController.js:266`
- **Impact:** A fee category can be created with a negative or garbage amount, which then propagates into every assigned Fee via assignFees (category.amount used at lines 361, 368).
- **Fix:** Validate `Number.isFinite(Number(amount)) && Number(amount) >= 0` and constrain frequency to a known set (term/monthly/annual/one-time).
- **Evidence:** `if (!name || amount == null)` (line 266) only rejects null/undefined amount. A negative amount, 0, or a non-numeric string is accepted and stored (lines 268-272), and frequency is any string with no enum check.
- **Effort:** S

## Finance data model & migrations

### 🟠 High · `data-integrity` — All money columns are FLOAT, not DECIMAL — currency rounding drift
- **Where:** `EK_SMS/backend_node/migrations/2026-05-18-finance-and-approvals.sql:30`
- **Impact:** Stored balances silently drift from the true ledger. amount_paid >= amount_due comparisons (recordPayment line 430) can mis-fire, leaving a fee 'partial' when it is fully paid or vice-versa. The controller papers over this with Math.round(x*100)/100 on read, but the persisted value is already wrong. For a real money system this is a correctness defect.
- **Fix:** Migrate all finance money columns to DECIMAL(12,2) (or store minor units as BIGINT cents). Do it before prod carries meaningful volume; an ALTER ... MODIFY per column plus a Sequelize DataTypes.DECIMAL swap.
- **Evidence:** Every monetary column is `FLOAT`: fee_category.amount (line 16), fee.amount/discount/amount_due/amount_paid (lines 30-33), payment.amount (line 45), expense.amount (line 63); mirrored as DataTypes.FLOAT in Fee.js/Payment.js/Expense.js/FeeCategory.js. FLOAT is binary floating point, so e.g. 0.1+0.2 and repeated amount_paid += amount accumulate error.
- **Effort:** M

### 🟠 High · `data-integrity` — receipt_number has no UNIQUE constraint and the generator can collide (violates plan 4.2)
- **Where:** `EK_SMS/backend_node/src/models/Payment.js:12`
- **Impact:** Plan 4.2 explicitly requires 'unique receipt numbers'. Duplicate receipts can be issued under concurrency, breaking receipt lookup/verification and audit. Additionally, with no index on receipt_number, the planned 'receipt lookup portal' would full-scan pruh_finance_payment.
- **Fix:** Add a UNIQUE index on (school_id, receipt_number) and generate receipt numbers from a per-school sequence/counter (or Date.now + random suffix + retry on unique violation). Same treatment for payment_hash if it is to back QR verification.
- **Evidence:** receipt_number is `DataTypes.STRING` with no `unique:true` (Payment.js line 12) and the migration declares it plain `VARCHAR(255)` with no UNIQUE index and no index at all (2026-05-18 line 48). It is generated as `RCP-${Date.now().toString(36).toUpperCase()}` (financeController.js line 406) — millisecond precision, so two concurrent recordPayment calls in the same ms produce identical receipt numbers with nothing to reject them.
- **Effort:** M

### 🟠 High · `data-integrity` — No foreign-key constraints on any finance table — orphan rows possible
- **Where:** `EK_SMS/backend_node/migrations/2026-05-18-finance-and-approvals.sql:40`
- **Impact:** Deleting a student, term, or fee category leaves dangling Fee/Payment rows the DB will not prevent or cascade. Cross-table integrity depends entirely on application discipline; any direct SQL, bulk import, or bug produces silently orphaned money records.
- **Fix:** Add FK constraints with explicit ON DELETE behaviour (RESTRICT for category/student on Fee, CASCADE or SET NULL for Payment.fee_id) in a migration. At minimum add FK on fee.fee_category_id and payment.fee_id.
- **Evidence:** pruh_finance_fee.fee_category_id / student_id / term_id / school_id and pruh_finance_payment.fee_id / student_id are bare BIGINT with only plain (non-FK) indexes (migration lines 75-86). No FOREIGN KEY ... REFERENCES / ON DELETE anywhere. The associations are app-level only (associations.js). The code even works around this: updateFeeCategory deactivates instead of deleting because a hard delete 'could orphan assigned Fee rows' (financeController.js line 281-282).
- **Effort:** M

### 🟠 High · `backend` — Migrations use MariaDB-only IF NOT EXISTS on CREATE INDEX / ADD COLUMN — fails on stock MySQL
- **Where:** `EK_SMS/backend_node/migrations/2026-05-18-finance-and-approvals.sql:75`
- **Impact:** These migrations are the ONLY way finance schema reaches production (auto db.sync is OFF in prod, per the 2026-06-23 header note). If prod runs MySQL rather than MariaDB, the index/column statements error out — indexes never get created (slow finance queries) and, worse, the 2026-06-23 ADD COLUMN of created_by/approved_at/rejection_reason aborts, so recordExpense's INSERT of created_by hits an unknown column and every expense write 500s.
- **Fix:** Confirm the prod engine. If MySQL, rewrite index/column adds to be guard-checked via INFORMATION_SCHEMA + dynamic SQL (or drop-then-create), and split the expense column adds so a partial run is detectable. Do not assume MariaDB semantics.
- **Evidence:** `CREATE INDEX IF NOT EXISTS idx_fee_school ON ...` (lines 75-86) and `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` (lines 93-100, and 2026-06-23 lines 38-41). `IF NOT EXISTS` on CREATE INDEX and ADD COLUMN is MariaDB syntax; MySQL 5.7 and 8.0 reject it as a syntax error.
- **Effort:** M

### 🟡 Medium · `data-integrity` — Fee and Payment lack updated_at / soft-delete / void-refund state
- **Where:** `EK_SMS/backend_node/src/models/Payment.js:20`
- **Impact:** A recorded payment cannot be corrected, voided, or refunded with an audit trail; edits (if ever added) leave no timestamp. Deleting a fee/category is a hard delete with no soft-delete recovery. For financial records this is an auditability gap.
- **Fix:** Add updated_at (and deleted_at for soft delete) to Fee/Payment/FeeCategory, and model refunds/voids either as a Payment.status transition with a reversal row or a dedicated adjustment record; never mutate the original amount in place.
- **Evidence:** Payment.js sets timestamps:false with only paid_at + created_at (no updated_at, no deleted_at); Fee.js and FeeCategory.js likewise have created_at only. Payment.status defaults 'completed' and is the only value ever written — there is no 'voided'/'refunded' state and no reversal path.
- **Effort:** M

### 🟡 Medium · `data-integrity` — First expense migration defaults status 'approved' and omits created_by — ordering hazard on prod
- **Where:** `EK_SMS/backend_node/migrations/2026-05-18-finance-and-approvals.sql:67`
- **Impact:** A prod DB that ran only the first migration has expenses that (a) default to 'approved' (bypassing the approval workflow) and (b) lack created_by, so recordExpense's INSERT of created_by fails. Success depends on both manual migrations being applied in order, which is fragile given auto-sync is OFF in prod.
- **Fix:** Verify prod applied 2026-06-23; add a guard/assertion that created_by exists before serving expense writes, and consider a consolidated finance-schema baseline migration to remove the two-step dependency.
- **Evidence:** 2026-05-18 creates pruh_finance_expense with `status VARCHAR(50) DEFAULT 'approved'` and only approved_by (lines 66-67) — no created_by/approved_at/rejection_reason. Those, plus the flip to DEFAULT 'pending', land only in the separate 2026-06-23 migration (lines 38-50). The Expense model and recordExpense assume the newer shape (created_by, status:'pending').
- **Effort:** S

### ⚪ Low · `data-integrity` — Payment has no recorded-by user FK; paid_by is free text
- **Where:** `EK_SMS/backend_node/src/models/Payment.js:16`
- **Impact:** Unlike expenses, payments carry no accountable operator id, so 'who took this cash payment' is a typed string at best — weak for reconciliation and fraud investigation in a cash-heavy context.
- **Fix:** Add recorded_by BIGINT (FK to user) to Payment and populate it from req.user.id in recordPayment; keep paid_by for the external payer's name.
- **Evidence:** paid_by is `DataTypes.STRING` free text (Payment.js line 16); there is no created_by/recorded_by BIGINT linking the payment to the staff user who entered it (contrast Expense.created_by, which was added for exactly this reason).
- **Effort:** S

## backend — expenses, finance-user provisioning, and leadership/academic

### 🟠 High · `data-integrity` — Deactivating a finance user is fake-success — access can never actually be revoked
- **Where:** `EK_SMS/backend_node/src/controllers/financeController.js:793`
- **Impact:** The Finance Team page's activate/deactivate toggle reports success but changes nothing; every finance user always shows as Active. There is NO working path to disable a bursar's finance access — a real security control is missing while appearing to work. (Even if it worked, it toggles the wrong entity: login is gated by User.is_active, not SchoolAdmin.)
- **Fix:** Toggle User.is_active on the linked user_id (the field the login gate actually reads), not a non-existent SchoolAdmin.is_active; return the resulting state so the UI reflects reality.
- **Evidence:** updateFinanceUser calls admin.update({ is_active: !admin.is_active }) and returns successResponse({}, 'Status updated'). But SchoolAdmin (models/SchoolAdmin.js:6-20) defines ONLY user_id, school_id, must_change_password — there is no is_active attribute, and no migration adds one to pruh_core_schooladmin. Sequelize silently drops the unknown field, so the update is a no-op. getFinanceUsers (line 728) also returns is_active as `a.is_active !== false` where a.is_active is always undefined → always true.
- **Effort:** M

### 🟠 High · `security` — 2FA for finance staff (plan Module 1.5) is not implemented
- **Where:** `EK_SMS/backend_node/src/controllers/financeController.js:759`
- **Impact:** Finance accounts that move money and view financial records are protected by a single factor, violating the stated security requirement for finance staff.
- **Fix:** Add a TOTP secret/enabled column to User, enforce enrollment for bursar role at first login, and add a second-factor step to the login flow for finance roles. Track as a feature, not a quick patch.
- **Evidence:** createFinanceUser provisions a plain username/password bursar with no 2FA enrollment. The User model (User.js) has no TOTP/2FA/secret columns, and authController login (190-222) issues a token immediately after the password + is_active check with no second-factor challenge. Plan: 'Finance Officer / Bursar ... 2FA required for Finance staff (Module 1.5).'
- **Effort:** XL

### 🟡 Medium · `security` — Weak shared default password with no forced reset
- **Where:** `EK_SMS/backend_node/src/controllers/financeController.js:754`
- **Impact:** Finance accounts can be created with a well-known default credential and are never forced to change it, giving an easy foothold to a money-and-records role.
- **Fix:** Require an explicit strong password (reject weak/absent), or generate a random one and set must_change_password=true so the bursar must reset on first login.
- **Evidence:** const hashedPassword = await bcrypt.hash(password || 'Finance@123', 10) — when no password is supplied the account gets the predictable literal 'Finance@123'. createFinanceUser never sets SchoolAdmin.must_change_password (which defaults false), and there is no password-strength validation on a supplied password.
- **Effort:** S

### 🟡 Medium · `security` — Bursar can read full academic data (student grades + PII, class rankings, teacher insights)
- **Where:** `EK_SMS/backend_node/src/routes/finance.js:44`
- **Impact:** A finance officer can read every student's grades and admission numbers, class performance rankings, and teacher performance signals — academic PII well outside the finance scope (least-privilege / data-minimization violation). Note: this is READ-only; the academic WRITE routes are correctly gated to superadmin/principal, so no bursar academic-write path exists.
- **Fix:** Restrict the academic GET endpoints to ['superadmin','school_admin','principal'] (drop bursar), or split the leadership/command-dashboard endpoints onto a separate leadership router rather than sharing the finance router.
- **Evidence:** The suite is gated by router.use(requireRole(FINANCE_ACCESS)) where FINANCE_ACCESS=['superadmin','school_admin','principal','bursar'] (line 22). The GET academic/leadership endpoints add no stricter gate: /grade-approvals (44), /report-cards (46), /dashboard (50), /class-performance (51), /teacher-insights (52), /syllabus-progress (55), /overview (43). listGradeApprovals (financeController.js:851-885) returns per-student grades with student_name, admission_number, per-subject ca/midterm/final/total. Plan RBAC scopes Finance Officer to 'Fee management, Payment processing, Financial reports' only.
- **Effort:** M

### ⚪ Low · `security` — Grade approval/rejection is not written to the audit log and has no self-review guard
- **Where:** `EK_SMS/backend_node/src/controllers/financeController.js:901`
- **Impact:** Grade approvals/rejections leave no tamper-evident audit trail (inconsistent with the expense workflow), weakening accountability on grade changes.
- **Fix:** Add a SecurityAuditLog entry per grade reviewed (actor, grade_ids, action, comment), and consider a separation-of-duties guard mirroring reviewExpense.
- **Evidence:** reviewGradeChange (901-938) updates approval_status/approved_by/approved_at and appends a timestamped remark, but — unlike reviewExpense — writes NO appendSecurityAuditLog entry for this sensitive academic-governance action, and has no guard preventing a reviewer from approving a grade they themselves submitted.
- **Effort:** S

### ⚪ Low · `data-integrity` — recordExpense accepts negative/non-numeric amounts; money stored as FLOAT
- **Where:** `EK_SMS/backend_node/src/controllers/financeController.js:547`
- **Impact:** A negative expense can offset/inflate the books; FLOAT storage risks rounding drift in financial totals used by stats/analytics.
- **Fix:** Validate amount = Number(amount) > 0 before create; store money as DECIMAL(12,2) rather than FLOAT.
- **Evidence:** Validation is only `if (!description || !amount)` (547) — amount:0 is rejected but a negative or non-numeric amount passes straight to Expense.create. Expense.js:9 declares amount as DataTypes.FLOAT (binary float for currency).
- **Effort:** S

### ⚪ Low · `backend` — createFinanceUser duplicate-email check is cross-tenant and leaks existence
- **Where:** `EK_SMS/backend_node/src/controllers/financeController.js:750`
- **Impact:** Reveals that an email exists somewhere on the platform (enumeration) and blocks a school from provisioning a finance login for a person who shares an email with a user in another tenant, with a misleading message pointing to 'the Bursars page' of the current school.
- **Fix:** Given the global unique constraint on User.email, keep the guard but return a neutral message and avoid implying the existing user belongs to this tenant.
- **Evidence:** if (email) { const dup = await User.findOne({ where: { email } }); if (dup) return 409 '... If they are already a Bursar, manage them on the Bursars page ...' } — the lookup is global (no school_id), so a match may belong to a different school.
- **Effort:** S

## Module 4 — Finance & Administration

### 🟠 High · `data-integrity` — All monetary values stored as FLOAT (Fee, Payment, Expense, FeeCategory) — rounding drift in a real money system
- **Where:** `EK_SMS/backend_node/src/models/Payment.js:9`
- **Impact:** Balances and totals accumulate sub-cent errors; 'paid' status can trip early/late; reconciliation against Orange Money/bank amounts will mismatch. Unacceptable for a payment system handling real fees.
- **Fix:** Migrate all money columns to DECIMAL(12,2) and model them as DECIMAL; do arithmetic on integer cents or DECIMAL; keep the round-on-read as belt-and-braces.
- **Evidence:** amount: DataTypes.FLOAT (Payment.js:9); Fee.amount/amount_due/amount_paid/discount all FLOAT (Fee.js:10-13); Expense.amount FLOAT; SQL columns are FLOAT (2026-05-18-finance-and-approvals.sql:16,30-33,45,63). recordPayment mutates `newPaid = (fee.amount_paid||0) + amount` (financeController.js:427) accumulating float error; reads paper over it with Math.round(x*100)/100 but the stored value keeps drifting.
- **Effort:** L

### 🟠 High · `backend` — recordPayment has no server-side balance cap; general (fee-less) payments inflate collected without reducing outstanding
- **Where:** `EK_SMS/backend_node/src/controllers/financeController.js:427`
- **Impact:** The only client-side guard (RecordPaymentModal amountError) is bypassable via direct API or a preset general payment. Any lump-sum/general payment raises revenue and the displayed 'billed' figure but never lowers outstanding, so collection rate and 'billed' are wrong; overpayments create negative balances. Data-integrity + misleading KPIs the bursar acts on.
- **Fix:** Validate amount>0 and (for fee-linked) amount ≤ remaining balance server-side; decide and document how general payments settle fees (allocate to oldest open fee, or forbid); derive 'billed' from Fee.amount_due, not collected+outstanding.
- **Evidence:** When fee_id is present, `newPaid = amount_paid + amount` with NO check that it stays ≤ amount_due, so overpayment drives balance negative and force-marks 'paid' (financeController.js:427-431). When fee_id is null the payment writes to Payment but touches no Fee. Meanwhile getFinanceStats computes total_collected = Payment.sum(completed) but outstanding = Fee.amount_due − Fee.amount_paid (financeController.js:40-43), and the home/Reports collection rate = collected/(collected+outstanding) is labelled 'X collected of Y billed' (BursarHome.js:112-114).
- **Effort:** M

### 🟠 High · `security` — No 2FA for finance staff, and 'suspended' finance users can still log in
- **Where:** `EK_SMS/backend_node/src/controllers/authController.js:74`
- **Impact:** Module 1.5 mandates 2FA for Finance staff; it is absent. A finance login with only a password (default 'Finance@123' from createFinanceUser) can move money and cannot be suspended through the provided UI. Direct violation of the security plan for the highest-risk role.
- **Fix:** Enforce TOTP (authenticator) enrollment + challenge at login for bursar/finance roles; make finance-user suspension flip User.is_active so the login gate denies them.
- **Evidence:** login() runs bcrypt.compare then proceeds straight to token issuance (authController.js:74-89, no OTP/second-factor step). OTP sendOtp/verifyOtp are registration-only. Combined with the broken FinanceTeam toggle (finding #1) that writes a non-existent SchoolAdmin.is_active, there is no working way to revoke a bursar.
- **Effort:** L

### 🟡 Medium · `security` — getFinanceUsers returns every SchoolAdmin as 'Bursar', and createFinanceUser grants a SchoolAdmin row to bursars
- **Where:** `EK_SMS/backend_node/src/controllers/financeController.js:714`
- **Impact:** The school's actual admins/principals appear in the Finance Team list mislabeled as Bursar/Full/Active, and (via the broken toggle) look suspendable. Making every bursar a SchoolAdmin row conflates finance staff with school-admin linkage. Role boundaries in the finance UI are inaccurate.
- **Fix:** Filter finance-users to genuine finance roles (or a dedicated table) and stop overloading pruh_core_schooladmin for bursars; label rows by their real role.
- **Evidence:** getFinanceUsers = SchoolAdmin.findAll({ where:{ school_id } }) with no role filter (financeController.js:714), then labels each `role: a.role||'Bursar'`. createFinanceUser creates a User (role_id=bursar) AND a SchoolAdmin row (financeController.js:759-775).
- **Effort:** M

### ⚪ Low · `data-integrity` — Receipt numbers are not collision-proof
- **Where:** `EK_SMS/backend_node/src/controllers/financeController.js:406`
- **Impact:** Two payments recorded in the same millisecond (bulk/scripted) get identical receipt numbers, breaking receipt lookup and audit uniqueness.
- **Fix:** Use a per-school sequence or add a random suffix, and put a UNIQUE constraint on (school_id, receipt_number).
- **Evidence:** `receiptNumber = RCP-${Date.now().toString(36).toUpperCase()}` (financeController.js:406); no unique index on receipt_number in the migration.
- **Effort:** S

### ⚪ Low · `security` — Forced password change not enforced for new finance users
- **Where:** `EK_SMS/backend_node/src/controllers/financeController.js:769`
- **Impact:** A predictable default password persists until the user voluntarily changes it; the promised first-login rotation isn't enforced.
- **Fix:** Set must_change_password:true and gate the finance portal until rotation; never ship a shared default password.
- **Evidence:** createFinanceUser creates the SchoolAdmin row without must_change_password:true, and the User gets default password 'Finance@123' (financeController.js:755) while the UI hint claims they 'should change their password on first login'.
- **Effort:** S

## frontend↔backend contract verification

### 🟠 High · `data-integrity` — Finance Team suspend/activate is a no-op fake-success (SchoolAdmin.is_active is not a mapped column)
- **Where:** `EK_SMS/backend_node/src/controllers/financeController.js:793`
- **Impact:** Clicking Suspend/Activate on a finance user always reports success but the user remains Active after reload — a security/access control (revoking a bursar's finance access) that silently does nothing. Every finance user is perpetually shown as Active.
- **Fix:** Toggle User.is_active (the field that actually gates login) instead, or add a real is_active column to SchoolAdmin via migration and map it on the model. Return the persisted value from getFinanceUsers.
- **Evidence:** The SchoolAdmin Sequelize model defines only user_id, school_id, must_change_password (SchoolAdmin.js:6-20) — there is no is_active attribute, and no migration adds one (2026-05-18-finance-and-approvals.sql does not touch pruh_core_schooladmin). updateFinanceUser calls `admin.update({ is_active: !admin.is_active })` (financeController.js:793): is_active is unmapped so Sequelize never writes it, and admin.is_active is always undefined. getFinanceUsers computes `is_active: a.is_active !== false` (financeController.js:728) = always true. FinanceTeam.js:168-171 shows a success banner regardless.
- **Effort:** M

### ⚪ Low · `data-integrity` — Expenses page depends on the 2026-06-23 approval migration being applied in prod
- **Where:** `EK_SMS/backend_node/src/controllers/financeController.js:611`
- **Impact:** If the 2026-06-23 migration hasn't been run on a given environment, getExpenses will error or the Expenses table's Recorded By / reviewer / rejection-reason columns and the pending-approval workflow will be blank/broken even though the FE↔BE code contract itself is consistent.
- **Fix:** Confirm 2026-06-23-ai-capture-and-expense-approval.sql is applied on every environment before shipping the Expenses approval UI; add a startup schema check or fold the ALTERs into an idempotent migration run on deploy.
- **Evidence:** getExpenses returns created_by_name/approved_by_name/rejection_reason/approved_at and status defaulting to 'pending' (financeController.js:611-643, 546-560), and the Expense model maps these (Expense.js:13-19). But the original migration 2026-05-18-finance-and-approvals.sql creates pruh_finance_expense WITHOUT created_by/approved_at/rejection_reason and with status DEFAULT 'approved'; those columns come from the separate 2026-06-23-ai-capture-and-expense-approval.sql, which project memory lists as a still-pending manual prod migration.
- **Effort:** S

## Fee Categories page + Assign Fees modal

### 🟡 Medium · `data-integrity` — Category 'applicable classes' is collected and stored but never enforced — decorative metadata
- **Where:** `EK_SMS/src/components/bursar/AssignFeesModal.js:190`
- **Impact:** A category flagged 'JSS1 only' can be freely assigned to SSS3 students; the applicable-classes selection is a false promise with no runtime effect, and the chips shown on each card imply a scoping guarantee the system never applies.
- **Fix:** Either filter the Assign modal's class dropdown by presetCategory.applicable_classes (and validate server-side in assignFees), or remove the applicable-classes UI from create to avoid implying enforcement. If kept, add applicable_classes to updateFeeCategory so it's editable.
- **Evidence:** CreateCategoryModal collects applicable classes as chips (FeeCategories.js:102-123) and the backend stores them (financeController.js:271 `applicable_classes: JSON.stringify(...)`). But assignFees (financeController.js:323-386) never reads applicable_classes, and the Assign modal's class picker lists ALL school classes unconditionally: AssignFeesModal.js:190-193 `classes.map((c)=><option ...>)` with no filter against presetCategory.applicable_classes. updateFeeCategory (financeController.js:291) doesn't even accept applicable_classes, so it can't be edited.
- **Effort:** M

### ⚪ Low · `backend` — assignFees does not validate/clamp discount server-side — negative amount_due possible via direct API
- **Where:** `EK_SMS/backend_node/src/controllers/financeController.js:361`
- **Impact:** A crafted or buggy client call produces a Fee row with negative amount_due, corrupting outstanding-balance and collection-rate reports downstream.
- **Fix:** Validate in assignFees: reject if discount<0 or discount>=category.amount (mirror the client rule), or clamp amount_due to >=0.
- **Evidence:** financeController.js:360-361 `const disc = discount || 0; const amountDue = category.amount - disc;` with no bound check. The client blocks discount>=amount (AssignFeesModal.js:82-87) and clamps net to Math.max(0,...) (line 89), but the server does not, so a direct POST with discount>amount writes a negative amount_due.
- **Effort:** S

## Expenses page & expense-approval workflow

### 🟡 Medium · `data-integrity` — recordExpense accepts negative (and non-whitelisted) amounts server-side
- **Where:** `EK_SMS/backend_node/src/controllers/financeController.js:547`
- **Impact:** Server validation is only `if (!description || !amount)`, which rejects 0/empty but PASSES negative amounts (e.g. -500) and arbitrary category strings. The UI blocks negatives (amountNum > 0, min 0.01), but a direct API call or any non-UI client can record a negative expense; once approved it is SUMmed into approved-spend in getFinanceStats/getFinanceAnalytics (status='approved'), skewing the books downward. Category is a free string with no whitelist.
- **Fix:** Validate amount is a finite number > 0 on the server before Expense.create; optionally constrain category to the known set. Cheap guard against garbage/malicious rows corrupting financial totals.
- **Evidence:** financeController.js:547 `if (!description || !amount) return 400`; no >0 check; Expense.amount is FLOAT (Expense.js:9). Contrast the frontend guard in Expenses.js:40.
- **Effort:** S

## Reports & Analytics page

### 🟡 Medium · `data-integrity` — Collection Rate KPI is period-invariant while sitting in a period-scoped KPI row
- **Where:** `EK_SMS/src/components/bursar/Reports.js:366`
- **Impact:** A user selecting 'This Month' sees revenue/expenses update but collection rate stays at the lifetime value, implying it is scoped to the chosen period. Misleading — someone could report an all-time 82% as this month's collection.
- **Fix:** Either compute collection rate from the period-filtered fee ledger so it moves with the selector, or visibly label the card as 'All-time' / move it out of the period-scoped KPI row so it does not read as period-specific.
- **Evidence:** stats is fetched via getStats() with no params (Reports.js:287) and is always all-time. Revenue/Expenses/Net KPIs recompute from the period-filtered analytics window, but the Collection Rate card (Reports.js:365-370, value `${collectionRate}%`) never changes when the user switches from e.g. '3 Months' to 'This Month'. The four cards share one row (bfr-kpis) with no period qualifier on the rate card.
- **Effort:** M

### 🟡 Medium · `data-integrity` — Collection Rate mixes a payment-based numerator with a fee-ledger denominator (can exceed 100% / mislead)
- **Where:** `EK_SMS/backend_node/src/controllers/financeController.js:40`
- **Impact:** 'Collection Rate' can read >100% or be inflated whenever a school records ad-hoc payments not linked to a Fee row — a plausible real workflow. The headline finance KPI becomes untrustworthy.
- **Fix:** Define collection rate consistently from the fee ledger: rate = sum(amount_paid)/sum(amount_due) over the scope, and clamp to [0,100]. Keep total_collected for a separate 'cash received' figure.
- **Evidence:** total_collected = SUM(Payment.amount where status=completed) (financeController.js:40) counts ALL payments, including those recorded with fee_id=null (recordPayment allows fee_id null, financeController.js:412). outstanding = Fee.amount_due - Fee.amount_paid (financeController.js:41-43). Reports.js:320-321 computes rate = collected/(collected+outstanding). When payments are not tied to fees, the numerator exceeds sum(amount_paid), and if fees are overpaid, outstanding goes negative, so the ratio can exceed 100%.
- **Effort:** M

## shell wiring & RBAC gating

### 🟡 Medium · `security` — 2FA for finance staff (plan Module 1.5) is not enforced anywhere in the bursar login/route path
- **Where:** `EK_SMS/src/App.js:183`
- **Impact:** Finance-officer accounts (payment processing, fee/expense mutation) authenticate with single-factor credentials, contrary to the security requirement for the exact role that touches money.
- **Fix:** Add a 2FA enrollment/challenge step in the login flow gated on finance roles (bursar) before granting the dashboard session, mirroring how must_change_password interrupts the route; confirm the backend issues a 2FA-verified token.
- **Evidence:** The auth effect routes role 'bursar' straight to 'superadmindashboard' after only a must_change_password check (App.js:177-185); there is no 2FA/OTP step for finance roles. The plan explicitly requires '2FA required for Finance staff (Module 1.5)'. No 2FA gate exists in the shell, in permissions.js, or in the bursar routing.
- **Effort:** L

### ⚪ Low · `backend` — Superadmin is blocked from all finance DETAIL pages by the NotAuthorized gate, even though the render code wraps them in a superadmin school-picker — the scoped() wrapper on those lines is unreachable dead code
- **Where:** `EK_SMS/src/components/superadmin/SuperadminDashboard.js:1515`
- **Impact:** A superadmin can view a school's finance SUMMARY (Fee Dashboard) but is hard-blocked from that same school's Student Fees, Payments, Expenses, Finance Team and Reports — an oversight/audit gap and an internal inconsistency (the code implies operator access that RBAC denies). The SASchoolScope wrapping on 5 render branches is dead code.
- **Fix:** Decide the policy: if superadmins should audit finance detail via the school picker, add SUPERADMIN to those five PAGE_PERMISSIONS entries; if not, remove the pointless scoped() superadmin-picker wrapping from lines 1515-1520 to avoid the misleading dead path.
- **Evidence:** student-fees/payments/expenses/finance-team/finance-reports are rendered via scoped(...) which, for role superadmin, wraps the page in <SASchoolScope> so an operator can pick a school (SuperadminDashboard.js:1515-1520, 706-710). But those five keys are BURSAR-only in PAGE_PERMISSIONS (permissions.js:113-121), so the render-time guard at line 1165 short-circuits to <NotAuthorized/> before scoped() is ever reached. fee-dashboard (permissions.js:111) is the only finance key that actually includes SUPERADMIN, so the superadmin school-picker branch fires for it alone.
- **Effort:** S
