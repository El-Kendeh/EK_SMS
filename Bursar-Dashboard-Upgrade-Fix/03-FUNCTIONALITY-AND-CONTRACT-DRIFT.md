# 03 · Functionality & FE↔BE Contract Drift

> **Bursar / Finance Dashboard — Audit & Upgrade Report**  ·  EK_SMS  ·  2026-07-03
> Source of truth: system plan **Module 4 — Finance & Administration** (`EK_SMS/public/docu/ek-sms-complete-plan.md.pdf`) + Finance-Officer RBAC (Module 1.5/1.6).
> 25 functional & contract-drift findings — what silently breaks between the React pages and the Express controller.

**Severity legend:** 🔴 Critical (broken / unsafe, ship-blocker) · 🟠 High (wrong behaviour or major gap) · 🟡 Medium (correctness/UX) · ⚪ Low (polish).

**Coverage note:** 13 of 15 audit agents completed (117 findings). The dedicated **Payments-page** deep-audit and the **design/responsiveness** sweep did not finish (account session limit); their scope is partially covered by the modals, contract-drift, and shell audits. Findings were **not** through the adversarial verify pass — treat severities as auditor-assigned, not double-confirmed.

**Report index:** [00 Executive Summary](00-EXECUTIVE-SUMMARY.md) · [01 UI/UX & Responsiveness](01-UI-UX-AND-RESPONSIVENESS-AUDIT.md) · [02 Backend & Data](02-BACKEND-AND-DATA-AUDIT.md) · [03 Functionality & Contract Drift](03-FUNCTIONALITY-AND-CONTRACT-DRIFT.md) · [04 Plan-Gap Matrix](04-PLAN-GAP-MATRIX.md) · [05 Roadmap & Features to Build](05-ROADMAP-AND-FEATURES-TO-BUILD.md) · [06 Modals Audit](06-MODALS-AUDIT.md)

---

| 🔴 Critical | 🟠 High | 🟡 Medium | ⚪ Low | **Total** |
|---|---|---|---|---|
| 2 | 4 | 14 | 5 | **25** |

### Broken / half-working flows at a glance
| Flow | State | Why |
|---|---|---|
| Record Payment (bursar) | 🔴 Broken for bursar role | Student picker calls `GET /school/students/` gated to leadership; bursar gets **403** |
| Assign Fees (bursar) | 🔴 Broken for bursar role | Same 403 on student lookup |
| Provision finance user | 🔴 Fake success | Created inactive → user can never log in |
| Suspend / activate finance user | 🔴 Fake success | Writes non-existent `SchoolAdmin.is_active` |
| Finance-user role / access level | 🟠 Data loss | Chosen values never stored; all render "Bursar / Full Access" |
| Dashboard on partial fetch failure | 🟠 Misleading | Renders `$0` everything instead of an error |
| Student fee statement balance | 🟠 Wrong | General payments not credited; 200-row cap skews totals |


## Finance Team

### 🔴 Critical · `functionality` — Newly created finance users cannot log in — created is_active=false and blocked behind 'pending Superadmin approval'
- **Where:** `EK_SMS/backend_node/src/controllers/financeController.js:759`
- **Impact:** The entire purpose of this page (a bursar/school_admin self-provisioning finance staff) yields an account that cannot sign in. The modal hint 'The new user signs in with the finance portal role' (FinanceTeam.js:120) is false; the temp password is handed out but login returns a misleading 'pending Superadmin approval' error.
- **Fix:** Set `is_active: true` in the User.create call inside createFinanceUser (school is already approved; the individual finance login should be usable immediately). Also set must_change_password:true so the default password must be rotated.
- **Evidence:** createFinanceUser calls `User.create({ username, email, phone, password, first_name, last_name, role_id })` with NO is_active. User.js:22 defaults is_active=false. authController.js:96 blocks non-superusers: `if (!user.is_active && !isPortalSuper) return 403 'Your account is pending approval by the Superadmin.'`. By contrast every working create flow sets it explicitly — superadminDataController.js:433 and :3339 both pass `is_active: true`.
- **Effort:** S

### 🟠 High · `contract-drift` — Role and Access Level chosen in Add User are never stored — every finance user renders as 'Bursar / Full Access'
- **Where:** `EK_SMS/backend_node/src/controllers/financeController.js:769`
- **Impact:** 'Finance Officer', 'Accounts Clerk' and 'Read Only' are dead options. Every card shows Bursar + Full Access regardless of what the admin picked, so the team roster is inaccurate and access intent is lost.
- **Fix:** Same migration + model change as the is_active fix (add role, access_level columns and declare them). Then verify getFinanceUsers returns the stored values.
- **Evidence:** Modal sends role (Bursar|Finance Officer|Accounts Clerk) and accessLevel (Full|ReadOnly) — FinanceTeam.js:107-116, financeApi.js:124-133. createFinanceUser does `SchoolAdmin.create({ school_id, user_id, role, access_level, is_active })` but role/access_level/is_active are not model attributes → dropped; only user_id/school_id persist. getFinanceUsers maps `role: a.role || 'Bursar'` and `access_level: a.access_level || 'Full'` (lines 729-730) → always the fallback.
- **Effort:** M

### 🟡 Medium · `contract-drift` — phone is collected and displayed but has no column — the number typed at creation is silently lost
- **Where:** `EK_SMS/backend_node/src/controllers/financeController.js:726`
- **Impact:** The Phone field in Add Finance User is a dead input; contact numbers for finance staff are never saved and never shown. In the Liberia/SMS-fallback context (plan), a missing finance-staff phone is material.
- **Fix:** Add a phone column to users (or store on the SchoolAdmin row) and declare it on the model; then persist and return it. Otherwise remove the Phone field to stop implying it is saved.
- **Evidence:** User model has no phone attribute (User.js). getFinanceUsers's own comment (financeController.js:716-717) says 'the User model has no phone column' and excludes it from the include attributes (line 718), yet still maps `phone: a.user?.phone` (line 726) → always undefined. createFinanceUser passes `phone` to User.create (line 759-763) → dropped. FinanceTeam.js collects Phone (85-88) and conditionally renders it (245) — always absent.
- **Effort:** M

### 🟡 Medium · `functionality` — Bursars are shown Add + Suspend/Activate controls that always fail with a raw 403 role string
- **Where:** `EK_SMS/src/components/bursar/FinanceTeam.js:188`
- **Impact:** A bursar (the primary persona for this dashboard) is offered actions that can never succeed and gets a developer-facing error string. Not fake-success and it does not log them out (client.js:71 regex excludes 'Requires one of'), but it is a confusing dead end.
- **Fix:** Pass the viewer's role into FinanceTeam and hide/disable Add + Suspend/Activate for bursars (view-only), or gate GET the same way and give bursars a proper 'read-only' notice. Map raw requireRole 403s to friendly copy.
- **Evidence:** finance-team is in BURSAR_NAV_ITEMS (SuperadminDashboard.js:857) and bursars get that nav (line 1000); FinanceTeam is rendered with only a schoolId prop (line 1519) so it never learns the viewer's role. POST/PUT /finance-users/ are gated to ACCOUNT_ADMIN = superadmin/school_admin (finance.js:58-59). A bursar clicking 'Create User' or confirming Suspend hits requireRole → 403 'Access denied. Requires one of: superadmin, school_admin.' (requireRole.js:18), surfaced verbatim in the modal error (FinanceTeam.js:53) / page banner (line 173).
- **Effort:** M

## frontend↔backend contract verification

### 🔴 Critical · `contract-drift` — Bursar role is blocked from the student-picker lookup → Record Payment and Assign Fees silently break for bursars
- **Where:** `EK_SMS/backend_node/src/routes/school.js:173`
- **Impact:** A real bursar login (role 'bursar', which is in FINANCE_ACCESS so they reach every finance page) cannot load the student list. Opening 'Record Payment' from BursarHome or the Payments page (no preset student) 403s: the picker shows 'No students match' / an error banner ('Access denied. Requires one of: superadmin, school_admin, principal.') and the bursar cannot record a general payment. AssignFeesModal loads classes/terms fine but the student multi-select stays empty on 403, so a bursar cannot assign fees at all. Works only when impersonated as school_admin/principal, masking the bug.
- **Fix:** Gate GET /school/students/ with a finance-inclusive role set (e.g. FINANCE_READ = ['superadmin','school_admin','principal','bursar'], already defined in school.js:166) instead of LEADERSHIP_READ, or expose a finance-scoped students lookup under /api/finance/ that bursars may call.
- **Evidence:** financeApi.getStudents() calls GET /api/school/students/ (financeApi.js:156-158). That route is `router.get('/school/students/', applyAuth, LEADERSHIP_READ, getStudents)` and LEADERSHIP_READ = requireRole(['superadmin','school_admin','principal']) (school.js:165) — 'bursar' is not included. requireRole returns HTTP 403 for role 'bursar' (requireRole.js:17-18). The two consumers are RecordPaymentModal.js:44 (financeApi.getStudents()) and AssignFeesModal.js:65 (financeApi.getStudents({classroom_id})). Note the sibling lookups getClasses (school.js:187) and getTerms (school.js:208) use only applyAuth, so they DO work for bursars — making the failure asymmetric and silent.
- **Effort:** S

### 🟡 Medium · `contract-drift` — Role, Access Level, and Phone captured in Add Finance User are silently discarded
- **Where:** `EK_SMS/backend_node/src/controllers/financeController.js:769`
- **Impact:** Selecting 'Finance Officer'/'Accounts Clerk' or 'Read Only', or entering a phone number, is lost on save. Every finance user always renders as Bursar / Full Access with no phone (FinanceTeam.js:235-245). Access level is never enforced anywhere, so 'Read Only' is meaningless.
- **Fix:** Add role/access_level columns to SchoolAdmin (or a dedicated finance-staff table) and a phone column to User (or store phone on SchoolAdmin), map them on the models, and persist/return them. Otherwise remove the three fields from the form so the UI stops implying they are saved.
- **Evidence:** AddUserModal collects role/accessLevel/phone (FinanceTeam.js:40-48). createFinanceUser passes role and access_level to SchoolAdmin.create (financeController.js:769-775) but neither is a model attribute (SchoolAdmin.js:6-20) → dropped by Sequelize. It also passes phone to User.create (financeController.js:759-767) but the User model has no phone column (confirmed: grep 'phone' in User.js returns nothing; getFinanceUsers even carries a comment at financeController.js:716-717 that selecting user.phone 500s). getFinanceUsers then hardcodes fallbacks role='Bursar', access_level='Full', phone=a.user?.phone(undefined) (financeController.js:722-732).
- **Effort:** M

### ⚪ Low · `contract-drift` — financeApi advertises five endpoints the finance UI never calls (one is a backend stub)
- **Where:** `EK_SMS/src/api/financeApi.js:19`
- **Impact:** Dead API surface. No user-facing effect today, but a future consumer could wire UI to the empty/stubbed report-cards response and show permanently blank data.
- **Fix:** Remove the unused methods from financeApi, or wire them to real UI. If report cards are planned for finance, flag that listReportCards is currently a stub.
- **Evidence:** getOverview (financeApi.js:19), getDashboard (34), listGradeApprovals (140), reviewGradeChange (143), and listReportCards (148) are not referenced anywhere in EK_SMS/src (verified by grep of financeApi.<method> usages — only the other 19 methods are consumed). listReportCards' backend is a stub that always returns report_cards: [] (financeController.js:947-948), and reviewGradeChange's route requires ACADEMIC_WRITE ['superadmin','principal'] (finance.js:45) which a bursar can't use anyway.
- **Effort:** S

## Fee Categories page + Assign Fees modal

### 🟠 High · `contract-drift` — Bursar role cannot load students in the Assign Fees picker (403) — core flow broken for the role that owns it
- **Where:** `EK_SMS/backend_node/src/routes/school.js:173`
- **Impact:** A bursar logging in with a bursar-role token (finance users are created with role 'Bursar' via FinanceTeam) opens Assign Fees, selects a class, and the student fetch returns 403. The catch sets students=[] and an error banner, so the picker shows 'No students in this class.' and the assign flow is impossible for the exact role meant to use it. The same getStudents dependency breaks the StudentFees page for bursars too.
- **Fix:** Gate GET /api/school/students/ with the existing FINANCE_READ list (which already includes bursar) instead of LEADERSHIP_READ, or add a finance-scoped student-lookup endpoint under /api/finance/. Verify with an actual bursar token, not superadmin impersonation.
- **Evidence:** school.js:165 `const LEADERSHIP_READ = requireRole(['superadmin','school_admin','principal'])` and school.js:173 `router.get('/school/students/', applyAuth, LEADERSHIP_READ, getStudents)` — bursar is NOT in that list (a FINANCE_READ list that DOES include 'bursar' is defined at school.js:166 but is only applied to /school/finance/* endpoints). Meanwhile finance.js:67 `router.post('/fees/assign/', requireRole(FINANCE_WRITE)...)` where FINANCE_WRITE (finance.js:24) includes 'bursar'. AssignFeesModal.js:65 calls `financeApi.getStudents({ classroom_id: classId })` which hits GET /api/school/students/.
- **Effort:** S

## backend — expenses, finance-user provisioning, and leadership/academic

### 🟠 High · `functionality` — Every finance user created via createFinanceUser is dead-on-arrival — cannot log in
- **Where:** `EK_SMS/backend_node/src/controllers/financeController.js:759`
- **Impact:** A school admin provisions a bursar, gets a success toast and a new row, but the bursar can never authenticate — the account is inactive and no step ever activates it. Finance-staff provisioning is fundamentally broken.
- **Fix:** Set is_active: true in the User.create call (the creating school is already approved). Verify against the login gate after the change.
- **Evidence:** createFinanceUser does User.create({ username, email, phone, password: hashedPassword, first_name, last_name, role_id: bursarRoleId }) (lines 759-767) — it never sets is_active. User.js:22 defines is_active with defaultValue:false. authController.js:96 blocks login: `if (!user.is_active && !isPortalSuper)` → 'Your account is pending approval by the Superadmin.', and requireActiveAccount.js:36 returns 403 ACCOUNT_INACTIVE on every data request.
- **Effort:** S

### 🟡 Medium · `contract-drift` — role, access_level, and phone entered in the create form are silently discarded
- **Where:** `EK_SMS/backend_node/src/controllers/financeController.js:769`
- **Impact:** The admin picks a role/access level and enters a phone number; none of it persists. Every finance user always displays as Bursar / Full / no phone regardless of input — the fields are pure decoration and contact info is lost.
- **Fix:** Either add role/access_level/phone columns to the respective tables and models and persist them, or remove the fields from the form and payload so the UI stops implying they are saved.
- **Evidence:** createFinanceUser passes phone to User.create (line 762) but User.js defines no phone attribute → Sequelize drops it (the getFinanceUsers include even omits phone with a comment that the column doesn't exist). It passes role and access_level to SchoolAdmin.create (lines 772-773) but SchoolAdmin.js defines neither → both dropped. financeApi.js:124-133 sends full_name, phone, role, access_level from the UI form. getFinanceUsers (729-730) then returns hardcoded role:'Bursar', access_level:'Full', phone:null.
- **Effort:** M

### 🟡 Medium · `functionality` — Report-card publishing is a stub that reports success without publishing anything
- **Where:** `EK_SMS/backend_node/src/controllers/financeController.js:957`
- **Impact:** 'Publish report cards' returns a success count and fires a notification, but nothing is actually marked published or made retrievable; the report-cards list is permanently empty. Leadership believes report cards were released when they were not.
- **Fix:** Introduce a report-card / publication record (or a published flag on grades) so publish persists state and listReportCards returns real data — or clearly mark the feature as not-yet-implemented in the UI.
- **Evidence:** listReportCards (940-955) always returns report_cards:[]. publishReportCard (957-987) selects approved grades, builds a Set of student_ids, creates a single school-wide Notification, and returns published_count — but persists NO published state (there is no report-card model and no flag set on the grades). commentReportCard just appends to grade.remarks.
- **Effort:** L

### ⚪ Low · `contract-drift` — getOverview reports misleading/hardcoded dashboard metrics
- **Where:** `EK_SMS/backend_node/src/controllers/financeController.js:812`
- **Impact:** The leadership overview shows numbers that don't mean what their labels claim (and two are permanently zero), misinforming decisions.
- **Fix:** Use approval_status='pending' for pending grade changes and remove or correctly compute the report-card counters.
- **Evidence:** pending_grade_changes is computed as Grade.count({where:{grade_letter:null}}) (812-814) — grades missing a letter, not actual pending change requests (the real field is approval_status). report_cards_pending and report_cards_published are hardcoded 0 (826-827).
- **Effort:** S

## Module 4 — Finance & Administration

### 🟠 High · `functionality` — Finance Team suspend/activate is fake-success; role & access-level are never saved (SchoolAdmin model has no role/access_level/is_active columns)
- **Where:** `EK_SMS/backend_node/src/models/SchoolAdmin.js:6`
- **Impact:** The Suspend/Activate button returns 'Status updated' but nothing changes — a compromised or departing bursar CANNOT be revoked from the finance portal (and login gates on User.is_active, not this row anyway). Every finance user always renders as Bursar / Full Access / Active regardless of what was chosen at creation. The Role and Access Level selectors in Add Finance User are decorative.
- **Fix:** Add role, access_level, is_active (and created_at) to the SchoolAdmin model + a migration, OR store finance-staff role/access on a dedicated table; make suspend flip User.is_active so it actually blocks login; then re-verify the toggle end-to-end.
- **Evidence:** SchoolAdmin.define only declares user_id, school_id, must_change_password. Yet getFinanceUsers maps `is_active: a.is_active !== false` (→ undefined!==false → always true), `role: a.role || 'Bursar'`, `access_level: a.access_level || 'Full'` (financeController.js:722-731); createFinanceUser does `SchoolAdmin.create({ role, access_level, is_active:true })` (financeController.js:769-775); updateFinanceUser does `admin.update({ is_active: !admin.is_active })` where admin.is_active is undefined (financeController.js:793). Sequelize drops attributes not on the model, so all three writes are no-ops.
- **Effort:** M

### 🟡 Medium · `functionality` — 'Phone' on Add Finance User is accepted but silently discarded (User model has no phone column)
- **Where:** `EK_SMS/backend_node/src/controllers/financeController.js:762`
- **Impact:** A bursar enters a phone number, gets a success toast, but it is never stored; the Finance Team card's phone line is always blank. Silent data loss and a misleading form.
- **Fix:** Either add a phone column to User and include it, or remove the Phone field from AddUserModal and the card so the UI matches reality.
- **Evidence:** createFinanceUser calls User.create({ ..., phone, ... }) (financeController.js:762) and getFinanceUsers maps `phone: a.user?.phone` (financeController.js:727), but the User model defines no phone attribute (confirmed: no 'phone' in User.js), and getFinanceUsers' own include comment says selecting user.phone 500'd because the column doesn't exist.
- **Effort:** S

### 🟡 Medium · `contract-drift` — Bursar role can read student academic data via the finance API (grade-approvals, report-cards)
- **Where:** `EK_SMS/backend_node/src/routes/finance.js:44`
- **Impact:** Plan 1.6 says Finance Officer has NO academic-data access/modification. Writes are blocked, but a bursar token can still GET pending grade changes and student marks — a least-privilege violation exposing academic PII to finance staff.
- **Fix:** Restrict the grade-approvals/report-cards GETs to ACADEMIC roles (superadmin/principal/school_admin), or move them off the finance router; bursar nav already omits them so no UI regression.
- **Evidence:** router.use(requireRole(FINANCE_ACCESS)) where FINANCE_ACCESS includes 'bursar' (finance.js:22,41); GET /grade-approvals/ and GET /report-cards/ have no stricter gate (finance.js:44,46). listGradeApprovals returns per-student grades/marks (financeController.js:863-885).
- **Effort:** S

## Home

### 🟡 Medium · `contract-drift` — Collection rate is a single global number, not by term/class as plan 4.3 requires
- **Where:** `src/components/bursar/BursarHome.js:42`
- **Impact:** Bursars cannot spot which class or term is under-collecting from the home — the actionable dimension of the metric is lost; only an aggregate is shown.
- **Fix:** Add a per-term (and/or per-class) collection breakdown (small list or segmented bars) sourced from a grouped fees query, or de-scope the by-term/class requirement in the plan.
- **Evidence:** collectionRate = Math.round((collected / (collected + outstanding)) * 100) — one school-wide figure (BursarHome.js:42-44). Plan 4.3 specifies 'Collection rate by term/class'. getFinanceFees supports class_id/status filters (financeController.js:214-221) but the home never breaks collection down by term or class.
- **Effort:** M

### ⚪ Low · `contract-drift` — Dead financeApi methods: getOverview and getDashboard are never called anywhere in the frontend
- **Where:** `src/api/financeApi.js:19`
- **Impact:** Dead surface area that reads as available capability; future maintainers may wire it assuming it's the intended overview source, and it drifts from the actually-used getStats/getFinanceSnapshot path.
- **Fix:** Remove the unused methods from financeApi (and note the orphaned handlers), or wire getOverview as the single home stats source if that was the intent.
- **Evidence:** grep across src shows financeApi.getOverview (financeApi.js:19) and financeApi.getDashboard (financeApi.js:34) have zero call sites (the getDashboard hits found are principalApi/adminApi, different modules). Their backend handlers (getOverview, getSchoolCommandDashboard) exist but are unused by any bursar page.
- **Effort:** S

## Expenses page & expense-approval workflow

### 🟡 Medium · `contract-drift` — Summary chips ignore the active filters — 3 of 4 show all-time figures while the ledger is filtered
- **Where:** `EK_SMS/backend_node/src/controllers/financeController.js:630`
- **Impact:** getExpenses computes total (Approved Spending), pending_total, and counts (Rejected) using only { school_id: ... } with no category/date/status filter, whereas the ledger rows ARE filtered. So a bursar who filters to a single month still sees all-time Approved Spending / Pending / Rejected in three chips, only 'Shown' updates. This is silently misleading for any period/category analysis.
- **Fix:** Either compute total/pending_total/counts against the same filter set the ledger uses, or relabel those chips explicitly as 'all-time' so the numbers aren't read as filtered totals.
- **Evidence:** financeController.js 630-636: total = Expense.sum('amount', { where: { school_id, status:'approved' } }); counts computed the same way — the query's category/date/status where-clause (584-591) is not applied to these aggregates. Frontend binds them directly (Expenses.js 281-291).
- **Effort:** M

### ⚪ Low · `functionality` — Self-entry hint relies on localStorage user.id matching the User PK
- **Where:** `EK_SMS/src/components/bursar/Expenses.js:381`
- **Impact:** isOwn compares String(x.created_by) (a User PK from the backend) against currentUser()?.id from localStorage. If the stored login payload's id is not the User PK, an approver could see Approve/Reject on their own recorded expense. Impact is only cosmetic because the controller still returns 403 on self-review (financeController.js:671), but the UI affordance would be wrong.
- **Fix:** Confirm the auth payload persisted to localStorage exposes the User PK as `id`; otherwise derive isOwn from a field guaranteed to be the User PK so the 'Your entry' hint stays reliable.
- **Evidence:** Expenses.js 199 (myId = currentUser()?.id), 381 (isOwn = String(x.created_by) === String(myId)); backend created_by = req.user.id (financeController.js:558).
- **Effort:** S

## Student Fees ledger & statement page

### 🟡 Medium · `functionality` — 'Download Statement' is a print-to-window that silently does nothing when popups are blocked; no true PDF and no email/SMS delivery (plan 4.2)
- **Where:** `EK_SMS/src/components/bursar/StudentFees.js:104`
- **Impact:** On browsers/mobile that block popups (common), the user clicks 'Download' and nothing happens — no toast, no error, no fallback. The label misrepresents the action (it opens a print dialog, not a download), and Liberia's SMS-fallback / low-connectivity delivery requirement is unmet.
- **Fix:** Either relabel to 'Print / Save as PDF' and show a visible error when window.open returns null (guide the user to allow popups), or implement a real server-side PDF endpoint plus the plan-4.2 email/SMS receipt delivery.
- **Evidence:** The button labeled 'Download Statement' (StudentFees.js:142-146) calls printStatement, which does window.open('','_blank',...) then win.print(); on popup block it bails with `if (!win) return;` and no user feedback (StudentFees.js:104-109). There is no server-generated PDF, and no email/SMS path. Plan 4.2 requires PDF generation and Email/SMS delivery.
- **Effort:** M

## Reports & Analytics page

### 🟡 Medium · `functionality` — '% vs prior' trend deltas compare an in-progress period against a complete prior period
- **Where:** `EK_SMS/src/components/bursar/Reports.js:33`
- **Impact:** The KPI delta (e.g. 'Revenue 40% down vs prior', Reports.js:426-430) is systematically biased negative early in any period. A bursar reads a false downward trend. deltaInverted expenses are affected the same way.
- **Fix:** Either cap the current window to a comparable elapsed length (compare month-to-date vs same-day-of-month prior period) or clamp the prior window to the same elapsed fraction. At minimum, relabel to 'vs prior (to date)' so the comparison basis is honest.
- **Evidence:** periodRanges sets current with only date_from and NO date_to (Reports.js:38-51), so the current window always runs to 'now' with a partial final month, while previous is a complete equal-length window ending last month (date_to set, e.g. Reports.js:41,49,57-58). The code comment claims 'equal-length previous range' but on day 3 of the month, m1 compares 3 days of data against a full prior month; m3/m6/m12/ytd all include a partial current month vs full prior months.
- **Effort:** M

### ⚪ Low · `functionality` — A getStats failure blanks the entire Reports page even when the main analytics loaded
- **Where:** `EK_SMS/src/components/bursar/Reports.js:284`
- **Impact:** If /finance/stats/ 500s or times out but analytics succeeds, the whole report (chart, methods, categories, debtors) is hidden behind an error screen instead of degrading just the Collection Rate card.
- **Fix:** Use Promise.allSettled (or catch getStats independently) so a stats failure only blanks the Collection Rate KPI while the rest of the report renders.
- **Evidence:** load() uses Promise.all([getAnalytics(current), getAnalytics(previous), getStats()]) (Reports.js:284-288); any single rejection hits .catch → setError, rendering the full-page error screen (Reports.js:373-384). getStats only powers the secondary Collection Rate card.
- **Effort:** S

## shell wiring & RBAC gating

### 🟡 Medium · `functionality` — Shared fee-dashboard renders BursarHome, but its quick-actions/View-All links target BURSAR-only keys, so school_admin & superadmin land on a dead-end dashboard that silently bounces every drill-down to overview
- **Where:** `EK_SMS/src/components/bursar/BursarHome.js:19`
- **Impact:** A school_admin (and a superadmin using the school-scope picker) sees a fully rendered finance dashboard whose every navigational control is a no-op that dumps them back on the home page — looks broken, no error message, no explanation.
- **Fix:** Either (a) grant SCHOOL_ADMIN/SUPERADMIN read access to the finance detail keys they can already see summarized (student-fees, payments, expenses, finance-reports, finance-team), or (b) drop fee-dashboard from SCHOOL_ADMIN/SUPERADMIN nav+permissions and let only the bursar see the command center, or (c) conditionally hide the quick-action/View-All targets the current role can't reach.
- **Evidence:** fee-dashboard is granted to [BURSAR, SCHOOL_ADMIN, SUPERADMIN] (permissions.js:111) and renders BursarOverview -> BursarHome (SuperadminDashboard.js:1514, BursarOverview.js:9-11). But BursarHome's QUICK_ACTIONS and 'View All' buttons navigate to 'student-fees', 'payments', 'expenses', 'finance-team', 'finance-reports' (BursarHome.js:19-24,127,156,208), and each of those keys is BURSAR-only in PAGE_PERMISSIONS (permissions.js:113-121). goTo() redirects any page the role can't access back to 'overview' (SuperadminDashboard.js:656-658), so when a school_admin or superadmin opens Fee Dashboard and clicks Student Fees / All Payments / Record Expense / Reports / Finance Team, they are silently thrown back to their own overview.
- **Effort:** M

## backend — money-movement endpoints

### 🟡 Medium · `contract-drift` — payment_hash is presented as a verification token but is non-unique, timestamp-based and forgeable
- **Where:** `EK_SMS/backend_node/src/controllers/financeController.js:407`
- **Impact:** Plan 4.2 calls for QR-code receipt verification; a client trusting payment_hash as proof-of-payment is trusting a forgeable, colliding value. If intended for idempotency, duplicate submits still create duplicate payments.
- **Fix:** Decide the purpose: for idempotency, accept a client Idempotency-Key and enforce a unique constraint; for verification, generate an HMAC over the payment id with a server secret and expose that in the QR payload. Remove the current pseudo-hash from the contract.
- **Evidence:** payment_hash = `${student_id}-${fee_id||'none'}-${amount}-${Date.now()}` stripped to alnum (line 407) is stored and returned in the API response (line 449) alongside receipt_number. It is not cryptographic, has no unique constraint, and includes Date.now() so it is neither a stable idempotency key (can't dedupe retries) nor a tamper-evident verification hash (trivially reconstructable by anyone who knows the fields).
- **Effort:** M

## Finance data model & migrations

### 🟡 Medium · `contract-drift` — Payment channel is free-text with no mobile-money/gateway fields (thin for a 'cashless' system)
- **Where:** `EK_SMS/backend_node/src/models/Payment.js:10`
- **Impact:** Plan 4.1 specifies mobile money (Orange Money), bank transfer, online card, and local wallet as first-class channels in a low-connectivity, mobile-money-first market. The schema cannot distinguish providers, store an external transaction id for reconciliation, or track an online-payment lifecycle (initiated/confirmed/failed). Method-breakdown analytics group on an unconstrained string, so typos fragment the report.
- **Fix:** Add channel (enum), provider, gateway_transaction_id, gateway_status, currency to Payment, and constrain payment_method to the plan's set. Consider a payment_channel reference table per school.
- **Evidence:** payment_method is `VARCHAR DEFAULT 'cash'` free text (Payment.js line 10, migration line 46) with only a generic `reference` string. No channel/provider column (Orange Money vs MTN vs bank), no gateway_transaction_id, no gateway_status, no currency, no reconciliation/callback fields.
- **Effort:** M
