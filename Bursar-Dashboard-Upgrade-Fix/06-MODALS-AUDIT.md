# 06 · Modals Audit

> **Bursar / Finance Dashboard — Audit & Upgrade Report**  ·  EK_SMS  ·  2026-07-03
> Source of truth: system plan **Module 4 — Finance & Administration** (`EK_SMS/public/docu/ek-sms-complete-plan.md.pdf`) + Finance-Officer RBAC (Module 1.5/1.6).
> 10 findings across the bursar modals + the updates each needs to carry the plan-4.x features.

**Severity legend:** 🔴 Critical (broken / unsafe, ship-blocker) · 🟠 High (wrong behaviour or major gap) · 🟡 Medium (correctness/UX) · ⚪ Low (polish).

**Coverage note:** 13 of 15 audit agents completed (117 findings). The dedicated **Payments-page** deep-audit and the **design/responsiveness** sweep did not finish (account session limit); their scope is partially covered by the modals, contract-drift, and shell audits. Findings were **not** through the adversarial verify pass — treat severities as auditor-assigned, not double-confirmed.

**Report index:** [00 Executive Summary](00-EXECUTIVE-SUMMARY.md) · [01 UI/UX & Responsiveness](01-UI-UX-AND-RESPONSIVENESS-AUDIT.md) · [02 Backend & Data](02-BACKEND-AND-DATA-AUDIT.md) · [03 Functionality & Contract Drift](03-FUNCTIONALITY-AND-CONTRACT-DRIFT.md) · [04 Plan-Gap Matrix](04-PLAN-GAP-MATRIX.md) · [05 Roadmap & Features to Build](05-ROADMAP-AND-FEATURES-TO-BUILD.md) · [06 Modals Audit](06-MODALS-AUDIT.md)

---

| 🔴 Critical | 🟠 High | 🟡 Medium | ⚪ Low | **Total** |
|---|---|---|---|---|
| 0 | 3 | 3 | 4 | **10** |

Modals in scope: `RecordPaymentModal`, `AssignFeesModal`, `CreateCategoryModal` (inline in FeeCategories), `AddUserModal` (inline in FinanceTeam), `PaymentDetailModal` (inline in Payments), the Expense form, and confirm dialogs.

## cross-cutting MODALS audit

### 🟠 High · `modal` — RecordPaymentModal: success step has no receipt actions (PDF/email/SMS/QR), no installment plan, no late-fee — the core of plan 4.1/4.2 is absent on the primary money-collection surface
- **Where:** `EK_SMS/src/components/bursar/RecordPaymentModal.js:137`
- **Impact:** Plan 4.2 requires QR-code receipts, PDF generation, and Email/SMS delivery — Liberia context is SMS-fallback first. A bursar who records an Orange Money payment can read a receipt number on screen but cannot hand the parent anything: no printed/PDF receipt, no SMS. Plan 4.1 installment plans and late-fee calculation have no entry point at all; partial payments work arithmetically (fee flips to 'partial') but there is no scheduled plan, due-date reminder, or late penalty.
- **Fix:** Add a receipt-action row to the success step: Print/Save-PDF (reuse StudentFees printStatement), 'Send by SMS/Email' (needs a backend resend endpoint), and a QR image encoding the receipt_number+hash for the lookup portal. Add an optional installment-schedule builder (n instalments, due dates) and surface a computed late fee with a bursar override. For mobile_money/bank_transfer/cheque, make the Reference field required for reconciliation (currently optional, lines 238-243).
- **Evidence:** The success 'Payment Recorded' step (lines 137-154) shows the receipt number and hash but the only control is a single 'Done' button (line 152). There is no Print/Download receipt, no Email/SMS delivery, no QR verification, no installment scheduler, and no late-fee field anywhere in the form (lines 200-256). Backend accepts only student_id/fee_id/amount/payment_method/reference/notes/paid_by (financeController.js:394).
- **Effort:** L

### 🟠 High · `modal` — PaymentDetailModal is the receipt-lookup surface (plan 4.2) yet only offers 'Copy receipt #' — no print, no PDF, no SMS/email resend, no QR verification
- **Where:** `EK_SMS/src/components/bursar/Payments.js:39`
- **Impact:** Plan 4.2 calls for a receipt lookup portal with QR-code verification and Email/SMS delivery. This modal is exactly that surface, but a parent who lost their receipt cannot be re-sent one from here, and the tamper-evident hash shown (line 59-61) cannot be verified by anyone without a QR/verify flow.
- **Fix:** Add 'Print receipt' (reuse the escaped-HTML print approach from StudentFees.js printStatement, scoped to one payment), 'Resend SMS/Email' (backend endpoint), and render a QR encoding receipt_number+payment_hash so the printed receipt is verifiable. Keep Copy as a secondary action.
- **Evidence:** The read-only receipt modal (Payments.js:16-70) renders student/amount/method/date/hash and a single 'Copy receipt #' button (lines 41-43). No print, no PDF export, no resend, no QR.
- **Effort:** M

### 🟠 High · `modal` — AddUserModal creates finance staff with NO 2FA (plan 1.5 mandates it), a shared weak default password, and no autoComplete guard on the password field
- **Where:** `EK_SMS/src/components/bursar/FinanceTeam.js:97`
- **Impact:** Every finance user created without a typed password shares the identical credential Finance@123, and 2FA — explicitly required for finance roles handling money — is never provisioned, so the built system cannot meet its own security spec. The un-guarded type='text' password field also invites the browser to autofill the logged-in admin's saved credentials (the autofill-leak class already fixed elsewhere in this codebase).
- **Fix:** Generate a unique random temp password per user (show it once, copyable) instead of a shared default; add autoComplete='new-password' (and autoComplete='off' on username); add a 'Require 2FA on first login' toggle wired to the auth flow. Also add an Edit path — today role/access can only be set at creation, never changed (only suspend/activate exists).
- **Evidence:** The modal collects name/email/phone/username/password/role/access (FinanceTeam.js:21-134). Password input is type='text' with placeholder 'defaults to Finance@123' and no autoComplete attribute (lines 97-101); backend hashes password || 'Finance@123' for every user who leaves it blank (financeController.js:755). There is no 2FA enrollment field. Plan 1.5/RBAC: '2FA required for Finance staff'.
- **Effort:** M

### 🟡 Medium · `modal` — AssignFeesModal discount is a single flat absolute amount applied uniformly to all selected students — not the scholarship/discount system plan 4.1 describes
- **Where:** `EK_SMS/src/components/bursar/AssignFeesModal.js:195`
- **Impact:** Plan 4.1 lists SCHOLARSHIP/DISCOUNT application as a first-class feature. A 25%-off bursary, or a named scholarship for two students in a class, cannot be modelled — the bursar must run separate single-student assignments to vary the amount, and the discount carries no label so reports can't distinguish a scholarship from an ad-hoc rebate.
- **Fix:** Add a discount-type toggle (amount vs percent) and an optional scholarship name/reason captured on the Fee row; allow per-student discount override in the multi-select list. Persist the type+label so finance reports and the student statement can show 'Scholarship: X'.
- **Evidence:** Discount is one numeric input (AssignFeesModal.js:195-202) sent as an absolute amount and applied identically to every student in the bulk assign (financeController.js:360-361 amountDue = category.amount - disc for each sid). No percentage option, no scholarship name/type, no per-student value.
- **Effort:** L

### 🟡 Medium · `modal` — Backdrop click (and the X) can dismiss a modal mid-submit or a half-filled form with no dirty check — data loss, including losing a committed payment's receipt
- **Where:** `EK_SMS/src/components/bursar/RecordPaymentModal.js:131`
- **Impact:** Clicking outside a long form (RecordPayment student+amount+method+notes, AssignFees multi-select, CreateCategory, AddUser) throws the entered data away silently. Worse: if the user clicks the backdrop during the recordPayment request, the component unmounts, the payment still commits server-side, but the bursar never sees the receipt number/hash — an unrecoverable receipt for a real money movement.
- **Fix:** Disable the overlay close and the X while submitting; on a dirty form, either require a confirm before discarding or ignore backdrop clicks (close only via explicit Cancel/X). At minimum guard onClose with `if (submitting) return`.
- **Evidence:** The overlay onClick={onClose} (line 125) and the header close button onClick={onClose} (line 131) stay active while submitting is true — neither is disabled during the in-flight financeApi.recordPayment call (lines 100-119). Same pattern in AssignFees/CreateCategory/AddUser. There is no confirm on discarding a filled multi-field form.
- **Effort:** S

### 🟡 Medium · `modal` — CreateCategoryModal has no late-fee configuration and no edit variant — categories are create-only from the UI
- **Where:** `EK_SMS/src/components/bursar/FeeCategories.js:16`
- **Impact:** A fee category's amount or name cannot be corrected once created (only deactivate/reactivate), so a typo'd tuition amount is permanent from the UI. Late-fee rules — the natural home for which is the category — cannot be defined, so plan 4.1 late-fee calculation has no configuration surface.
- **Fix:** Reuse this modal in an edit mode (prefill from the category, call updateFeeCategory) and add optional late-fee fields (grace days + flat/percent penalty) persisted on FeeCategory, then surface the computed penalty in RecordPaymentModal.
- **Evidence:** The modal collects name/amount/description/frequency/applicableClasses only (FeeCategories.js:16-136). financeApi exposes updateFeeCategory (financeApi.js:75) and the backend supports PUT, but the UI only uses it to flip is_active (FeeCategories.js:248-251) — there is no edit-fields modal, and no late-fee rule field despite plan 4.1 late-fee calculation being category-scoped.
- **Effort:** M

### ⚪ Low · `modal` — RecordExpenseModal captures no receipt/attachment or vendor reference for the approval workflow
- **Where:** `EK_SMS/src/components/bursar/Expenses.js:31`
- **Impact:** An approver (plan: principal/school_admin) must approve or reject spending against the books with no receipt image or vendor/invoice reference to verify against, weakening the expense-approval control that Module 4.3 expense tracking implies.
- **Fix:** Add an optional receipt file/image upload and a vendor/invoice-reference field to the payload and the approver's row so approvals are evidence-backed.
- **Evidence:** Fields are description/amount/category/date only (Expenses.js:31-122). The modal's own banner says a principal/school_admin must approve (lines 78-81), yet the approver is given no supporting document.
- **Effort:** M

### ⚪ Low · `modal` — StatementModal print relies on window.open and fails silently when the popup is blocked
- **Where:** `EK_SMS/src/components/bursar/StudentFees.js:104`
- **Impact:** On browsers/enterprise setups that block popups (common on locked-down school machines), the bursar clicks Download Statement and nothing happens, with no explanation — the one working plan-4.2 PDF path appears broken.
- **Fix:** Detect the null window and show a banner ('Allow popups to download, or use browser Print'), or switch to a hidden iframe / Blob download that doesn't need a popup. Also add email/SMS delivery of the statement to fully meet 4.2.
- **Evidence:** printStatement does `const win = window.open(...); if (!win) return;` (StudentFees.js:104-105) — when a popup blocker stops the window there is no error, banner, or fallback; the 'Download Statement' button (line 142-146) simply does nothing.
- **Effort:** S

### ⚪ Low · `modal` — RejectExpenseModal and the FinanceTeam confirmToggle dialog are functionally solid but inherit the shared no-Escape/no-focus-trap gap
- **Where:** `EK_SMS/src/components/bursar/Expenses.js:125`
- **Impact:** These two are the best-behaved modals for validation/loading, so the only outstanding issue is the cross-cutting accessibility one — worth noting so they are migrated when the shared Modal wrapper lands rather than left as bespoke copies.
- **Fix:** Migrate both onto the shared accessible Modal wrapper (dialog role, Escape, focus trap); no field/logic changes needed.
- **Evidence:** RejectExpenseModal requires a reason, shows inline errors and a submitting state (Expenses.js:125-177); confirmToggle is a clean confirm with a disabled-during-toggle button (FinanceTeam.js:272-301). Both are raw overlay divs with no Escape/focus handling and no role=dialog.
- **Effort:** S

### ⚪ Low · `modal` — ExportModal is the most accessible modal but still lacks Escape-to-close and a focus trap
- **Where:** `EK_SMS/src/components/bursar/Reports.js:185`
- **Impact:** Minor — a keyboard user selecting a dataset via the radiogroup cannot Escape out and can Tab behind the dialog; smallest-impact instance of the shared a11y gap.
- **Fix:** Fold into the shared Modal wrapper for Escape/focus-trap; keep the existing radiogroup semantics.
- **Evidence:** ExportModal already has role=radiogroup/radio/aria-checked (Reports.js:217-228) and a full configure/generating/ready/error flow, but the overlay (line 185) has no Escape handler or focus containment.
- **Effort:** S

---
### Cross-modal update checklist (to reach plan 4.1/4.2)
- **RecordPaymentModal** → add a **payment-method selector** (Cash / Orange Money / Bank / Cheque / Card / Wallet) with a mobile-money reference field; add **discount/scholarship** and **late-fee** rows; on success show **receipt actions** (Print/Save-PDF, Send SMS/Email, QR).
- **PaymentDetailModal** (receipt-lookup surface) → add Print receipt, Resend SMS/Email, and a QR encoding `receipt_number + hash` for verification.
- **CreateCategoryModal** → add installment-plan definition, late-fee rule, and applicable-classes; add an **Edit** path (backend `updateFeeCategory` exists).
- **AddUserModal** → unique random temp password (shown once), `autoComplete="new-password"`, and a **Require 2FA on first login** toggle (plan 1.5).
- **All modals** → disabled-while-submitting state, focus trap + Escape/backdrop close, full-screen sheet under 600px.
