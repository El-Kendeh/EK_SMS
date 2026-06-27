# School Admin dashboard — full UI + backend + functional audit

**Date:** 2026-06-25
**Scope:** every page the `school_admin` role can reach in the live shell (`SuperadminDashboard.js`), the components each renders, the API calls they make, and the backend routes/controllers behind them.
**Method:** 16 parallel slice-auditors traced each page end-to-end (React handler → API call → route → controller → model). Every finding was then re-checked by an independent adversarial verifier that tried to refute it against current code. The prior `schoolAdminUIFix/` audit (2026-06-23) was treated as leads only and re-verified — several of its top items are now fixed (see below).

## Coverage and confidence

- **38 findings adversarially verified** (independent agent reproduced the cited code). Almost all were confirmed; only 1 placeholder was refuted.
- **~16 findings auditor-reported but not double-checked** — their verifiers were cut off by an account session limit mid-run. They carry detailed code evidence and are marked **[unverified]** below. The two most serious of these (ai-capture upload, finance/principal role gates) were then **self-verified by hand** and are marked **[confirmed by hand]**.
- **Recovered from transcript prose:** the `shell/overview/profile` and `backend-school-core` auditors did full analysis but failed to emit structured output; their findings were recovered from their working notes and are marked **[prose]**.
- **Audited inline after the run:** `academics-extra` (grading-scheme, academic-calendar, promotions, teacher-assignments) — these are functional (details below).
- **Residual gap (not deeply audited):** the *frontends* of `report-cards-published` (PublishedReportCards.js), `syllabus-progress` (SyllabusProgress.js), and `fee-dashboard` (BursarOverview.js). They are reachable and read-only; their backends sit on the ungated `/api/principal/*` and `/api/finance/*` routers already flagged Critical below.

---

## What the prior audit flagged that is now FIXED (don't re-fix)

Re-verified against current code:

- **`TODO_JWT_TOKEN` superuser backdoor — GONE.** No such token path exists in `backend_node/src/middleware/auth.js` anymore. [prose, re-verified]
- **`/api/school/*` privilege escalation — CLOSED.** `school.js` now runs `applyAuth = [authenticateToken, requireActiveAccount, schoolScope, schoolWriteGuard]`; `schoolWriteGuard` enforces `requireRole(['school_admin','superadmin'])` on every POST/PUT/PATCH/DELETE. [prose]
- **`saveGrades` grade-integrity bypass — FIXED.** It is now tenant-guarded and audit-chained. [prose]
- **`createSuperStudent` cross-tenant PII leak on bare lists — CLOSED.** `getSuperStudents` returns empty for an unscoped superadmin; `school_admin` is pinned to its own school. [verified]
- **`SAParents` "wrong password shown" — FIXED.** The credentials modal now shows the real password. [verified]
- **Finance-Users "View" crash — FIXED.** The details modal now guards undefined fields. [verified]
- **AI-capture committed Gemini key — RESOLVED.** Both `aiCaptureController.js` and `syllabusGenerator.js` read `GEMINI_API_KEY` from `process.env` only, with a clean 503 when unset. [verified]
- **Promotions main action "404" — FIXED.** `POST /school/students/:id/promote/` exists (`school.js:171`); the page works end-to-end. [verified inline]

The good news: the core people-management surface (students, teachers, parents, principal, bursar, classes, subjects, virtual meetings) is **functional and correctly tenant-isolated** on the live `SA*` pages. The remaining problems cluster in finance, exam-officers, the AI-capture wiring, the role gates on the `finance`/`principal` routers, and a long tail of UX/dead-UI issues.

---

## CRITICAL

### C1. AI Document Capture upload always reports failure despite a working backend
- **Page:** ai-capture · **Component:** `src/api/adminApi.js` + `src/components/schooladmin/AIDocumentCapture.js` · **[confirmed by hand]**
- `adminApi.aiCaptureUpload()` (`adminApi.js:19-23`) returns `apiClient.request(...)`, which resolves to the **raw fetch `Response`** (`src/api/client.js:154` `return response;`) — it never calls `.json()` (only `get()`/`post()` do, `client.js:182`). The component reads `r.success` / `r.structured` / `r.capture_id` (`AIDocumentCapture.js:39-45`); on a `Response` these are all `undefined`, so the `else` branch always runs and shows **"AI extraction failed."** even on a 200 with extracted rows. The preview table never renders.
- **Impact:** the school admin uploads a roster/grade file, Gemini succeeds and the row is saved (history shows status `done`), but the screen says it failed. The core feature is unusable. `adminApi.bulkImport` (`adminApi.js:34`) has the identical bug.
- **Fix:** in `aiCaptureUpload`, `const res = await apiClient.request(...); return res.json();` (and same for `bulkImport`), or add a `postForm` helper that returns parsed JSON.

### C2. `/api/finance/*` mutations have no role gate — any logged-in tenant user can move money and publish report cards
- **Backend:** `backend_node/src/routes/finance.js` · **[confirmed by hand]**
- `finance.js:23-26` applies only `authenticateToken` + `schoolScope`. `requireRole` is imported but used on **expenses only** (`finance.js:55,57`). Ungated routes include: `POST /payments/` (recordPayment), `POST /fees/assign/` (assignFees), `POST /fee-categories/`, `POST /finance-users/` + `PUT /finance-users/:id/`, and critically `POST /grade-approvals/` (reviewGradeChange) and `POST /report-cards/` (publishReportCard) at lines 30/32. `getSchoolFromUser` resolves a school for any token carrying `school_id`.
- **Impact:** a teacher, parent, or student of the school can call these directly (devtools/curl with their own token) to record arbitrary payments, assign fees, mint a bursar login, **approve/reject grade-change requests**, and **publish report cards**. The most sensitive academic and financial actions are unprotected against any authenticated school member.
- **Fix:** `router.use(authenticateToken, schoolScope, requireActiveAccount); router.use(requireRole(['superadmin','school_admin','principal','bursar']));` then keep the stricter per-route gates (expense approve, account-creation POSTs narrowed to `['superadmin','school_admin']`).

### C3. `/api/principal/*` router has no role gate — same exposure for the principal endpoints
- **Backend:** `backend_node/src/routes/principal.js` · **[verified]** (read-side) / **[unverified]** (the POST-mutation framing)
- `principal.js:15-18` applies only `authenticateToken` + `schoolScope`, no `requireRole`, no `requireActiveAccount`. It exposes `POST /report-cards/`, `POST /grade-approvals/`, `POST /principal-users/`, plus all the read analytics (overview, class-performance, teacher-insights, attendance-report, syllabus-progress).
- **Impact:** any authenticated school member can read principal-level analytics and, via the POST routes, publish report cards, approve/reject grade changes (writing grade-audit events as if they were the principal), and create a new principal login.
- **Fix:** `router.use(authenticateToken, schoolScope, requireActiveAccount, requireRole(['superadmin','school_admin','principal']));` mirroring the `sla` pattern in `superadmin.js`.

---

## HIGH

### H1. Exam Officers page is permanently empty — wrong response key
- **Page:** exam-officers · `SAExtraPages.js` (ExamOfficersPage) + `schoolController.js` getExamOfficers · **[verified]**
- Frontend reads `d.teachers` (`SAExtraPages.js:1116`); backend returns `successResponse({ exam_officers: officers })` — no `teachers` key. `setTeachers` always gets `[]`. Page shows "No teachers found" forever; the role the page exists to assign can never be assigned. (Report-card generation depends on exam officers existing.)
- **Fix:** rename the response key to `teachers`, return all teachers (see H2), join the User model (see M-exam-officers-name), and delete the duplicate `getExamOfficers` definition (`schoolController.js:2028` and `2165`).

### H2. Exam Officers query only returns existing officers — no teacher can ever be promoted
- **Page:** exam-officers · `schoolController.js` getExamOfficers · **[verified]**
- `Teacher.findAll({ where: { school_id, is_examination_officer: true } })`. The UI's "Assign Role" list is built from non-officers, which is therefore always empty. Even after fixing H1 the assignment path is a dead end.
- **Fix:** drop the `is_examination_officer` filter; return all teachers (the UI splits them itself).

### H3. Newly created parent disappears from the list (primary create flow looks broken)
- **Page:** account-parents · `SAParents.js` · **[verified]**
- The Add-Parent form has no student-link field and never sends `student_ids`. `getSuperParents` only returns parents linked to the school's students. A freshly created, unlinked parent is excluded from the refetch, so it vanishes — and the only link action is a per-row button that needs the (missing) row. The account is orphaned and unmanageable; re-adding makes duplicates.
- **Fix:** add a student multi-select to the create form and pass `student_ids` (the controller already accepts them), or auto-open the Link modal after create.

### H4. Student create/update/delete and password resets write no audit log
- **Page:** account-students · `superadminDataController.js` · **[verified]**
- `appendSecurityAuditLog` is used in ~17 other handlers but not in `createSuperStudent`/`updateSuperStudent` (which resets the login password)/`deleteSuperStudent` (hard-deletes Student + User)/toggle/block. Deleting a minor's record or resetting credentials leaves no trace.
- **Fix:** call `appendSecurityAuditLog` in those handlers with actor, action, student id, school_id.

### H5. Auto-created parents get the shared default `Parent@123`, shown as if it were a real secret
- **Page:** account-students · `SAStudents.js` + `superadminDataController.js:3091` · **[verified]**
- The form has no parent-password field; `registerParent` defaults `p.password || 'Parent@123'` and returns it, and the credentials panel renders it as the parent's password. Blank-password students get `Student@123` likewise. Every parent across the platform shares a guessable password presented as a unique secret.
- **Fix:** generate a random password server-side when none is supplied (students and parents) and/or force first-login rotation.

### H6. The rich teacher module is fully built but never rendered (dead UI)
- **Page:** account-teachers · `NewPages.js` (TeachersPage) + `schooladmin/Teachers/**` · **[verified]**
- `TeachersPage` (server-side search, teacher stats, overload view, profile panels, bulk CSV import, onboarding wizard) and its ~20 `.jsx` dependencies are imported but `TeachersPage` itself is never mounted — `account-teachers` renders the simpler `SATeachers`. The `/api/school/teachers/` + `/teacher-stats/` endpoints have no live caller.
- **Fix:** pick one teacher page — route `account-teachers` to `TeachersPage` (verify its endpoints' gating first), or delete the dead module to stop shipping ~20 unused files.

### H7. Teacher search/filter only matches the current 20-row page
- **Page:** account-teachers · `SATeachers.js:140` · **[verified]**
- `load()` sends only `page`+`limit`; the search/status filter runs client-side over the loaded 20 rows. With >20 teachers, searching for someone on a later page returns a false "No results" — risking duplicate registrations. The backend `getSuperTeachers` already supports server-side `q` and `status`.
- **Fix:** send `q`/`status` to the server and reset to page 1 on change. (Same bug in `SAStaffManager.js` → principal/bursar — see M-list.)

### H8. Finance Users dashboards are fabricated / permanently zero
- **Page:** finance-users · `FinanceUsers/*` + `financeController.getFinanceUsers` · **[verified]**
- `getFinanceUsers` returns only `{id, full_name, email, phone, username, is_active, role, access_level, created_at}`. `summariseUsers` derives txToday/volume/receipts/refunds/risk from fields that never exist, so StatsCards ("Transactions Today", "Total Volume Today"), ActivityPanel, TransactionHeat are all 0, and every user is labeled "Low Risk" by default. A financial control surface shows fabricated data as fact.
- **Fix:** remove the tx/volume/risk panels until the backend computes them from real Payment/Receipt rows, or join those tables and return per-user figures.

### H9. Add-Finance-User form silently discards permissions/scope/limit/working-hours (and the name)
- **Page:** finance-users · `AddFinanceUserForm.jsx` + `financeController.createFinanceUser` · **[verified]**
- The form POSTs `permissions`, `scope`, `transaction_limit`, `working_hours`; `createFinanceUser` reads only `full_name/email/phone/username/password/role/access_level` and persists `role/access_level` only. The advertised access control does nothing. The form also sends `first_name`/`last_name` but the controller expects `full_name`, so the created user's name is blank and the list shows only the username.
- **Fix:** persist the access fields (new columns/related table) or strip them from the form; reconcile the name contract.

### H10. Scheduled virtual meetings are never delivered to the audience
- **Page:** vm-parents/staffs/students · `SAVirtualMeeting.js` · **[unverified]**
- No parent/teacher/student portal reads `VirtualMeeting` rows anywhere (grep confirms only 3 admin-side files reference it). The admin schedules a meeting with a join link, sees "Meeting scheduled", but the audience never sees it or the link. The page subtitle also promises "reminders" that are never generated (see M-vm-reminders).
- **Fix:** add read endpoints + UI on each consumer portal listing meetings for their audience with the Join link.

### H11. `pruh_core_virtual_meeting` has no production migration
- **Page:** vm-* · `models/VirtualMeeting.js` · **[unverified]**
- The table relies on `db.sync({alter})`, which is off in production, and no `.sql` migration ships. In prod the first VM call hits a non-existent table and 500s; the whole feature is dead until ops runs a manual `CREATE TABLE`.
- **Fix:** add and run a committed SQL migration (same as TimetableSlot etc.); add it to the pending-prod-migrations list.

### H12. "Resend Credentials" button calls an endpoint that does not exist
- **Page:** account-teachers / finance-users (NewPages teacher card) · `adminApi.js:11` → `POST /api/school/users/resend-credentials/` · **[prose, self-noted]**
- That route does not exist in `school.js` (the only `resend` route is auth OTP). The live `ResendCredentialsButton` (used at `NewPages.js:2887`) always 404s. The button has error handling so it won't crash, but the feature never works.
- **Fix:** implement the endpoint, or remove the button until it exists.

### H13. School-admin "Preferences" write to a single global settings row
- **Page:** profile · `getAdminSettings`/`patchAdminSettings` (loadSettings → `id:1`) · **[prose]**
- Settings load/save always use one global `SuperadminSettings` row (`id:1`). When a school_admin saves phone/bio/language/timezone/avatar, it overwrites the same row the superadmin and every other school_admin share — a cross-tenant data-integrity/leak issue.
- **Fix:** scope admin settings per user (or per school), not a single global row.

### H14. School-admin overview renders the superadmin "Command Center" and is broken
- **Page:** overview · `SAOverview` via `SuperadminDashboard.js` · **[prose]**
- `overview` renders `SAOverview` (platform operator dashboard: Total Schools / Pending Review / Active Schools) verbatim for school_admin. `fetchMySchool` calls `GET /api/schools/{id}/`, which **has no route** → 404 → `schools=[]`, so every stat is 0. `SAOverview` also calls `/api/security-counters/` and `/api/security-logs/`, which are `requireRole(['superadmin'])` → 403, swallowed → fabricated "0 threats" placeholders. The admin lands on an irrelevant, all-zero dashboard.
- **Fix:** give school_admin a role-appropriate overview (own-school KPIs), or at minimum stop calling the superadmin-only endpoints and fix the missing `/api/schools/:id/` route.

### H15. Suspended/rejected school_admin keeps full finance + principal access
- **Backend:** `finance.js`, `principal.js` · **[confirmed by hand for finance.js]**
- Neither router includes `requireActiveAccount` (unlike the shared `sla` chain). A school_admin whose school was suspended still holds a valid JWT and can record payments, approve grades, publish report cards, and manage staff until the token expires.
- **Fix:** add `requireActiveAccount` to both routers.

### H16. `assignFees` / `recordPayment` trust client-supplied IDs (cross-tenant write risk)
- **Backend:** `financeController.js` assignFees:309 / recordPayment:377 · **[unverified]**
- `FeeCategory.findByPk(fee_category_id)` and `Fee.findByPk(fee_id)` run with no `school_id` filter; `student_id` is taken from the body unchecked. Combined with C2 (no role gate), a caller can pass another school's category/fee id and corrupt cross-tenant fee/payment rows.
- **Fix:** scope every client id to the resolved school (`findOne({ where: { id, school_id: school.id } })`) and validate `student_id` belongs to the school.

### H17. `live-classes` create/update/delete are ungated
- **Backend:** `routes/live-classes.js:11-16` · **[unverified]**
- Only `authenticateToken`; no `requireRole`. A parent/student token can `POST /api/live-classes/` (recorded as the teacher) or delete existing ones.
- **Fix:** add `requireRole(['superadmin','school_admin','principal','teacher'])` and validate `class_id`/`subject_id` belong to the caller's school.

---

## MEDIUM

- **M1. Fetch helpers swallow backend error messages** — account-students · `SAStudents.js:24-54` throw `HTTP <status>` without reading the JSON body, so real reasons ("No school is linked to your account") show as "HTTP 403". [verified]
- **M2. Student table is unlabeled on mobile** — `SAStudents.js` rows lack the `data-label` attributes the `@media(max-width:600px)` card layout needs, so phone users see right-aligned values with blank labels. [verified]
- **M3. Teachers share `Teacher@123` with no forced rotation** — `must_change_password` never set on create. [verified] (same pattern: principal `Principal@123`, bursar.)
- **M4. List search misses records beyond page 1 in `SAStaffManager`** — principal/bursar/finance share the client-side-only filter bug (H7's sibling). [verified]
- **M5. Finance-users list endpoint not role-gated** — `GET /api/school/finance-users/` runs for any authenticated tenant user (`schoolWriteGuard` ignores GET), exposing finance-staff name/email/phone. Same gap applies to all `/api/school/*` GETs. [verified]
- **M6. "Edit Role" on every finance user is a dead "coming soon" banner** — `FinanceUsersPage.handleEdit` only sets a banner; `updateFinanceUser` ignores the body and only flips `is_active`. No way to change a finance user's role after creation. [verified]
- **M7. Activity + Risk finance filters are dead** — rendered by `FiltersBar` but the page never passes their props; clicking calls an undefined handler (throws). [verified]
- **M8. TransactionHeat renders blank icons/labels + undefined React keys** — `heatSummary` output doesn't carry the `key`/`icon`/`sub` fields the component reads. [verified]
- **M9. Two disjoint finance-staff managers** — `bursar` (CoreBursar table) and `finance-users` (SchoolAdmin table) both create bursar logins but never reflect each other; an admin can create/block the same person twice with no cross-reference. [verified]
- **M10. Class Subtype dropdown is permanently empty for school_admin** — `GET /api/class-subtypes/` is superadmin-only; the 403 is swallowed, leaving an empty dropdown with no error. [verified]
- **M11. Exam "Type" dropdown is a dead control** — `createExam` drops `exam_type`; no DB column; every exam shows a blank Type badge. [verified]
- **M12. Exam Officers would crash if populated** — `getExamOfficers` returns Teacher rows with no User join; the UI's `t.name.charAt(0)` would throw. Latent behind H1. [verified, downgraded high→medium]
- **M13. Timetable "Clear" wipes the whole school with no confirmation** when "All Classes" is selected — the only destructive action in the slice without a `window.confirm`. [verified]
- **M14. AI-capture multer rejects return non-JSON** — oversized/bad-type uploads bubble to Express's default HTML handler (no error middleware), surfacing as an opaque "HTTP 500"; no client-side size guard. [unverified]
- **M15. VM "reminders" advertised but never sent** — subtitle promises reminders; `createVirtualMeeting` creates no Notification/email/job. [unverified]
- **M16. Finance quick-actions bypass the permission model** — `BursarHome` quick actions navigate a school_admin to bursar-only page keys via `goTo()`, which never checks `canAccess`. Pages load (token-scoped) but the permission matrix is silently bypassed. [unverified]
- **M17. Security panel + "Super Admin" labels shown to school_admin** — `SAProfile`/`SANotifications` are the superadmin components; `/api/security-*` 403s are swallowed and the profile shows hardcoded "Super Admin"/"Super Administrator". [prose]

---

## LOW

- **L1.** Orphan stub keys render "under development" if reached via search/deep-link: `students`, `teachers`, `parents`, `examination`, `report-card-generator`, `fees-structure`, `school-financial-report`. Not in the sidebar, so rarely hit; alias them to the real page or drop the permission. [verified for students/teachers/parents; confirmed by routing for the rest]
- **L2.** account-students has no Resend-Credentials action (the only password path is the Edit drawer, which doesn't show the new password). [verified]
- **L3.** Admission number is free-text with no auto-suggest and no uniqueness check, though `GET /school/students/next-admission-number/` exists. [verified]
- **L4.** `createSuperTeacher` has no duplicate `employee_id` guard (no unique index). [verified]
- **L5.** Link-to-student picker loads only the first 100 students, no search/pagination/truncation notice. [verified]
- **L6.** Parent credentials default password is a duplicated literal coupled to the backend default (latent footgun if either changes). [verified]
- **L7.** Entire `schooladmin/Principal/**` tree is dead code (keep `Principal.css` — shared styles). [verified]
- **L8.** `must_change_password` is updatable in the principal API but has no form field; new principals keep `Principal@123`. [verified]
- **L9.** Finance "System Integrity" panel hardcodes SHA-256 / immutable-records / audit-trail claims with no backend basis. [verified]
- **L10.** Assigning a teacher to a subject with no class links is a silent no-op that still reports success. [verified]
- **L11.** Class form exposes raw "Academic Year ID" / "Form Number" and ambiguous free-text fields with no guidance. [verified]
- **L12.** Room "Notes" field is accepted but never saved (no DB column). [verified]
- **L13.** "Generate Timetable" always rebuilds all classes regardless of the selected View Class. [verified]
- **L14.** Exam-results grade letters use hardcoded cutoffs, ignoring the school's grading scheme (display only). [verified]
- **L15.** AIDocumentCapture has no component-specific responsive CSS (relies on shared classes + overflow scroll). [unverified]
- **L16.** VM can be saved with no link and no date (client-only validates title); produces a dead card. [unverified]
- **L17.** Fee categories can be created but never edited or deleted (no PUT/DELETE route or UI), yet show an Active/Inactive badge implying a toggle. [unverified]
- **L18.** `createStudent` doesn't validate that client-supplied `classroom_id`/`academic_year_id` belong to the school (row itself is correctly scoped). [prose]
- **L19.** `reviewModificationRequest` flips status but never applies the requested grade value or emits a GradeEvent (partial no-op); the list endpoint `GET /api/school/modification-requests/` doesn't exist, but the consuming page isn't wired into the school_admin shell. [prose]

---

## Systemic themes

1. **Uneven route gating.** `/api/school/*` and `/api/*` (superadmin router) are correctly gated; `/api/finance/*`, `/api/principal/*`, and `/api/live-classes/*` are not. The gating exists and is even imported in those files — it just wasn't applied to most routes. This is the single highest-value fix area.
2. **GET endpoints aren't role-gated** even where writes are — `schoolWriteGuard` only gates mutating methods, so any tenant member can read staff/finance/attendance listings.
3. **Shared default passwords with no forced rotation** — `Student@123` / `Parent@123` / `Teacher@123` / `Principal@123`, several shown to the admin as if uniquely generated.
4. **Fabricated / dead UI presented as real** — finance dashboards, risk pills, integrity badges, dead filter chips, "Edit Role (coming soon)", dropdowns whose values are never persisted (exam type, room notes).
5. **Client-side-only search over one page** — repeated across `SATeachers`, `SAStaffManager` (principal/bursar) despite backend support.
6. **Missing production migrations** — VirtualMeeting (and the documented TimetableSlot/academic-year pattern).
7. **Client-trusted IDs on a few writes** — `assignFees`, `recordPayment`, `createStudent` FKs.

---

## Prioritized fix plan

**Tier 1 — security, small diffs, high impact**
1. Gate `finance.js` and `principal.js` with `requireActiveAccount` + `requireRole(...)` (C2, C3, H15). Two routers, a few lines each.
2. Scope `assignFees`/`recordPayment`/`createStudent` client IDs to the school (H16, L18).
3. Gate `live-classes.js` writes (H17).
4. Add a read role gate (or per-route `requireRole`) for sensitive `/api/school/*` GET listings (M5).

**Tier 2 — broken features users can see**
5. Fix the AI-capture upload parsing (C1) — one-line `.json()`.
6. Fix Exam Officers (H1, H2, M12) — response key + return all teachers + User join.
7. Fix the parent create flow (H3) — add student-link to the form.
8. Send search/status to the server in `SATeachers` + `SAStaffManager` (H7, M4).
9. Implement or remove the "Resend Credentials" endpoint (H12); implement or hide "Edit Role" (M6).

**Tier 3 — data integrity, trust, migrations**
10. Add audit logging to student CRUD/password resets (H4).
11. Stop the shared-default-password pattern; force first-login rotation (H5, M3, L8).
12. Replace fabricated finance dashboards with real data or remove them (H8, H9, M7, M8, L9).
13. Ship the VirtualMeeting prod migration and an audience-delivery path (H10, H11, M15).
14. Per-user/per-school admin settings instead of the global row (H13).
15. Give school_admin a real overview instead of the superadmin Command Center (H14, M17).

**Tier 4 — UX polish / dead code**
16. The L-tier items: confirmations, dropdown persistence, dead-code removal, orphan-stub aliasing, mobile labels.

---

## Refuted / not an issue

- The only refuted item was a placeholder finding (`id: "x"`) emitted by an auditor as a schema test — no real content. Disregard.

## Note on completeness

This run was cut short by an account session limit during the verify/synthesis phase. The unverified items above carry full code evidence and the two most serious were hand-checked; the residual frontend gap (PublishedReportCards, SyllabusProgress, BursarOverview) and a full re-verify of the `[unverified]` finance/VM/ai-capture items are worth a short follow-up pass once the limit resets.
