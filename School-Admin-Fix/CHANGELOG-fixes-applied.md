# School Admin audit — fixes applied

**Date:** 2026-06-25. Working tree only (not committed/pushed). All changes verified by syntax check, runtime module load, and JSX parse. No browser click-through yet.

Maps to findings in [2026-06-25-school-admin-full-audit.md](2026-06-25-school-admin-full-audit.md).

## Tier 1 — route authorization + tenant scoping

| Finding | File | Change |
|---|---|---|
| C2 | `backend_node/src/routes/finance.js` | Added `requireActiveAccount` + baseline `requireRole(FINANCE_ACCESS)`; per-route gates: `ACADEMIC_WRITE`(superadmin/principal) on grade-approvals + report-cards, `ACCOUNT_ADMIN`(superadmin/school_admin) on finance-user create/update, `FINANCE_WRITE`(superadmin/school_admin/bursar) on payments/fees/categories. |
| C3 | `backend_node/src/routes/principal.js` | Added `requireActiveAccount` + baseline `requireRole(['superadmin','school_admin','principal'])`; `PRINCIPAL_WRITE`(superadmin/principal) on grade-approvals, report-cards, principal-users. |
| H17 | `backend_node/src/routes/live-classes.js` | `requireRole(['superadmin','school_admin','principal','teacher'])` on POST/PATCH/DELETE; GET left open (students view their classes). |
| H15 | finance.js + principal.js | `requireActiveAccount` now blocks suspended/rejected tokens on both routers. |
| H16 | `backend_node/src/controllers/financeController.js` | `assignFees` scopes category/term/student_ids to `school.id`; `recordPayment` validates the student belongs to the school and scopes the fee lookup. **Also fixed pre-existing transaction leaks** — all early returns in both functions now `rollback()` first. |
| L18 | `backend_node/src/controllers/schoolController.js` | `createStudent` validates `classroom_id`/`academic_year_id` belong to the school (rolls back on mismatch). |

## Tier 2 — broken features

| Finding | File | Change |
|---|---|---|
| C1 | `src/api/adminApi.js` | `aiCaptureUpload` + `bulkImport` now `await res.json()` instead of returning the raw `Response`, so a successful extraction renders instead of showing "AI extraction failed." |
| H1/H2/M12 | `backend_node/src/controllers/schoolController.js` | `getExamOfficers` (both duplicate defs) returns **all** teachers, joined to `User` for name/email, under the `teachers` key the UI reads. Page populates; role can be assigned; no crash. |
| H3 | `src/components/superadmin/SAParents.js` | After create, the new parent is queued into the Link-to-student modal (opens once credentials are dismissed) so they get linked and no longer vanish from the list. |
| H7/M4 | `src/components/superadmin/SATeachers.js`, `SAStaffManager.js` | Search is debounced and sent to the server (`?q=`, resetting to page 1) so a record on a later page is found. SAStaffManager keeps its client filter as a refinement (no regression on the bursar endpoint). |

## Tier 3 — data integrity / trust (safe slice)

| Finding | File | Change |
|---|---|---|
| H4 | `backend_node/src/controllers/superadminDataController.js` | `appendSecurityAuditLog` on student create/update/delete/toggle/block (best-effort, guarded so a logging failure can't break the op). Severity: delete=high, block/pw-reset=medium, create/toggle=low. |
| H12 | `schoolController.js` (`resendCredentials`), `routes/school.js`, `utils/email.js` | New `POST /api/school/users/resend-credentials/` — tenant-scoped (target user must belong to the caller's school via role record or linked student), resets to a random temp password, best-effort email via `sendPasswordResetEmail` (now returns a real success boolean), audit-logged, returns `{ success, email_sent, username, password }`. |
| H11 | `backend_node/migrations/2026-06-25-virtual-meeting.sql` | `CREATE TABLE IF NOT EXISTS pruh_core_virtual_meeting` so prod stops 500-ing on vm-* (sync is off in prod). Registered in the pending-migrations tracker. |
| H5 (partial) | `superadminDataController.js` (`createSuperTeacher`) | `must_change_password` defaults to `true` when the admin leaves the password blank (the shared `Teacher@123` default), forcing rotation on first login (teacher login enforces this flag). |

## Tier 3 (continued)

| Finding | File | Change |
|---|---|---|
| H5 broad | `superadminDataController.js` | Added `genTempPassword()` (random crypto-based). All create paths now use it instead of the shared `Student@123`/`Parent@123`/`Teacher@123`/`Principal@123`/`Bursar@123` constants when the admin leaves the password blank. `createSuperParent` now also returns the generated password so SAParents shows the real one (it previously fell back to a constant → would have locked parents out). Every credentials modal displays the API-returned `d.password`, verified. |
| H8/H9 + M7 | `FinanceUsers/FinanceUsersPage.jsx`, `FiltersBar.jsx`, `FinanceUserCard.jsx`, `FinanceUserDetails.jsx` | Removed the fabricated dashboards (StatsCards tx/volume, ActivityPanel, TransactionHeat, AlertsPanel, IntegrityPanel) — all derived from fields the backend never returns. Removed the always-"Low Risk" pill from the card + details modal, and the dead Activity/Risk filter chips (which threw on click). Kept the real list, create, search, role/status filters, view, and suspend/activate. |

## Found during sanity-testing (live backend, minted JWTs)

- **getStudents eager-loading 500** — `schoolController.getStudents` (`GET /api/school/students/`) included `User` without the required `as: 'user'` alias → `SequelizeEagerLoadingError` on every call, breaking the **promotions page** student list. Pre-existing (not introduced this session); fixed by adding `as: 'user'` + reading `s.user`. Verified 200 against the running server.
- Verified live: teacher JWT → 403 on `POST /api/finance/payments|finance-users` and `POST /api/principal/report-cards`; superadmin JWT → 200 on finance overview + attendance report; `GET /api/school/exam-officers` returns the `teachers` key.

## H13 — already resolved (no code change needed)

The H13 finding (school_admin writes to a single global `SuperadminSettings` row) came from the prose-recovered audit slice, which **misread the route gating**. In current code `/api/admin-settings/` (GET + PATCH) is on the superadmin-only `sa` router (`requireRole(['superadmin'])`, superadmin.js:108/118), with a comment noting it was deliberately moved there to stop impersonating school_admins from reading/writing the global row. **Verified live:** a non-superadmin token gets 403 on GET and PATCH `/api/admin-settings/`; superadmin gets 200. So there is no cross-tenant leak. The only residual is cosmetic — a school_admin's profile *preferences* (phone/bio/language/timezone/avatar) silently 403 instead of persisting; making them per-user would require a schema migration for cosmetic fields, deferred as low value.

## Tier 3 (continued — built features)

| Finding | File | Change |
|---|---|---|
| H14 | `src/components/schooladmin/SchoolAdminHome.js` (new) + `SuperadminDashboard.js` | Replaced the superadmin "Command Center" that rendered for school_admin (platform onboarding stats, `/api/schools/:id/` 404, `/api/security-*` 403 — all zero/broken) with a real own-school overview: KPI cards (students/teachers/classes/subjects from `student-stats`/`teacher-stats`/`classes`/`subjects`, verified live) + quick-action links. Added a `school_admin` branch in the overview render. Responsive via the `ska-*` grid. |
| H10 | `backend_node/src/controllers/virtualMeetingController.js` (new), `routes/{parent,student,teacher}.js`, `src/components/shared/UpcomingMeetings.js` (new), `StudentHome.js` / `TeacherHome.js` / `ParentHome.js` | Virtual meetings are no longer an admin-only data island. New `getMyMeetings` resolves the caller's school per role and returns scheduled meetings for their audience (`students`/`staffs`/`parents`); wired as `GET /api/{student,teacher,parent}/virtual-meetings/` (verified live, all 200). A reusable `UpcomingMeetings` card (self-hides when empty) is mounted in each portal home, showing upcoming meetings with a Join link. |

## Tier 4 — UX polish

| Finding | File | Change |
|---|---|---|
| M13 | `schooladmin/NewPages.js` (TimetablePage) | `handleClear` now `window.confirm`s before deleting, with distinct copy for a single class vs the whole school (was a one-click irreversible wipe of every class's timetable). |
| L4 | `superadminDataController.js` (createSuperTeacher) | Rejects a duplicate `employee_id` within the same school (409) before creating anything — there is no DB unique index. |
| L10 | `superadminDataController.js` (assignSubjectTeacher) + `superadmin/SASubjects.js` | Backend returns the affected-row count; the modal now shows "Teacher assigned to N class(es)" or "No classes are linked to this subject yet — assign classes first" instead of a blanket success toast on a silent no-op. |
| M2 | `superadmin/SAStudents.js` | Added `data-label` to each table cell (Name/Admission No/Status/School/Added) so the mobile (`@media max-width:600px`) card layout shows column labels instead of unlabeled values. |
| H10 (lite) | `student/StudentHome.js` | Mounted `UpcomingMeetings` in the low-data `StudentHomeLite` path too, so students in low-data mode also see scheduled meetings. |

Frontend verified with a clean CRA production build ("Compiled successfully", no warnings) and backend with syntax + runtime load.

## Security check (follow-up)

| Item | File | Change |
|---|---|---|
| grade-alerts | `superadmin/SuperadminDashboard.js` | `/api/grade-alerts/` is already superadmin-only on the backend (school_admin → 403, no cross-school leak — the audit-note worry doesn't hold). Stopped the shell from fetching it for non-superadmin (was a swallowed 403). |
| `/api/school/*` read gate | `backend_node/src/routes/school.js` | `schoolWriteGuard` only gated writes, so any authenticated tenant user could GET the school's PII/staff/finance listings. Added `LEADERSHIP_READ` (superadmin/school_admin/principal) on students/teachers/teacher-assignments/exam-officers/principal-users/finance-users/grades/analytics/messages/ai-capture-list, and `FINANCE_READ` (+bursar) on finance stats/fees/expenses. Reference/theming reads (info/terms/classes/academic-years/grading-scheme/stats) stay cross-role as intended. Verified live: leadership → 200, teacher → 403, reference reads → 200. |
| finance/principal-users 500 (bonus) | `financeController.js`, `principalController.js` | `getFinanceUsers`/`getPrincipalUsers` selected `user.phone` (no such column) and ordered by `SchoolAdmin.created_at` (`timestamps:false`, no such column) → every call 500'd, breaking both pages. Removed `phone` from the User include and ordered by `id`. Verified live: both → 200. |

## Still open

- ⚠️ **Same `user.phone` 500 in the parent portal** — `parentController.js:69` (parent profile) and `:1147` (co-guardians) select the non-existent `user.phone` and will 500 identically. Out of this pass's school-admin scope — flagged for a parent-portal fix.
- **H13** — resolved above (security already fixed; only cosmetic preference-persistence remains, deferred).
- The Tier-4 / remaining medium-low UX items in the main report (orphan stub aliasing, mobile data-labels, dropdown persistence, dead-code removal, etc.).
- UI refinement worth noting: `UpcomingMeetings` is mounted at the top of each portal home and in StudentHome's main (non-low-data) path; the low-data StudentHomeLite path is not yet wired.
