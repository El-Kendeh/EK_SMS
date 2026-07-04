# Principal Dashboard — End-to-End Functionality & FE↔BE Contract-Drift Audit

Dimension: trace every principal feature button-click → `principalApi` (`src/api/adminApi.js`) → route
(`backend_node/src/routes/principal.js`) → controller handler (`backend_node/src/controllers/principalController.js`)
→ returned shape → component consumption. Flag orphan calls, orphan routes, shape mismatches, fake-success,
data-loss, no-op actions, and the write flows (grade approval, report-card publish/comment).

All findings cite concrete files/lines. Method: read-only source trace, no speculation.

---

## 1. Contract map (every principalApi method)

| # | UI trigger | `principalApi` method | HTTP → route | Controller handler | Route exists? | Persists? | End-to-end status |
|---|-----------|----------------------|--------------|--------------------|---------------|-----------|-------------------|
| 1 | Home mount | `overview()` | GET `/overview/` | `getOverview` | ✅ | read | **works** (2 dead fields) |
| 2 | Home mount | `getDashboard()` | GET `/dashboard/` | `getSchoolCommandDashboard` | ✅ | read | **partial** (finance faked) |
| 3 | Home mount | `getClassPerformance()` | GET `/class-performance/` | `getClassPerformance` | ✅ | read | **works** |
| 4 | Home mount | `getTeacherInsights()` | GET `/teacher-insights/` | `getTeacherInsights` | ✅ | read | **partial** (2 hardcoded 0) |
| 5 | Home mount | `getFinanceSnapshot()` | GET `/finance-snapshot/` | `getFinanceSnapshot` | ✅ | read | **fake/stub** (all zeros) |
| 6 | Home mount | `getActivityFeed()` | GET `/activity-feed/` | `getActivityFeed` | ✅ | read | **partial** (thin, raw date) |
| 7 | Home + Syllabus page | `getSyllabusProgress()` | GET `/syllabus-progress/` | `getSyllabusProgress` | ✅ | read | **works** (N+1) |
| 8 | Attendance page | `getAttendanceReport(days)` | GET `/attendance-report/` | `getAttendanceReport` | ✅ | read | **works** |
| 9 | Grade Approvals list | `listGradeApprovals(params)` | GET `/grade-approvals/` | `listGradeApprovals` | ✅ | read | **works** |
| 10 | Grade Approvals bulk approve/reject | `reviewGradeChange({gradeIds,action,comment})` | POST `/grade-approvals/` | `reviewGradeChange` | ✅ | status+event+notif | **partial** (`comment` dropped) |
| 11 | Report Cards list / Published list | `listReportCards()` | GET `/report-cards/` | `listReportCards` | ✅ | read | **partial** (`published` misused) |
| 12 | Publish All / Publish Selected | `publishReportCards({studentIds,termId})` | POST `/report-cards/` | `publishReportCard` | ✅ | is_published+event+notif | **partial** (no UI reflect) |
| 13 | Comment modal (both screens) | `commentReportCard({gradeId,comment})` | POST `/report-cards/comment/` | `commentReportCard` | ✅ | appends remarks | **works** |
| 14 | Leadership Team list | `getPrincipalUsers()` | GET `/principal-users/` | `getPrincipalUsers` | ✅ | read | **broken** (fake fields) |
| 15 | Add Member | `createPrincipalUser(payload)` | POST `/principal-users/` | `createPrincipalUser` | ✅ | partial | **broken** (data-loss, locked-out) |
| 16 | Edit / Suspend / Activate | `updatePrincipalUser(id,payload)` | PUT `/principal-users/:id/` | `updatePrincipalUser` | ✅ | partial | **broken** (toggle no-op) |

**Orphan API methods (call with no route):** none. Every `principalApi` method maps to a mounted route.
**Orphan routes (route with no UI caller):** none. All 16 handlers are consumed.
**So the drift is not missing wiring — it is shape/semantic drift and stub/fake backends inside otherwise-wired flows.**

---

## 2. Findings

### FC-01 — Suspend/Activate a leadership member is a silent no-op that reports success (fake success)
- **Severity:** high
- **Category:** Fake-success / data-integrity (RBAC user management)
- **Location:** `backend_node/src/controllers/principalController.js:409-413` (`updatePrincipalUser` legacy toggle);
  `backend_node/src/models/SchoolAdmin.js:6-20`; UI `src/components/principal/PrincipalUsers.js:134-149` (`toggleActive`).
- **Current state:** broken-or-stub. `toggleActive` sends an empty `{}` PUT. The handler runs
  `admin.update({ is_active: !admin.is_active })`. But the `SchoolAdmin` Sequelize model **defines only
  `user_id`, `school_id`, `must_change_password`** — there is no `is_active` attribute. `admin.is_active` is
  therefore `undefined`, `!undefined === true`, and Sequelize silently omits the unknown column from the UPDATE,
  so nothing is written. The handler still returns `{success:true,'Status updated'}`, and the UI optimistically
  flips the badge and shows a green "Status updated" toast.
- **Evidence:** On the next `load()` the member re-renders as **Active** again (see FC-04 — the read side also
  can't see `is_active`), so the optimistic flip is lost. A principal literally cannot suspend a leadership account
  from this screen even though the UI claims it worked.
- **Recommendation:** Suspension must toggle the gate that actually controls access — `User.is_active` (checked by
  `middleware/requireActiveAccount.js` and login). Update the handler to flip `User.is_active` for `admin.user_id`
  (and add a real `is_active` column to the `SchoolAdmin` model/table if leadership-level status is also wanted),
  then return the true new state so the UI reflects reality.

### FC-02 — Newly created leadership member cannot log in (created with `is_active=false`, no activation path)
- **Severity:** high
- **Category:** Broken write flow / onboarding
- **Location:** `backend_node/src/controllers/principalController.js:371-388` (`createPrincipalUser`);
  `backend_node/src/models/User.js:22` (`is_active` default `false`); `backend_node/src/middleware/requireActiveAccount.js:36-42`.
- **Current state:** broken-or-stub. `User.create({...})` never sets `is_active`, and the model default is
  `false`. Both login (blocks inactive non-superusers) and `requireActiveAccount` (403 `ACCOUNT_INACTIVE`) will
  reject that account. The principal console has **no** way to set `User.is_active=true` (the only toggle is FC-01,
  which targets the wrong, non-existent column). So every "Leadership member added" account is dead-on-arrival
  until a superadmin flips `User.is_active` out-of-band.
- **Evidence:** `SchoolAdmin.create({... is_active:true})` at line 386 also can't help — `is_active` isn't a
  `SchoolAdmin` attribute (FC-03), so even that is dropped.
- **Recommendation:** Set `is_active: true` on `User.create` for principal-minted accounts (schools are already
  approved by the time a principal exists), or wire a real activation action. Also surface the temp password /
  send-credentials so the account is actually usable.

### FC-03 — `role` and `access_level` from the Add/Edit form are silently discarded (data-loss)
- **Severity:** high
- **Category:** Data-loss / form fields ignored by backend
- **Location:** `backend_node/src/controllers/principalController.js:381-387` (create) and `396-419` (update);
  model `backend_node/src/models/SchoolAdmin.js:6-20`; UI form `src/components/principal/PrincipalUsers.js:99-117, 216-229`.
- **Current state:** broken-or-stub. The form collects **Role** (`PU_ROLE_KEYS`) and **Access Level**
  (`PU_ACCESS_LEVELS`) and posts them. The controller passes them to `SchoolAdmin.create/update`, but `role` and
  `access_level` are **not attributes on the `SchoolAdmin` model**, so Sequelize drops them from the INSERT/UPDATE.
  Nothing persists. `is_active` on create is dropped for the same reason.
- **Evidence:** Combined with FC-04, the list always renders `Principal · Full Access` regardless of what was
  chosen; editing a member's role/access is a no-op that reports success.
- **Recommendation:** Add `role`, `access_level`, `is_active` columns to the `SchoolAdmin` model (and DB table via
  a migration) if these are meant to live there, or store leadership metadata on the correct table
  (`pruh_core_principal` / `CorePrincipal` already has `status`, `is_active`). Until the columns exist, the whole
  add/edit form is cosmetic.

### FC-04 — Leadership list shows fabricated `Active / Principal / Full` for every row; filters are inert; conflates school-admins with principals
- **Severity:** medium
- **Category:** Shape mismatch (UI reads fields the backend can't populate)
- **Location:** `backend_node/src/controllers/principalController.js:334-352` (`getPrincipalUsers`);
  UI `src/components/principal/PrincipalUsers.js:57-62, 274-307`.
- **Current state:** broken-or-stub. The map reads `a.is_active`, `a.role`, `a.access_level`, `a.created_at` off a
  `SchoolAdmin` row — none of which are model attributes — so they are all `undefined`. The fallbacks then force
  `is_active: undefined !== false → true` (always Active), `role: 'Principal'`, `access_level: 'Full'`,
  `created_at: undefined`. The UI's status chips (`active` / `suspended`) and role dropdown therefore filter on
  constants that never vary. Separately, the query returns **all `SchoolAdmin` rows** for the school, so ordinary
  school-admin accounts are listed as "leadership team" alongside principal-minted ones.
- **Recommendation:** Return real `is_active` (from `User.is_active`), real role/access once columns exist (FC-03),
  and scope the query to actual leadership records (join on the principal role or `CorePrincipal`) rather than
  every `SchoolAdmin`.

### FC-05 — Financial oversight is fabricated: finance-snapshot returns all zeros and dashboard finance is hardcoded "Stable"
- **Severity:** high
- **Category:** Stub backend presented as real data (finance/budget oversight)
- **Location:** `backend_node/src/controllers/principalController.js:616-631` (`getFinanceSnapshot` returns
  `revenue:0, outstanding:0, paymentsToday:0, transactions:[]`) and `:515, :540-552` (`finance='Stable'`,
  `totalFinAnom:0` hardcoded in `getSchoolCommandDashboard`); UI `components/schooladmin/Principal/FinancePanel.jsx`
  and `StatsCards.jsx:51-59`.
- **Current state:** fake/stub. FinancePanel renders "Financial Snapshot / This term" with `$0`, `$0`, `0`, and a
  collection rate of `0/(0+1)=0%` — all fabricated, not queried from `Fee`/`Payment`/`Expense` (which exist and are
  used by the bursar console). StatsCards unconditionally shows "Financial Status: Stable — Collections on track",
  and the home alert for financial anomalies can never fire (`totalFinAnom` is a literal `0`).
- **Evidence:** No import of `Fee`/`Payment`/`Expense` in `principalController.js` (see the require block, lines
  1-14). This misleads leadership: a school drowning in arrears shows "Stable / $0 outstanding".
- **Recommendation:** Query real revenue (sum of `Payment`), outstanding (sum of `Fee` minus payments), payments
  today, and recent transactions, scoped by `school_id` and active term. Derive `finance` status and anomaly count
  from real numbers. Until then, hide the panel/KPI rather than show confident fake figures.

### FC-06 — Approve/Reject rationale (`comment`) is collected in the modal but the backend ignores it (governance data-loss)
- **Severity:** high
- **Category:** Data-loss on a write/governance flow
- **Location:** UI `src/components/principal/GradeApprovals.js:84-102, 183-207` (bulk modal posts `comment`);
  API `src/api/adminApi.js:81-85`; handler `backend_node/src/controllers/principalController.js:128-182`
  (`reviewGradeChange` destructures `{grade_ids, action, comment}` at line 133 but **never references `comment`**).
- **Current state:** partial. Approve/reject correctly flips `approval_status`, writes an immutable grade event,
  and (on approve) creates a notification — all in a transaction. But the reviewer's typed reason ("Optional comment
  for these grades…") is silently discarded: it is not appended to `remarks`, not written into the grade event's
  payload, and not stored anywhere.
- **Evidence:** For a rejection especially, the "why" is the whole point of the audit trail; here it vanishes with
  a success toast.
- **Recommendation:** Persist `comment` — pass it into `appendGradeEvent` (e.g. as a `note`/`reason`) and/or append
  it to `grade.remarks` the way `commentReportCard` does, so the rationale is auditable.

### FC-07 — Publish flow doesn't reflect in the UI; "Published Report Cards" actually lists *approved* (not published) cards
- **Severity:** medium
- **Category:** Shape/semantic mismatch (UI reads the wrong field)
- **Location:** `listReportCards` sets per-student `published` from `is_published`
  (`principalController.js:217-239`); `ReportCardApproval.js:228-246` **never reads `rc.published`** (badge keys off
  `rc.approved` only); `PublishedReportCards.js:30` filters `.filter(rc => rc.approved)` — **not** `rc.published`.
- **Current state:** partial. `publishReportCard` does persist `is_published` (parents/students who read that flag
  are served correctly). But on the principal side: (a) after "Publish All Approved", the Report Card Approval list
  is unchanged — an already-published, all-approved student still shows "Ready to publish", so the action looks like
  it did nothing; (b) the "Published Report Cards" screen shows every all-approved student regardless of whether it
  was ever published, badging them "Published". The publish button is effectively decorative *for these two screens*.
- **Recommendation:** Add a per-student `published` (already returned) badge/state to ReportCardApproval and filter
  `PublishedReportCards` on `rc.published`. Optionally split "Approved, unpublished" vs "Published" so publishing has
  a visible effect.

### FC-08 — Teacher insights: `overloaded` and `underperforming` are hardcoded 0 (teacher-evaluation analytics are fake)
- **Severity:** medium
- **Category:** Stub backend
- **Location:** `backend_node/src/controllers/principalController.js:594-609` (`getTeacherInsights` returns
  `overloaded:0, underperforming:0`); UI `components/schooladmin/Principal/TeacherPanel.jsx` (via `PrincipalHome.js:41`).
- **Current state:** partial. Only `totalTeachers` and `pendingGrades` (`grade_letter IS NULL`) are real. The two
  headline "insight" metrics are literals, so the teacher-oversight panel is largely theater.
- **Recommendation:** Compute overload from class/subject assignment counts and underperformance from class average
  vs threshold, or drop the two fake tiles.

### FC-09 — `phone` is a data-loss field everywhere (the `User` model has no `phone` column)
- **Severity:** medium
- **Category:** Data-loss / form field ignored
- **Location:** `backend_node/src/models/User.js:9-60` (no `phone` attribute); create/update at
  `principalController.js:371-378, 421-432`; read map at `:345`; UI form `PrincipalUsers.js:203-207`.
- **Current state:** broken-or-stub. The Add/Edit form has a Phone input; `createPrincipalUser` passes `phone` to
  `User.create` and `updatePrincipalUser` to `user.update`, but `phone` isn't a model attribute, so it's dropped.
  The list maps `phone: a.user?.phone` → always `undefined`, so the phone line never renders. (The controller's own
  comment at line 336 even acknowledges "users has no phone column", yet the code still reads/writes it.)
- **Recommendation:** Either add a `phone` column to `users` and map it, or remove the Phone field from the form and
  the read map so it stops silently swallowing input.

### FC-10 — `usePrincipalDashboard`: partial failures show fake zeros, are never retried, and the "loaded" cache resets every visit
- **Severity:** medium
- **Category:** Error handling / caching contract
- **Location:** `src/hooks/usePrincipalDashboard.js:20-60`; provider scope `src/components/principal/PrincipalHome.js:192-198`
  (`PrincipalProvider` wraps only `PrincipalHomeInner`); `src/context/PrincipalContext.js`.
- **Current state:** partial. `Promise.allSettled` sets each slice only on success and marks `loaded=true`
  unconditionally. If, say, `finance-snapshot` rejects but the rest succeed, `allFailed` is false → **no error is
  shown**, the finance slice stays `null` → FinancePanel falls back to zero-defaults (`PrincipalHome.js:42`),
  indistinguishable from real data, and it is **never retried** (no refresh/retry control on the home). The error UI
  appears only if *all seven* calls fail. Separately, because `PrincipalProvider` wraps only the home component, the
  `loaded` flag (its only cache) is destroyed whenever you navigate away from Command Center, so all seven endpoints
  re-fire on every return — the cache buys nothing cross-page, while masking partial failures within a session.
- **Recommendation:** Track per-slice error state and render a degraded/retry affordance; don't set `loaded=true`
  when some slices failed (or expose a manual refresh). If cross-page caching is intended, lift the provider above
  the router shell.

### FC-11 — Activity feed is thin and renders raw timestamps; 4 of 6 activity kinds are never produced
- **Severity:** low
- **Category:** Partial backend / display
- **Location:** `backend_node/src/controllers/principalController.js:633-660` (`getActivityFeed`, Notifications only,
  `at: n.created_at` raw); UI `components/schooladmin/Principal/ActivityFeed.jsx` (`KIND_META` has grade/payment/
  attendance/announce/request/admin; feed only ever emits `announce`/`request`).
- **Current state:** partial. Only tenant `Notification` rows are surfaced (a deliberate fix to avoid leaking the
  platform-wide `SecurityAuditLog`), mapped to just two kinds. `it.at` is printed verbatim (raw ISO/Date string),
  not humanized. Grade submissions, payments, and attendance events never appear despite having icons/colors defined.
- **Recommendation:** Format `at` (relative time) and, if a richer feed is wanted, union real grade/payment/
  attendance events (all school-scoped) into the feed.

### FC-12 — `overview` returns dead `report_cards_pending` / `report_cards_published` (always 0, unused)
- **Severity:** low
- **Category:** Dead shape fields
- **Location:** `backend_node/src/controllers/principalController.js:45-46, 55-56`; consumer only reads
  `overview?.metrics?.pending_grade_changes` (`PrincipalHome.js:45`).
- **Current state:** partial. The two metrics are hardcoded `0` and never read by any component. Harmless but
  misleading to future callers who might trust them.
- **Recommendation:** Populate from real report-card counts or remove the fields.

### FC-13 — Approval notification message always says "Grade for subject" (association not loaded)
- **Severity:** low
- **Category:** Cosmetic shape bug
- **Location:** `backend_node/src/controllers/principalController.js:163-170` — message uses `g.Subject?.name`, but
  the grades were fetched at `:138-140` **without** any `include`, so `g.Subject` is always undefined and the
  message falls back to the literal "subject".
- **Recommendation:** Include the `subject` association (alias is `subject`, lowercase) in the fetch, or look up the
  name, so the notification is meaningful.

### FC-14 — Syllabus progress issues an N+1 query (one `SyllabusTopic.findAll` per subject)
- **Severity:** low
- **Category:** Performance
- **Location:** `backend_node/src/controllers/principalController.js:662-693` — loops subjects and queries topics
  individually inside the loop.
- **Recommendation:** Fetch all topics for the school once and group in memory, or use an aggregate GROUP BY.

### FC-15 — Principal "Notifications" nav routes to the superadmin `SANotifications` component
- **Severity:** low
- **Category:** Cross-role component reuse (scope unverified)
- **Location:** `src/components/superadmin/SuperadminDashboard.js:845` (principal nav item) and `:1304-1307`
  (renders `StudentNotifications` for students, else `SANotifications` for everyone incl. principal).
- **Current state:** partial. The principal's Notifications page reuses the superadmin notifications UI; whether it
  is tenant-scoped for a principal token is not established here.
- **Recommendation:** Confirm `SANotifications` is school-scoped for principal, or point the principal nav at a
  scoped notifications view.

### FC-16 — Command-center KPIs are computed over all-time / all-status rows (not term- or approval-scoped)
- **Severity:** enhancement
- **Category:** Metric correctness / net-new scoping
- **Location:** `backend_node/src/controllers/principalController.js:506-513` — `avgAcademic` averages **every**
  grade's `total` (including pending/unapproved), and `avgAttendance` averages **all** attendance ever recorded, not
  the active term.
- **Recommendation:** Scope academic average to approved grades in the active term and attendance to a rolling
  window/term so leadership KPIs reflect "this term".

### FC-17 — `syllabus-progress` permission map omits SUPERADMIN while the backend gate allows it
- **Severity:** low
- **Category:** FE/BE gate inconsistency
- **Location:** `src/config/permissions.js:150` (`[SCHOOL_ADMIN, PRINCIPAL]`, no SUPERADMIN) vs
  `routes/principal.js:21,47` (`PRINCIPAL_ACCESS` includes superadmin) and the shell mounting the page under
  `scoped(...)` for superadmin.
- **Recommendation:** Add SUPERADMIN to the `syllabus-progress` permission entry for consistency with the other
  principal keys (`grade-approvals`, `attendance-report`, etc. all list SUPERADMIN).

---

## 3. Feature end-to-end status summary

| Feature | Read | Write | Status | Blocking issues |
|---------|------|-------|--------|-----------------|
| Command Center (home) | real + faked | — | **partial** | FC-05 finance fake, FC-08 teacher fake, FC-10 silent partial-failure |
| Grade Approvals (list) | real | — | **works** | — |
| Grade Approve/Reject (bulk) | — | persists | **partial** | FC-06 comment/reason discarded |
| Grade Comment | — | persists (remarks) | **works** | — |
| Report Card Approval (list) | real | — | **partial** | FC-07 no published-state reflection |
| Report Card Publish | — | persists is_published | **partial** | FC-07 invisible in principal UI |
| Published Report Cards | real | — | **partial** | FC-07 filters `approved`, not `published` |
| Attendance Report | real | — | **works** | — |
| Syllabus Progress | real | — | **works** | FC-14 N+1 |
| Leadership Team (list) | faked fields | — | **broken** | FC-04 always Active/Principal/Full; conflates school-admins |
| Add Leadership Member | — | partial | **broken** | FC-02 locked out, FC-03 role/access/phone dropped |
| Edit / Suspend / Activate | — | no-op | **broken** | FC-01 fake-success toggle, FC-03 data-loss |
| Finance Snapshot | stub zeros | — | **fake** | FC-05 |
| Activity Feed | thin | — | **partial** | FC-11 |

**Bottom line:** wiring is complete (no orphan calls/routes), and the read-heavy academic surfaces
(grade approvals, attendance, syllabus, class performance) genuinely work. The damage is concentrated in three
areas: (1) the entire **Leadership Team / RBAC user-management** feature is broken end-to-end because the
`SchoolAdmin` model lacks the `role`/`access_level`/`is_active` columns the controller reads and writes, and new
accounts are created inactive with no activation path (FC-01/02/03/04); (2) **finance oversight is fabricated**
(FC-05); and (3) several write/governance flows **lose data or don't reflect** (approval comment FC-06, publish
reflection FC-07, phone FC-09).
