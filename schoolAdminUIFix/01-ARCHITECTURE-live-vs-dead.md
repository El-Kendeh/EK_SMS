# 01 — Architecture: Live vs Dead

**This is the most important doc.** Everything else depends on knowing which files actually run.

---

## The single-shell pattern

There is no separate "school admin dashboard." [SuperadminDashboard.js](../src/components/superadmin/SuperadminDashboard.js) is the one shell for **all** roles. It:

1. Reads the logged-in user's `role`.
2. Builds a nav from page-keys the role may access ([permissions.js](../src/config/permissions.js) `canAccess`).
3. Renders the component mapped to the current `activePage` (a big render switch around lines 1340–1445).

So "what the school admin sees" = `{ page-keys where canAccess(key,'school_admin') } ∩ { keys the render switch actually maps to a component }`. Anything else falls through to a generic **StubPage** ("under development").

The dashboard is wrapped by [DashboardGate.js](../src/components/DashboardGate.js), which calls `/api/registration/check-status` and shows a modal if the school isn't approved. **This is a UI gate only** (see doc 02 — it's not enforced server-side per request).

---

## What `school_admin` can access (from permissions.js)

`canAccess(key,'school_admin') === true` for these keys:

```
overview, profile, notifications
classes, subjects, teachers, students, parents
account-teachers, account-students, account-parents
principal, bursar, finance-users
examination, attendance-report, timetable-mgr
fee-dashboard, fee-categories, fees-structure, school-financial-report
report-card-generator, report-cards-published
syllabus-progress, exam-schedule, rooms, grading-scheme,
academic-calendar, promotions, teacher-assignments, exam-officers, ai-capture
```

`settings`, `security-logs`, `analytics`, all `academic-*`/`grading-system` system-config, and platform pages are **superadmin-only** — correctly hidden from tenants.

---

## Page-key → component map (the live wiring)

Verified from the shell's imports (lines 16–107) and render switch (lines 1340–1445).

| Page key | Component rendered | Source folder | Status |
|----------|-------------------|---------------|--------|
| `account-students` | `SAStudents` | `superadmin/` | ✅ live |
| `account-teachers` | `SATeachers` | `superadmin/` | ✅ live |
| `classes` | `SAClasses` | `superadmin/` | ✅ live |
| `subjects` | `SASubjects` | `superadmin/` | ✅ live |
| `account-parents` | `SAParents` | `superadmin/` | ✅ live |
| `principal` | `SAPrincipal` → `SAStaffManager(kind=principal)` | `superadmin/` | ✅ live |
| `bursar` | `SABursar` → `SAStaffManager(kind=bursar)` | `superadmin/` | ✅ live |
| `finance-users` | `FinanceUsersPage` (re-export) | `schooladmin/FinanceUsers/` | 🟠 live, buggy |
| `exam-schedule` | `ExamsPage` | `schooladmin/NewPages.js` | 🟠 live, partial 404 |
| `timetable-mgr` | `TimetablePage` | `schooladmin/NewPages.js` | ✅ live |
| `rooms` | `RoomsPage` | `schooladmin/SAExtraPages.js` | 🟠 live, partial 404 |
| `grading-scheme` | `GradingSchemePage` | `schooladmin/SAExtraPages.js` | ✅ live |
| `academic-calendar` | `AcademicCalendarPage` | `schooladmin/SAExtraPages.js` | ✅ live |
| `promotions` | `StudentPromotionPage` | `schooladmin/SAExtraPages.js` | 🟠 live, 404 |
| `teacher-assignments` | `TeacherAssignmentsPage` | `schooladmin/SAExtraPages.js` | 🟠 live, partial 404 |
| `exam-officers` | `ExamOfficersPage` | `schooladmin/SAExtraPages.js` | ✅ live |
| `ai-capture` | `AIDocumentCapture` | `schooladmin/` | 🟠 live, 404 |
| `attendance-report` | `AttendanceReport` | `principal/` (shared) | ✅ live |
| `syllabus-progress` | `SyllabusProgress` | `principal/` (shared) | ✅ live |
| `report-cards-published` | `PublishedReportCards` | `principal/` (shared) | ✅ live |
| `fee-dashboard`, `fee-categories` | bursar pages | `bursar/` (shared) | ✅ live |
| `examination` | — (no mapping) | — | 🔵 StubPage |
| `report-card-generator` | — (no mapping) | — | 🔵 StubPage |
| `fees-structure` | — (no mapping) | — | 🔵 StubPage |
| `school-financial-report` | — (no mapping) | — | 🔵 StubPage |

**Key takeaway:** the core entity pages a school admin uses every day are the **`superadmin/SA*`** files. Only `finance-users` and the 10 add-on pages come from `schooladmin/`.

---

## The import-graph proof (why the rest is dead)

The shell imports from `schooladmin/` **only** these (lines 98–107):

```js
const ExamsPage        = named(() => import('../schooladmin/NewPages'), 'ExamsPage');
const TimetablePage    = named(() => import('../schooladmin/NewPages'), 'TimetablePage');
const FinanceUsersPage = named(() => import('../schooladmin/NewPages'), 'FinanceUsersPage');
const RoomsPage              = named(() => import('../schooladmin/SAExtraPages'), 'RoomsPage');
const GradingSchemePage      = named(() => import('../schooladmin/SAExtraPages'), 'GradingSchemePage');
const AcademicCalendarPage   = named(() => import('../schooladmin/SAExtraPages'), 'AcademicCalendarPage');
const StudentPromotionPage   = named(() => import('../schooladmin/SAExtraPages'), 'StudentPromotionPage');
const TeacherAssignmentsPage = named(() => import('../schooladmin/SAExtraPages'), 'TeacherAssignmentsPage');
const ExamOfficersPage       = named(() => import('../schooladmin/SAExtraPages'), 'ExamOfficersPage');
const AIDocumentCapture      = lazy(() => import('../schooladmin/AIDocumentCapture'));
```

- `NewPages.js` is imported, but the shell only pulls **3** of its many exports (`ExamsPage`, `TimetablePage`, `FinanceUsersPage`). Its `AnalyticsPage`, `NotificationsPage`, `StudentsPage`, `TeachersPage`, inline `AddStudentWizard`, profile panels, etc. are **never mounted** → dead.
- `FinanceUsersPage` is a **re-export**: [NewPages.js:948](../src/components/schooladmin/NewPages.js#L948) `export { default as FinanceUsersPage } from './FinanceUsers/FinanceUsersPage'` — so the `FinanceUsers/` folder **is live**.
- `ParentsPage` and `PrincipalUsersPage` are also re-exported ([NewPages.js:940,956](../src/components/schooladmin/NewPages.js#L940)) but the shell **doesn't import them** (it uses `superadmin/SAParents` and `SAStaffManager`) → `Parents/` and `Principal/` folders are **dead**.
- `SchoolAdminPages.js`, `schooladmin/SAstudents.js`, `schooladmin/SAClasses.js`, `schooladmin/SASubjects.js`, `ClassProfileDrawer.js`, `Students/`, `Teachers/` are imported **nowhere** the shell reaches → **dead**.

Full dead inventory: [04-dead-code-inventory.md](04-dead-code-inventory.md).

---

## Two API contracts (consequence of the split)

| Surface | Used by | Role gate | Tenant scope | Notes |
|---------|---------|-----------|--------------|-------|
| `/api/students/`, `/api/teachers/`, `/api/classes/`, `/api/subjects/`, `/api/parents/`, `/api/principals/`, `/api/bursars/` | **Live** `superadmin/SA*` pages | ✅ `requireRole(['superadmin','school_admin'])` | ✅ `scopedSchoolId` | superadmin router; the secure surface |
| `/api/school/*` | **Live** add-on pages **+** the dead `schooladmin/` pages | ❌ none | ⚠️ via `getSchoolFromUser` (works but no role gate) | school router; the insecure surface |

The dead `schooladmin/` pages call a **third** set of `/api/school/students/...parents/...` paths that **don't exist at all** — see doc 05.

---

## No dedicated school-admin nav

Unlike Principal/Bursar (which have `PRINCIPAL_NAV_ITEMS` / `BURSAR_NAV_ITEMS`), there is **no `SCHOOL_ADMIN_NAV_ITEMS`**. A school admin gets `ALL_NAV_ITEMS` (the legacy superadmin ordering) filtered by `canAccess`, which is why the menu includes the stub entries (`examination`, `report-card-generator`, `fees-structure`, `school-financial-report`). A curated nav is a recommended cleanup (doc 06).
