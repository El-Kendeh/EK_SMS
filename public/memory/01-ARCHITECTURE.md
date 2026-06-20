# EK-SMS Architecture (Verified 2026-06-10)

## 1. Stack — corrects stale info in root project memory

| Layer | Reality |
|---|---|
| Frontend | React 19 (Create React App) at `EK_SMS/` (root). Entry: `src/App.js` → `src/index.js`. |
| Backend | **Node.js + Express + Sequelize** at `EK_SMS/backend_node/`. Entry: `backend_node/src/index.js`. ORM models in `backend_node/src/models/*.js` (70 model files + `associations.js`). |
| Database | MySQL via Sequelize (table prefixes like `pruh_finance_fee`, `pruh_core_principal`, `pruh_system_bursar`, etc.) |
| Legacy/inactive | `EK_SMS/eksms/` — old Django project. `eksms/eksms_core/` now contains **only** `__init__.py` and `management/` (no models.py, views.py, admin.py). Treat all Django-era docs (`API.md`, `PRUH_SMS_SYSTEM_DOCUMENTATION.md`, etc.) as **historical/aspirational**, not current truth. The root `MEMORY.md` "Run the project" instructions (Django runserver) are stale — the real backend is `backend_node`. |

## 2. Backend layout (`backend_node/src/`)

```
config/        - DB connection, env config
controllers/   - 16 controller files (business logic)
middleware/    - auth.js (JWT-style token check), schoolScope, requireRole, multer uploads
models/        - 70 Sequelize models + associations.js
routes/        - 12 route files, each mounted in src/index.js
services/      - supporting services
utils/         - helpers (hashing, receipts, etc.)
index.js       - app entry; mounts all routers (see table below)
```

### Route mounting (from `backend_node/src/index.js`)

| Router file | Mounted at |
|---|---|
| auth.js | `/api` |
| approval.js | `/api/approval` |
| teacher.js | `/api/teacher` |
| student.js | `/api/student` |
| principal.js | `/api/principal` |
| finance.js | `/api/finance` |
| parent.js | `/api/parent` |
| whistleblower.js | `/api/whistleblower` |
| live-classes.js | `/api/live-classes` |
| school.js | `/api` (paths already start with `/school/...`) |
| superadmin.js | `/api` (paths already start with `/...`, e.g. `/schools/`, `/dashboard/`) |

Full endpoint list: see [02-API-REFERENCE.md](02-API-REFERENCE.md).

## 3. Frontend layout (`src/`)

```
api/            - adminApi.js, parentApi.js, studentApi.js, teacherApi.js, client.js (ApiClient: get/post/put/patch/delete)
components/
  superadmin/   - SuperadminDashboard.js (THE shell — see §4) + 36 SA*.js pages
  schooladmin/  - school-admin-side ACCOUNT MANAGEMENT pages (Principal/, FinanceUsers/, Students/, Teachers/, Parents/ subfolders manage USER ACCOUNTS for those roles, not their dashboards)
  teacher/      - 47 files incl. TeacherHome.js (548 lines) — built but currently unused, see §4
  student/      - 38 files incl. StudentHome.js (790 lines) — built but currently unused, see §4
  parent/       - 28 files incl. ParentHome.js — built but currently unused, see §4
  principal/    - GradeApprovals.js, ReportCardApproval.js — STUB placeholders only
  bursar/       - BursarOverview.js, Expenses.js, FeeCategories.js, Payments.js — STUB placeholders only
  shared/       - PhoneInput, phone-countries
config/         - permissions.js (canAccess(), ROLE_LABELS, ALL_NAV_ITEMS visibility per role)
context/        - ThemeContext (TeacherContext/StudentContext/ParentContext referenced by Home files but verify they exist before reuse)
```

## 4. THE CRITICAL PATTERN: single dashboard shell, role-gated

**Every logged-in role lands on the same component.** `App.js` (lines ~109-186):

- On login, `App.js` checks `user.role`. If role is `superadmin | school_admin | principal | bursar | teacher | student | parent`, it sets `currentPage = 'superadmindashboard'`.
- This renders `<SuperadminDashboard />` (`src/components/superadmin/SuperadminDashboard.js`, 1127 lines) for **every role**.

Inside `SuperadminDashboard.js`:

- `const [activePage, setActivePage] = useState('overview')` (line 330) — **same default for all roles**.
- `const navItems = ALL_NAV_ITEMS.filter(item => canAccess(item.key, user?.role))` (line 639) — sidebar links are filtered per role using `src/config/permissions.js`. `'overview'` is allowed for **all** roles (permissions.js line 23).
- The `<main className="sa-content">` body is one giant sequence of `{activePage === 'xxx' && <Component .../>}` blocks (lines ~765-1087).
- `{activePage === 'overview' && <SAOverview .../>}` (line 765) — **SAOverview is a superadmin "all schools" overview component and does NOT branch on `user.role`** (verified: no `role ===` checks inside `SAOverview.js`). So today, **every role's landing page renders the same superadmin schools-overview UI**, regardless of whether that makes sense for them.
- Existing role pages already wired: Teacher (`grade-entry`, `my-classes`), Student (`my-grades`, `my-attendance`, `my-timetable`), Parent (`children-grades`, `children-attendance`), Bursar (`fee-dashboard`→BursarOverview, `fee-categories`, `payments`, `expenses` — all stubs), Principal (`grade-approvals`→GradeApprovals, `report-card-approval`→ReportCardApproval — both stubs).
- Anything not in the giant `activePage` allowlist (line ~1085) falls through to `<StubPage title=... />`.

### ⚠️ Important correction vs. earlier assumptions
`TeacherHome.js`, `StudentHome.js`, and `ParentHome.js` are fully built (548/790/100+ lines, hooks, animations, cards) **but are not imported anywhere** outside their own files — they are dead code. The "overview" landing page for teacher/student/parent currently shows `SAOverview` (superadmin's school list), which is very likely the wrong UI for those roles. **This is pre-existing and out of scope for the Principal/Finance work**, but the Principal/Finance dashboards being built now should NOT repeat this mistake — see §5.

## 5. How to add the Principal / Finance dashboards correctly

1. Build `PrincipalHome.js` (in `src/components/principal/`) and `BursarHome.js` (in `src/components/bursar/`) following the TeacherHome/StudentHome/ParentHome **pattern** (hooks for parallel data fetch, framer-motion cards, `navigateTo` prop) — see [04-PRINCIPAL-DASHBOARD-PLAN.md](04-PRINCIPAL-DASHBOARD-PLAN.md) and [05-FINANCE-DASHBOARD-PLAN.md](05-FINANCE-DASHBOARD-PLAN.md) for exact data sources.
2. Import the new Home components into `SuperadminDashboard.js`.
3. At the `activePage === 'overview'` block (~line 765), branch on `user?.role`:
   ```jsx
   {activePage === 'overview' && (
     user?.role === 'principal' ? <PrincipalHome navigateTo={goTo} schoolId={schoolId} /> :
     user?.role === 'bursar'    ? <BursarHome navigateTo={goTo} schoolId={schoolId} /> :
     <SAOverview schools={schools} user={user} onReview={handleReview} onNavigate={goTo} />
   )}
   ```
4. Add new sidebar nav entries for principal/bursar specific sub-pages (grade approvals, report cards, fee management, payments, expenses, etc.) in `ALL_NAV_ITEMS` + `permissions.js` `canAccess()` map, restricted to `ROLES.PRINCIPAL` / `ROLES.BURSAR` (and `SUPERADMIN`/`SCHOOL_ADMIN` if they should preview them too).
5. Replace the existing stub components (`GradeApprovals.js`, `ReportCardApproval.js`, `BursarOverview.js`, `Expenses.js`, `FeeCategories.js`, `Payments.js`) with real implementations per the build plans.
6. Add `src/api/financeApi.js` (does not exist) and extend `principalApi` in `src/api/adminApi.js` — see [06-KNOWN-ISSUES.md](06-KNOWN-ISSUES.md) for existing param mismatches to fix while you're there.
7. **Mobile responsiveness is mandatory** — every new `.css` file needs `@media (max-width: 600px)` rules (per root project memory).

## 6. Auth & roles

- Custom token format `token_<user_id>_<12-char-uuid>`, stored in `localStorage` (`token`, `user`).
- Backend middleware: `authenticateToken` (JWT/token check), `requireRole(...)`, `schoolScope` (scopes queries to `req.user.school_id`).
- Roles: `superadmin`, `school_admin`, `principal`, `bursar`, `teacher`, `student`, `parent` (from `src/config/permissions.js` `ROLES`).
- `User` model `hasOne` relations to `CorePrincipal` / `CoreBursar` / `Teacher` / `Student` / `Parent` / `SchoolAdmin` for role-specific profile data.
