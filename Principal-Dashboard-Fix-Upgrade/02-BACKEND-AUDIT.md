# Principal Dashboard — Backend Audit

Scope: `backend_node/src/controllers/principalController.js` (706 lines, 15 handlers), `routes/principal.js`,
`models/Principal.js`, `models/CorePrincipal.js`, `models/SchoolAdmin.js`, `models/Grade.js`, the 4 middleware
(`auth`, `schoolScope`, `requireRole`, `requireActiveAccount`), and the login/token path in `authController.js` +
`utils/jwt.js`. Cross-checked against the frontend client `src/api/adminApi.js` (`principalApi`).

Method: read the actual source. Every finding cites a file + line/handler. Severity is honest.

---

## Executive summary

The router wiring is solid: `authenticateToken → schoolScope → requireActiveAccount → requireRole(PRINCIPAL_ACCESS)`,
with a stricter `requireRole(PRINCIPAL_WRITE)` on every mutating route. **Multi-tenant scoping is correct** — every
handler resolves the school via `getSchoolFromUser(req)` (`req.schoolId || req.user.school_id`) and filters all
queries by `school_id`. I found **no cross-tenant leak and no IDOR**: `reviewGradeChange`, `publishReportCard`,
`commentReportCard`, and `updatePrincipalUser` all constrain by `school_id`, so a forged foreign id matches nothing.
All Sequelize include aliases used (`student`, `user`, `subject`, `term`, `classroom`, `students`, `grades`) exist in
`associations.js`, so there is no include-driven `ReferenceError`/500.

The problems are elsewhere and they are serious:

1. **Principal user-creation is dead on arrival (CRITICAL).** `createPrincipalUser` creates the `User` without
   `is_active`, which defaults to `false`. The login gate blocks inactive non-superusers, and `requireActiveAccount`
   blocks them on every API call. A principal minted from the console can never log in.
2. **Principal-user management is largely fake (HIGH).** The `SchoolAdmin` model has no `role`, `access_level`, or
   `is_active` columns, yet `getPrincipalUsers`/`create`/`update` read and write those fields. Sequelize silently
   drops the unknown attributes: reads return hardcoded placeholders (`'Principal'`, `'Full'`, always-active), and the
   activate/deactivate/role/access writes no-op.
3. **Finance oversight is fabricated (HIGH).** `getFinanceSnapshot` returns all zeros; `getSchoolCommandDashboard`
   hardcodes `finance:'Stable'` and `totalFinAnom:0` and a synthetic `healthScore`. `getTeacherInsights` hardcodes
   `overloaded:0`/`underperforming:0`. `getOverview` hardcodes both report-card counts to `0`.
4. **Unbounded table scans** in `getSchoolCommandDashboard` (loads every grade + every attendance row, twice) and an
   **N+1 loop** in `getSyllabusProgress`. No pagination anywhere; list endpoints silently truncate at 200/500 rows.

Note also a model-layer inconsistency: the console stores "principals" as `SchoolAdmin` rows, but `CorePrincipal`
(`pruh_core_principal`, rich profile) and `Principal` (`pruh_system_principal`) are never written by the console —
`Principal.js` is entirely dead.

Client contract: **every `principalApi` method maps to a real route and every route has a client method** — no
dangling calls in either direction.

---

## Route + middleware wiring (correct)

`routes/principal.js`:
- `router.use(authenticateToken)` → `schoolScope` → `requireActiveAccount` → `requireRole(PRINCIPAL_ACCESS)` where
  `PRINCIPAL_ACCESS = ['superadmin','school_admin','principal']`.
- Writes add `requireRole(PRINCIPAL_WRITE)` = `['superadmin','principal']`: `POST /grade-approvals/`,
  `POST /report-cards/`, `POST /report-cards/comment/`, `POST/PUT /principal-users/`. School_admin is read-only on
  the console — sensible.
- `schoolScope` (`middleware/schoolScope.js`) scopes non-superadmins to their JWT `school_id` and lets a superadmin
  target a school via `?school_id=`. A principal's JWT carries `school_id` (set at login, `authController.js:132`,
  and `role:'principal'` at `:138`), so the console resolves correctly for a real principal — **provided the account
  is active** (see BE-01).
- `requireActiveAccount` fails **open** on a DB error (documented) and never gates superadmins. Fine.

No issues in the middleware themselves.

---

## Per-handler findings

### BE-01 — CRITICAL — `createPrincipalUser` mints a login-disabled account
- **Location:** `controllers/principalController.js:359-394` (`createPrincipalUser`), interacting with
  `models/User.js:22` (`is_active` defaultValue `false`) and `authController.js:96` + `middleware/requireActiveAccount.js:36`.
- **Current state:** broken-or-stub. `User.create({...})` at `:371` omits `is_active`, so the row is created with
  `is_active=false`. At login, `if (!user.is_active && !isPortalSuper)` (`authController.js:96`) returns 403 "pending
  approval". Even with a token, `requireActiveAccount` returns 403 `ACCOUNT_INACTIVE`. The created principal can
  never authenticate.
- **Evidence:** `User` model default `is_active:false`; handler sets `username, email, phone, password, first_name,
  last_name, role_id` only. No activation path exists in the console (BE-02 shows the "activate" toggle is a no-op).
- **Recommendation:** set `is_active: true` on `User.create` for principals minted by an already-privileged
  principal/superadmin (school is already approved). Optionally set `must_change_password: true` and force a reset.

### BE-02 — HIGH — Principal-user role/access/status fields are phantom (silent no-ops + placeholder reads)
- **Location:** `getPrincipalUsers` `:329-357`, `createPrincipalUser` `:381-387`, `updatePrincipalUser` `:396-440`;
  `models/SchoolAdmin.js` (defines only `user_id`, `school_id`, `must_change_password` — **no** `role`,
  `access_level`, `is_active`, `created_at`).
- **Current state:** broken-or-stub. Sequelize ignores attributes not declared on the model, so:
  - `SchoolAdmin.create({ role, access_level, is_active })` (`:381`) persists none of those three.
  - `updatePrincipalUser` empty-payload path `admin.update({ is_active: !admin.is_active })` (`:411`) — `admin.is_active`
    is `undefined`, `!undefined === true`, and the write is dropped anyway. The "activate/deactivate" and role/access
    updates (`:416-419`) are no-ops.
  - `getPrincipalUsers` returns `role: a.role || 'Principal'` → always `'Principal'`; `access_level || 'Full'` →
    always `'Full'`; `is_active: a.is_active !== false` → `undefined !== false` → always `true`; `created_at` →
    `undefined`. All four columns are fabricated placeholders.
- **Recommendation:** either add real `role`, `access_level`, `is_active`, `created_at` columns to
  `pruh_core_schooladmin` (migration) and the model, or store principal status on `User.is_active` /
  `CorePrincipal.status`. Until then the "member management" grid is cosmetic.

### BE-03 — HIGH — `getFinanceSnapshot` is a hardcoded stub
- **Location:** `:616-631`.
- **Current state:** broken-or-stub. Returns `{ revenue:0, outstanding:0, paymentsToday:0, transactions:[] }`
  unconditionally. It runs no query. `Fee`/`Payment` models exist and are associated (`associations.js:134,179,180`),
  so real data is available but ignored.
- **Recommendation:** compute revenue/outstanding/today's payments from `Payment`/`Fee` scoped by `school_id`, or
  remove the endpoint and its "Finance snapshot" card until wired.

### BE-04 — HIGH — `getSchoolCommandDashboard` mixes fabricated numbers with unbounded scans
- **Location:** `:497-557`.
- **Current state:** partial. Real: `totalStudents/Teachers/Classes`, `avgAcademic`, `avgAttendance`,
  `totalGradeMods`, `totalAtRisk`, `totalLowAttend`. **Fabricated:** `finance:'Stable'` (`:515`, hardcoded string),
  `totalFinAnom:0` (`:522`, hardcoded), and `healthScore = avgAcademic*0.45 + avgAttendance*0.40 + 15` (`:516`) — a
  synthetic composite with a magic `+15` floor, presented as a real "school health" metric.
- **Performance:** `Grade.findAll({ where:{ school_id } })` (`:506`, no limit/attributes) loads the entire grade table
  into memory; `Attendance.findAll({ where:{ school_id } })` (`:511`) loads every attendance row, then `:526` loads
  the last-30-days slice **again**. This is the endpoint hit on every Principal Home mount. For a real school this is
  a multi-thousand-row full scan (twice for attendance) on the hot path.
- **Recommendation:** replace in-memory reductions with SQL aggregates (`AVG(total)`, `COUNT(*) FILTER`), drop the
  duplicate attendance query, and stop shipping `finance`/`finAnomaly`/`healthScore` until backed by real signals (or
  label them clearly as heuristics).

### BE-05 — MEDIUM — `getTeacherInsights` returns fake teacher-evaluation analytics
- **Location:** `:594-614`.
- **Current state:** partial. `overloaded:0` and `underperforming:0` are hardcoded (`:605-606`). Only `totalTeachers`
  and `pendingGrades` (count of grades with `grade_letter IS NULL`) are real — and "pending grades" is a loose proxy,
  not a teacher-load or performance signal.
- **Recommendation:** derive overload from class/subject assignment counts and underperformance from class averages,
  or remove those two fields so the UI doesn't imply analytics that don't exist.

### BE-06 — MEDIUM — `getOverview` hardcodes report-card counts to 0
- **Location:** `:45-46` — `reportCardsPending = 0; reportCardsPublished = 0;`.
- **Current state:** partial. Students/teachers/classrooms/pending-grade-changes/active-term are real; the two
  report-card metrics are fake even though `Grade.is_published` exists and `listReportCards` already computes real
  approved/published state.
- **Recommendation:** count published vs approved-unpublished students for the active term (reuse `listReportCards`
  logic), or drop the two cards.

### BE-07 — MEDIUM — `reviewGradeChange` discards the rejection reason + generic notification text
- **Location:** `:128-182`.
- **Current state:** partial. `comment` is destructured (`:133`) but never persisted — a principal's rejection reason
  is not written to the grade, the audit event (`appendGradeEvent`, `:154`), or a notification, so it is lost. The
  approve notification uses `g.Subject?.name` (`:167`) but the grades were fetched without includes (`:138`) and the
  correct alias is lowercase `subject`, so the message is always "Grade for subject has been approved."
- **Positive:** the approve/reject + audit-event write is wrapped in `sequelize.transaction` (`:146`) — atomic,
  good. Grades are filtered by `school_id` + `approval_status:'pending'`, so no IDOR and no double-approval.
- **Recommendation:** persist `comment` into the audit event (and optionally the grade remarks) on reject; fetch the
  subject (or interpolate a real name) for the notification.

### BE-08 — MEDIUM — No pagination; list endpoints silently truncate
- **Location:** `listGradeApprovals` `:78-88` (`limit: 200`), `listReportCards` `:199-207` (`limit: 500`).
- **Current state:** partial. Hard caps with no `offset`/page metadata. A school with more than 200 pending/rejected
  grade rows, or more than 500 grade rows in the active term, gets silently truncated data with no indication. The
  count summaries (`:114-116`) are correct, so the UI totals won't match the rows shown.
- **Recommendation:** add `page`/`limit` params + return total; or aggregate report cards server-side per student
  rather than pulling 500 raw grade rows.

### BE-09 — MEDIUM — `getPrincipalUsers` conflates all school admins with principals
- **Location:** `:334-338`.
- **Current state:** partial. Queries **all** `SchoolAdmin` rows for the school with no role filter, then labels every
  one `'Principal'` (BE-02). The list therefore includes the actual school_admin account(s). Worse, since
  `updatePrincipalUser` operates on any `SchoolAdmin.id` in the school, a principal could rename/"deactivate" the
  school admin from the principal console (the writes no-op today per BE-02, but the intent and target selection are
  wrong).
- **Recommendation:** once a real principal identity exists, filter by role (`User.role_id = principal` or a
  `SchoolAdmin.role` column) so the console only manages principals.

### BE-10 — MEDIUM — `createPrincipalUser`: no duplicate guard, weak default password, no forced reset
- **Location:** `:359-394`.
- **Current state:** partial. No pre-check for an existing `username`/`email`; `User.email` and `username` are unique
  (`models/User.js:13,19`), so a duplicate throws and is caught into a generic 500 "Failed to create principal" with
  no actionable message. Password defaults to `'Principal@123'` (`:367`) when omitted, and `must_change_password` is
  never set on the created `User`/`SchoolAdmin`, so a default-credential principal is never forced to rotate. No
  password strength validation.
- **Privilege-escalation check (positive):** `role_id` is hardcoded to the resolved `principal` role
  (`requireRoleId('principal')`, `:368-378`) — an attacker cannot pass a `role`/`role_id` to escalate to superadmin.
  School is server-derived (`school.id`), not client-supplied, so no cross-tenant creation. The only client-controlled
  privilege fields (`role`, `access_level`) are the phantom columns from BE-02 and are dropped.
- **Recommendation:** pre-check uniqueness and return 409 with a clear message; require a supplied password (or force
  `must_change_password`); validate strength.

### BE-11 — LOW — `phone` is a phantom field end to end
- **Location:** `getPrincipalUsers:345` (`a.user?.phone`), `createPrincipalUser:371` (`phone` in create),
  `updatePrincipalUser:430`; `models/User.js` has **no** `phone` column (comment at controller `:336` confirms).
- **Current state:** partial. Phone is accepted, echoed as `undefined`, and never persisted.
- **Recommendation:** add a `phone` column, or store it on `CorePrincipal.phone_number`, or drop the field from the
  payload and UI.

### BE-12 — LOW — Dead/inconsistent principal data model
- **Location:** `models/Principal.js` (`pruh_system_principal`) — imported nowhere in the console; `models/CorePrincipal.js`
  (`pruh_core_principal`) — read only as a login `school_id` fallback (`authController.js:141`), never written by the
  console.
- **Current state:** broken-or-stub. The console persists principals as `SchoolAdmin` rows, so none of CorePrincipal's
  rich fields (`employee_id`, `phone_number`, `qualification`, `hire_date`, `status`, etc.) are ever populated for a
  console-created principal. `Principal.js` is entirely unused.
- **Recommendation:** pick one identity model. If principals are truly `SchoolAdmin` rows, delete `Principal.js` and
  stop reading `CorePrincipal` at login for them; if they should be `CorePrincipal`, write that row on create.

### BE-13 — MEDIUM — `getSyllabusProgress` N+1 query loop
- **Location:** `:662-693`.
- **Current state:** partial (works, slow). One `Subject.findAll` then a `SyllabusTopic.findAll` **inside a per-subject
  loop** (`:672-673`). A school with N subjects issues N+1 queries.
- **Recommendation:** fetch all topics for the school in one query and aggregate in memory, or `GROUP BY subject_id`
  in SQL.

### BE-14 — LOW — `getClassPerformance` top/low overlap for small schools
- **Location:** `:582-587`.
- **Current state:** partial. `top: slice(0,3)` and `low: slice(-3).reverse()` overlap when a school has fewer than 6
  classes with grades — the same class appears in both "top" and "low".
- **Recommendation:** guard so `low` excludes classes already in `top`, or only show both when count ≥ 6.

### BE-15 — LOW — Misleading 401 for superadmin without `?school_id`
- **Location:** `getSchoolFromUser:19-28` returning `null` → all handlers respond `401 'Not authenticated'`.
- **Current state:** works (but wrong status). A superadmin hitting `/api/principal/*` without `?school_id` is
  authenticated but unscoped; returning 401 implies an auth failure. Should be 400 "school_id required".
- **Recommendation:** distinguish "no school resolved" (400) from "no token" (401).

### BE-16 — LOW — `publishReportCard` notifies even on zero-publish; unscoped term lookup
- **Location:** `:256-302`.
- **Current state:** works. A "Report Cards Published" notification is created even when `publishedStudents.size === 0`
  (`:288` runs unconditionally inside the txn). `Term.findByPk(term_id)` (`:264`) is not school-scoped, so a foreign
  term's name could be echoed into the notification text (no data leak beyond the name; the grade write itself is
  school+term scoped so nothing foreign is published).
- **Recommendation:** only emit the notification when something was published; scope the term lookup by `school_id`.

---

## Endpoints vs UI (contract cross-check)

Verified `src/api/adminApi.js` `principalApi` (lines 51-110) against `routes/principal.js`:

| Route | Client method | Status |
|---|---|---|
| `GET /overview/` | `overview()` | mapped (possibly redundant with `dashboard/`) |
| `GET /dashboard/` | `getDashboard()` | mapped |
| `GET /class-performance/` | `getClassPerformance()` | mapped |
| `GET /teacher-insights/` | `getTeacherInsights()` | mapped |
| `GET /finance-snapshot/` | `getFinanceSnapshot()` | mapped (stub, BE-03) |
| `GET /activity-feed/` | `getActivityFeed()` | mapped |
| `GET /syllabus-progress/` | `getSyllabusProgress()` | mapped |
| `GET /attendance-report/` | `getAttendanceReport(days)` | mapped |
| `GET/POST /grade-approvals/` | `listGradeApprovals`/`reviewGradeChange` | mapped |
| `GET/POST /report-cards/` | `listReportCards`/`publishReportCards` | mapped |
| `POST /report-cards/comment/` | `commentReportCard` | mapped |
| `GET/POST /principal-users/`, `PUT /principal-users/:id/` | `getPrincipalUsers`/`create`/`update` | mapped |

**No dangling client calls and no orphan routes.** `overview/` and `dashboard/` overlap heavily (both return school
totals); `overview/` may be unused by `usePrincipalDashboard` — a frontend-dimension concern, flagged here for
awareness only.

---

## Missing leadership backends (enhancement — no route today)

### BE-17 — ENHANCEMENT — No predictive / at-risk analytics endpoint
At-risk is only a crude `grades with total < 40` count inside the dashboard (`:521`). There is no dedicated
predictive-analytics or early-warning endpoint (attendance + grade trend + behaviour). Leadership dashboards in the
plan imply this; it does not exist on the backend.

### BE-18 — ENHANCEMENT — No exam oversight, teacher-evaluation, budget-approval, or principal-authored broadcast backend
The Principal console has no routes for exam oversight (the `Exam` model exists), formal teacher evaluation, budget
approval / expense sign-off (the bursar's expense-approval flow does not surface to the principal console), or
principal-initiated announcements/broadcasts (the console only *reads* `Notification`; it never authors one on
demand). These are leadership-relevant modules absent from `/api/principal/*`.

---

## Security posture (summary)

- **Tenant isolation:** correct across all 15 handlers. No cross-tenant leak, no IDOR (writes filter by `school_id`).
- **Role gating:** correct; writes require `principal`/`superadmin`.
- **Privilege escalation:** `createPrincipalUser` hardcodes the principal role_id and server-derives the school — safe.
- **Weak spots:** default password `Principal@123` with no forced reset (BE-10); created principals inactive and
  unusable (BE-01); phantom status columns mean "deactivate a member" silently fails (BE-02).
- `getActivityFeed` correctly dropped the platform-wide `SecurityAuditLog` (no `school_id`) and uses only tenant-scoped
  `Notification` — a prior cross-tenant leak that is now closed (`:638-645`).
