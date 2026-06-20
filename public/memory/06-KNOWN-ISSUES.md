# Known Issues to Fix During Principal/Finance Build

> **STATUS UPDATE (2026-06-13, Student dashboard "minimum fix" + light-mode removal):**
> - **Light mode removed** — app is hard-locked to dark in `context/ThemeContext.js` (`data-theme` always `"dark"`, `toggleTheme` is a no-op, stored prefs overwritten). Removed the theme toggle from the superadmin topbar and from `common/AccessibilityControls.js` (kept high-contrast + colour-blind a11y toggles). Deleted dead `components/ThemeToggle.js`. The `[data-theme="light"]` CSS blocks remain in SA.css/SchoolAdmin.css/Principal.css etc. but are now inert dead code (never matched). No `prefers-color-scheme` rules in the bundle.
> - **Student dashboard minimum fix** — a student logging in previously landed on `SAOverview` (the superadmin Command Center) and most of their sidebar rendered blank/stub. Now in `SuperadminDashboard.js`: `overview` branches `student → StudentHome` (with a `STUDENT_NAV_MAP` mapping StudentHome's internal keys grades/report-cards/timetable/assignments → my-grades/my-report-cards/my-timetable/assignment); render blocks added: `my-report-cards → StudentReportCards`, `my-fees → StudentFinancials`, `assignment → StudentAssignments`, `live-class → StudentLiveClasses` (the last two also added to `HANDLED_PAGES`); `profile` and `notifications` now branch `student → StudentProfile / StudentNotifications` (were rendering the superadmin SAProfile/SANotifications with wrong content). Added a **student mobile bottom-nav** (Home/Grades/Attendance/Timetable/Fees). In `permissions.js`, removed the redundant blank duplicates `attendance-students` (→ `[]`) and `timetable` (→ teacher-only) from the student sidebar. **Audit: all 9 student-visible nav keys now render a real page — 0 stubs, 0 blanks.** Build clean.
>   - **Still NOT done (full student integration):** the large `components/student/` library (~70 files, ~18,800 lines — `StudentHome`/`StudentProfile`/`StudentReportCards`/`StudentFinancials`/`StudentAssignments`/`StudentResources`/`StudentMessages`/`StudentEvents` + a dedicated `StudentSidebar` shell + modals) is still mostly unwired; only the pages above + Grades/Attendance/Timetable are connected. A proper student experience would give the role its own `StudentSidebar`/`StudentHome` shell in `App.js` instead of reusing the superadmin `sa-*` shell, and reconcile the third (`Student*.css`) design system. `profile` for a student still uses the generic `SAProfile` (richer `StudentProfile.js` exists, unwired).
>   - **Minor cross-role side effect:** `assignment` + `live-class` are `[TEACHER, STUDENT]`, so a teacher navigating there now sees the *student* page. Teachers have no wired dashboard yet (they'd also land on `SAOverview`), so this is no worse than before — fix when the teacher dashboard is built.


> **STATUS UPDATE (2026-06-13, Superadmin dashboard UI-completion session):** Every superadmin nav page now renders a real, mobile-responsive UI (no more bare StubPage for the listed features). Key changes:
> - **New shared/page components** (all in `src/components/superadmin/`): `SAGradesAccumulation.js` (per-school grade volume + approval pipeline, backed by upgraded `GET /api/grade-stats/` which now returns real aggregates incl. `per_school[]`), `SABatchTransfer.js` (CSV import for students & grades + bulk passport-photo upload by admission number; modes `students|grades|images`), `SAReportsHub.js` (`reports` page — dataset exports + live-report launcher), `SAStaffManager.js` (shared Principal **and** Bursar manager: sectioned add/edit form, school selector for superadmin, search + status filters, one-time credentials modal), `SASchoolScope.js` (superadmin "view as school" picker).
> - **`grade-integrity`** now renders `SAGradeIntegrity`; **`grades-accumulation`** → `SAGradesAccumulation`; **`batch-students|batch-grades|batch-image-data`** → `SABatchTransfer`; **`lesson-plan-type`** → `SARefDataManager` (new `/api/lesson-plan-types/` CRUD + `LessonPlanType` model, table `pruh_system_lessonplantype`); **`reports`** → `SAReportsHub`; **`system-audits`** → `SASecurityLogs`.
> - **School-scoped pages for superadmin**: `fee-dashboard`, `school-financial-report`, `grade-approvals`, `report-card-approval`, `report-cards-published`, `attendance-report`, `principal-users` are wrapped in `SASchoolScope` via a `scoped()` helper in `SuperadminDashboard.js`. The picker stores the chosen school in `sessionStorage['ek-sms-sa-school-id']`; **`src/api/client.js` appends `?school_id=` to `/api/{principal,finance,school}/…` requests** so the (now `schoolScope`-wrapped) `routes/finance.js` + `routes/principal.js` resolve the right tenant. Backend only honours the param for superadmin tokens.
> - **`SAPrincipal.js` / `SABursar.js`** are now thin wrappers over `SAStaffManager`. **`SAAcademicSystem.js` / `SAGradingSystem.js`** are now thin wrappers over `SARefDataManager` (gained inline edit, search, status toggle, delete-confirm). **`SAClasses.js` / `SASubjects.js`** upgraded: school **dropdown** (not raw "School ID" number box), client-side search, status column + toggle icons, School column hidden for school_admin.
> - **`SARefDataManager`** gained a client-side search bar (appears when >3 rows).
> - **More tenant scoping**: `getSuperClasses/createSuperClass`, `getSuperSubjects/createSuperSubject` now use `scopedSchoolId()` like the user CRUD (school_admin was seeing all schools' classes/subjects).
> - `permissions.js`: `fee-dashboard` + `report-cards-published` gained SUPERADMIN.
> - `HANDLED_PAGES` Set in `SuperadminDashboard.js` replaced the fragile 80-key inline StubPage-exclusion array.
> - **Virtual Meeting** (`vm-parents` / `vm-staffs` / `vm-students`) — new `SAVirtualMeeting.js` (audience prop) + `VirtualMeeting` model (table `pruh_core_virtual_meeting`) + `sla`-level CRUD at `/api/virtual-meetings/` (school-scoped via `scopedSchoolId()`). Schedule/join/complete/cancel video meetings per audience. These 3 were the *only* remaining superadmin stubs — caught by a nav-vs-permissions-vs-HANDLED_PAGES audit script (now removed).
> - **Verification**: an audit cross-checking all 44 superadmin-visible nav keys against `PAGE_PERMISSIONS` and `HANDLED_PAGES` confirms **0 stub pages remain** for superadmin.
> - Build clean (`npm run build` exit 0, no warnings). NOT committed/pushed — hold until told. Local MySQL still down so end-to-end DB testing pending; new tables (`pruh_system_lessonplantype`, `pruh_core_virtual_meeting`) auto-create via `db.sync({alter})` in dev but need a live DB to verify; `grade-stats` aggregation also needs live data.

> **STATUS UPDATE (2026-06-12, School-Admin user-creation session):** Registration→approval→school-admin flow audited and hardened:
> - **Tenant scoping added** to all shared `sla` user CRUD in `superadminDataController.js` (students/teachers/parents/bursars/principals + parent links + student documents): non-superadmin callers are pinned to `req.user.school_id` via `scopedSchoolId()` — lists filter by it, creates force it, row actions 404 on other schools' rows. Previously a school_admin saw/edited **every** school's users, and SAPrincipal/SABursar/SATeachers/SAParents created rows with `school_id: null`.
> - **`approval_status` ghost column fixed**: `pruh_core_school` has no such column; `registrationController` now derives status (`deriveApprovalStatus()`) from `is_approved`/`changes_requested`/`rejection_reason`/`is_active`. (`/api/registration/status/*` previously returned `status: undefined`.)
> - **Reject now revokes access**: `handleSchoolAction('reject')` deactivates the school's admin users (covers approve-then-reject). Rejection/changes-requested reasons now surface at **login** (403 message includes `rejection_reason`), not just email.
> - **Impersonation tokens now carry `school_id`** (+ response user object) — without it, impersonated sessions would have bypassed the new scoping.
> - **`permissions.js`**: `principal` + `bursar` pages granted to SCHOOL_ADMIN (backend `sla` routes always allowed it). School admin can now create all 5 user types: Students/Teachers/Parents (account-*), Principal, Bursar/Finance.
> - **SAStudents**: school selector/column hidden for school_admin (locked to own school; `/api/schools/` is superadmin-only and used to silently 403).
> - **Register.js** now posts to `/api/registration/register-school-admin` (full field persistence, duplicate checks, confirmation email) instead of legacy `/api/register/` which dropped motto/website/region/academic-system/etc. and did no checks.
> - NOT committed/pushed — hold until told.

These were discovered during the 2026-06-10 audit. None require immediate hotfixes (nothing is currently catastrophically broken because failures are silently swallowed), but they should be fixed **as part of** the Principal/Finance dashboard work since the new dashboards will hit these exact code paths.

> **STATUS UPDATE (2026-06-10, Principal build session):** §1, §2 and §4 are **FIXED**. §3 (no financeApi.js) and §5 (controller duplication) remain open for the Finance build.
>
> **STATUS UPDATE (2026-06-11, Finance/Bursar build session):** §3 is **FIXED** — `src/api/financeApi.js` now covers all 25 `/api/finance/*` endpoints plus the `/api/school/classes|students|terms` lookups. §4's bursar half is **FIXED** — `'overview'` now branches `principal → PrincipalHome`, `bursar → BursarHome`, else `SAOverview`. §5 (controller dedupe) remains open — untouched by design (backend worked as-is; dedupe is a refactor for a later session).
> New notes from the Finance build:
> - `PUT /api/finance/finance-users/:id/` **only toggles `is_active`** and ignores the request body — the FinanceTeam UI therefore exposes Suspend/Activate (no field-edit form). If field editing is wanted, it needs a backend change first.
> - `GET /api/finance/expenses/` returns `total` as the **all-time school total** (ignores the category/date filters); the Expenses page labels it "All-time Spending" and computes the filtered total client-side.
> - No upload route exists for expense receipts (`receipt_path` is a bare string field) — receipt upload was deliberately left out of the UI.
> - `assignFees` `discount` is an **absolute amount** (not a %), and students already holding the same category+term fee are skipped server-side (the modal surfaces the skipped count).
> - Stub-only bursar nav keys (`fees-payment`, `receipt-generator`, `fees-structure`, `school-financial-report`) were removed from BURSAR permissions; bursar now has a purpose-built sidebar (`BURSAR_NAV_ITEMS`) with zero stub pages.
> Additionally fixed during the Principal build (was not in this list):
> - **Login role-resolution bug** (`authController.js`): principal/bursar users also carry a `SchoolAdmin` link, and the old order resolved them as `school_admin`, so no principal could ever reach the Principal dashboard. `portalRoleCode === 'principal' | 'bursar'` is now checked **before** the `schoolAdminLink` fallback, and `school_id` falls back to `CorePrincipal`/`CoreBursar` when there is no SchoolAdmin link (superadmin-created principals).
> - **`report-cards-published`** rendered a *blank page* (in the no-stub allowlist with no render block) → now renders `principal/PublishedReportCards.js`.
> - **`attendance-report`** rendered a stub → new backend endpoint `GET /api/principal/attendance-report/?days=N` (per-class aggregation) + `principal/AttendanceReport.js`.
> - **`--ska-*` design tokens were dark-only** → `[data-theme="light"]` overrides added in `SchoolAdmin.css` (fixes all ska-based pages in light mode, incl. schooladmin ones).
> - `getSchoolCommandDashboard.totalGradeMods` / `getOverview.pending_grade_changes` were hardcoded 0 / wrong semantics → now real `approval_status='pending'` counts; `totalLowAttend` now computed from last-30-day attendance (<85%).

## 1. `principal.js` route file is missing 9 endpoint registrations (causes silent 404s today)

**File**: `backend_node/src/routes/principal.js`

Currently only registers: `GET/POST /overview/`, `/grade-approvals/`, `/report-cards/`, `/report-cards/comment/` (6 routes), all imported from `financeController` instead of `principalController` (works because the functions are duplicated across both controllers — inconsistent but not broken).

**Missing routes** (functions exist in `principalController.js`, exported, just not routed):
- `GET /dashboard/` → `getSchoolCommandDashboard`
- `GET /class-performance/` → `getClassPerformance`
- `GET /teacher-insights/` → `getTeacherInsights`
- `GET /finance-snapshot/` → `getFinanceSnapshot`
- `GET /activity-feed/` → `getActivityFeed`
- `GET /syllabus-progress/` → `getSyllabusProgress`
- `GET /principal-users/`, `POST /principal-users/`, `PUT /principal-users/:id/`

**Impact today**: `src/components/schooladmin/Principal/PrincipalPage.jsx` (lines 56-60) calls `ApiClient.get('/api/principal/dashboard/')`, `/api/principal/class-performance/`, `/api/principal/teacher-insights/`, `/api/principal/finance-snapshot/`, `/api/principal/activity-feed/` — **all of these currently 404** because `principal.js` doesn't register `/dashboard/`, `/class-performance/`, etc. Each call is wrapped in `.catch(() => {})`, so the page silently shows empty/default state instead of erroring.

**Fix**: Add the 9 missing routes to `principal.js`, importing from `principalController` (the canonical home for these functions — `principalController.js` exports all 15 incl. the 6 already-routed ones). This single fix will make the existing `PrincipalPage.jsx` preview work AND give the new `PrincipalHome.js` dashboard real data sources.

## 2. `adminApi.principalApi` has 3 request-shape mismatches vs backend

**File**: `src/api/adminApi.js`, `principalApi` object (~line 47)

| Frontend method | Frontend sends | Backend (`reviewGradeChange`/`publishReportCard`/`commentReportCard`) expects |
|---|---|---|
| `reviewGradeChange({ modId, action, comment })` | `mod_id` | `grade_ids[]` |
| `publishReportCard({ cardId, principalComment })` | `card_id` (+ `principal_comment`) | only `student_ids[]`, `term_id` — `card_id` is ignored |
| `commentReportCard({ cardId, principalComment })` | `card_id` | `grade_id` |

**Fix**: when extending `principalApi` for the new dashboard (per [04-PRINCIPAL-DASHBOARD-PLAN.md](04-PRINCIPAL-DASHBOARD-PLAN.md)), correct these signatures to match the backend's actual `grade_ids[]` / `student_ids[]` / `grade_id` params. Update any existing callers accordingly (currently none of these 3 functions appear to be called anywhere, since `GradeApprovals.js`/`ReportCardApproval.js` are stubs — low risk to fix now).

## 3. No `financeApi.js` module exists

`src/api/` has `adminApi.js`, `parentApi.js`, `studentApi.js`, `teacherApi.js`, `client.js` — **no finance module**. All 25 `/api/finance/*` endpoints are currently uncallable from the frontend. Create `src/api/financeApi.js` per [05-FINANCE-DASHBOARD-PLAN.md](05-FINANCE-DASHBOARD-PLAN.md).

## 4. `'overview'` activePage doesn't branch by role (pre-existing, but Principal/Finance must not repeat it)

`SuperadminDashboard.js` line 765: `{activePage === 'overview' && <SAOverview .../>}` — same component for every role, including teacher/student/parent (whose own `*Home.js` shells exist but are dead code — not in scope to fix here).

**For this build**: when wiring `PrincipalHome.js` / `BursarHome.js`, branch the `'overview'` block by `user?.role` (see [01-ARCHITECTURE.md](01-ARCHITECTURE.md) §5 step 3) so principal/bursar logins land on their new dashboards instead of `SAOverview`.

## 5. Duplicated controller logic between `principalController.js` and `financeController.js`

Both files export near-identical implementations of `getOverview`, `listGradeApprovals`, `reviewGradeChange`, `listReportCards`, `publishReportCard`, `commentReportCard`, `getSchoolCommandDashboard`, `getClassPerformance`, `getTeacherInsights`, `getFinanceSnapshot`, `getActivityFeed`, `getSyllabusProgress`. Not urgent, but if you touch one while fixing #1, consider whether to dedupe into a shared module — only do this if it doesn't expand scope of the current task.
