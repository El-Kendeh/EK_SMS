# 03 — Workflow / Feature UI Status (Live pages only)

This doc covers **only the UI a school_admin actually reaches**. Dead pages are in [04-dead-code-inventory.md](04-dead-code-inventory.md). The catalog comes from the audit agents and is cross-checked against the route file ([school.js](../backend_node/src/routes/school.js)) for the 404 claims.

Legend: ✅ working · 🟡 partial · 🟠 broken (renders, action fails) · 🔵 stub.

---

## 3.1 At-a-glance: live page status

| Nav item | Component | Status | Headline issue |
|----------|-----------|--------|----------------|
| Students (account-students) | `superadmin/SAStudents` | 🟡 | works; raw-ID inputs, no doc upload, no bulk import |
| Teachers (account-teachers) | `superadmin/SATeachers` | ✅ | full create+credentials; page-local search only |
| Classes | `superadmin/SAClasses` | 🟡 | works; **capacity/teacher bars are fabricated** |
| Subjects | `superadmin/SASubjects` | ✅ | full CRUD + assignment flows |
| Parents (account-parents) | `superadmin/SAParents` | 🟡 | **shows wrong (guessed) password**; link-by-raw-ID |
| Principal | `SAStaffManager(principal)` | ✅ | full create+credentials |
| Bursar | `SAStaffManager(bursar)` | ✅ | full create+credentials |
| Finance Users | `schooladmin/FinanceUsers` | 🟠 | **"View" crashes**; fabricated panels; edit=coming-soon |
| Exam Schedule | `ExamsPage` | 🟠 | create/list ok; **delete & results 404** |
| Timetable | `TimetablePage` | ✅ | generate/clear/grid all wired |
| Rooms | `RoomsPage` | 🟠 | create/list ok; **edit/delete/toggle 404** |
| Grading Scheme | `GradingSchemePage` | ✅ | load/save ok |
| Academic Calendar | `AcademicCalendarPage` | ✅ | years/terms CRUD ok |
| Promotions | `StudentPromotionPage` | 🟠 | **entire feature 404** (`/students/:id/promote/`) |
| Teacher Assignments | `TeacherAssignmentsPage` | 🟠 | create/list ok; **delete 404** |
| Exam Officers | `ExamOfficersPage` | ✅ | assign/remove ok |
| AI Document Capture | `AIDocumentCapture` | 🟠 | **entire feature 404** (`/school/ai-capture/`) |
| Attendance Report | `principal/AttendanceReport` | ✅ | shared, works |
| Syllabus Progress | `principal/SyllabusProgress` | ✅ | shared, works |
| Published Report Cards | `principal/PublishedReportCards` | ✅ | shared, view-only |
| Fee Dashboard / Categories | `bursar/*` | ✅ | shared, works |
| Examination | — | 🔵 | StubPage |
| Report Card Generator | — | 🔵 | StubPage (admin **cannot generate** report cards) |
| Fees Structure | — | 🔵 | StubPage |
| School Financial Report | — | 🔵 | StubPage |

---

## 3.2 🟠 Live pages whose main action silently 404s

These render and look functional, but call `/api/school/*` endpoints that **do not exist** in [school.js](../backend_node/src/routes/school.js). Verified by reading the route file — the listed paths are absent. `[agent, cross-checked]`

| Feature | FE call (missing) | What breaks for the user |
|---------|-------------------|--------------------------|
| **Student Promotion** | `POST /api/school/students/:id/promote/` | The whole page does nothing on submit |
| **AI Document Capture** | `POST /api/school/ai-capture/`, `GET /api/school/ai-capture/list/`, `POST /api/school/bulk-import/` | Upload + list both fail; feature is non-functional |
| **Exam results** | `GET|POST /api/school/exams/:id/results/` | Can create an exam but never enter marks |
| **Exam delete** | `DELETE /api/school/exams/:id/` | Cannot remove an exam |
| **Room edit/delete/toggle** | `PUT|DELETE /api/school/rooms/:id/` | Can add a room but never edit/remove it |
| **Teacher-assignment delete** | `DELETE /api/school/teacher-assignments/:id/` | Cannot un-assign a teacher |

> The `/api/school/*` routes that **do** exist (GET/POST for exams, rooms, teacher-assignments; full timetable; grading-scheme; academic-years/terms) work. It's the `:id`-level mutations and the two whole features above that are missing.

**Fix per row:** either implement the endpoint in `school.js` + `schoolController.js`, or hide/disable the action in the UI until it exists. See doc 06.

---

## 3.3 🟠 Live but broken / fabricated

### Finance Users — crashes and fakes `[agent]`
Folder: [schooladmin/FinanceUsers/](../src/components/schooladmin/FinanceUsers/) (this folder **is** live via the `finance-users` key).

- **Crash on "View":** [FinanceUserDetails.jsx:80](../src/components/schooladmin/FinanceUsers/FinanceUserDetails.jsx#L80) reads `u.perms.includes(...)`, `u.scope.map(...)`, `u.activity.map(...)` — the API (`GET /api/school/finance-users/`) never returns those fields → `TypeError`, modal crashes.
- **Fabricated panels:** `FinanceUserCard` renders `$undefined` KPIs; `StatsCards`/`ActivityPanel` show all-zero; `TransactionHeat` hardcodes a 30/50/20 split; `IntegrityPanel` shows static SHA-256/audit "trust" badges; `AlertsPanel` always empty.
- **"Edit Role" is a coming-soon banner** ([FinanceUsersPage.jsx:77](../src/components/schooladmin/FinanceUsers/FinanceUsersPage.jsx#L77)).
- **Add form drops 4 fields:** `permissions/scope/transaction_limit/working_hours` are POSTed but not persisted by the backend (`updateFinanceUser` only toggles `is_active`).

### Classes — fabricated utilisation bars `[agent]`
[SAClasses.js:101-106](../src/components/superadmin/SAClasses.js#L101): `const cap = p.capacity || 50; const maxT = p.max_teachers || 10;` → when the backend omits these, every class shows a "/50" capacity bar and a teacher-utilisation bar built on invented maxima, displayed as if real. `student_count` undefined → `undefined/50` text + NaN bar width.

---

## 3.4 🟡 Live but UX-incomplete (the workhorse SA* pages)

The core entity pages **work** (create → one-time credentials → list, edit, toggle/block/delete all hit real, existing, scoped endpoints) but have rough edges: `[agent]`

| Issue | Where | Detail |
|-------|-------|--------|
| **Wrong password shown** | [SAParents.js:131](../src/components/superadmin/SAParents.js#L131) | Credentials modal shows `form.password || 'Parent@123'` instead of the server's `d.password`. If the backend generates its own password, the admin copies one that won't work. (SAStudents/SAStaffManager do this correctly via `d.password`.) |
| **Link parent by raw ID** | [SAParents.js:433](../src/components/superadmin/SAParents.js#L433) | Linking requires typing the numeric Student ID — no name search/picker |
| **Class/Year by raw ID** | SAStudents.js:592, SAClasses.js:200 | `Classroom ID` / `Academic Year ID` are free-text number inputs, no dropdown/validation |
| **No document upload** | SAStudents.js:797 | The "Documents" tab is checkbox *flags*, not file attachments (only the passport photo uploads) |
| **No bulk import** | all live SA* pages | Absent (the polished bulk-import wizards live only in the dead `schooladmin/` folder) |
| **Double-submit risk** | SAParents.js:402, SAStaffManager.js:476 | Create buttons lack a `disabled`-while-saving guard → double-click = duplicate accounts. (SAStudents guards this; the others don't) |
| **Page-local search** | all live SA* pages | Search/filter only the current 20-row page → appears to "find nothing" for records on other pages |
| **Missing list error state** | SAClasses, SASubjects | A failed load looks identical to "no data" (only a transient toast) |
| **Superadmin-flavored copy** | SAStudents.js:825 | Subtitle "Manage all student accounts across schools." — misleading for a single-school admin |

---

## 3.5 🔵 Stubs — nav items that go nowhere

A school_admin sees these in the nav, but they resolve to a generic "under development" StubPage (no render mapping in the shell):

- **Examination**
- **Report Card Generator** — so a school admin **cannot generate report cards**; they can only *view* published ones (`report-cards-published` → shared `PublishedReportCards`). The real pipeline is teacher enters grades → principal approves → published.
- **Fees Structure**
- **School Financial Report**

**Fix:** build them, or remove them from the school_admin nav (doc 06).

---

## 3.6 Workflow deep-dive: what's complete vs where it stops

| Workflow | Verdict | Where it stops |
|----------|---------|----------------|
| Student enrollment (create + credentials) | ✅ complete | server returns real username/password; modal shows them; list reloads |
| Teacher onboarding (create + credentials) | ✅ complete | same; password stripped on edit-load (correct) |
| Principal/Bursar account creation | ✅ complete | `SAStaffManager`, real `d.password`, school auto-assigned for tenant |
| Class → assign students/subjects/teachers | ✅ complete | 5 assign flows all POST to existing `/api/classes/:id/assign-*` routes |
| Subject → assign classes/teacher | ✅ complete | real `/api/subjects/:id/assign-*` routes |
| Parent creation | 🟡 | works, but credentials modal shows a **guessed** password (3.4) |
| Parent ↔ student linking | 🟡 | works, but requires raw numeric Student ID |
| Timetable generate/clear | ✅ complete | `/api/school/timetable/*` all exist and persist |
| Grading scheme | ✅ complete | load/save |
| Academic year/term setup | ✅ complete | CRUD via AcademicCalendarPage |
| Exam management | 🟠 | create/list ok; **results entry + delete 404** |
| Student promotion | 🟠 | **404 — non-functional** |
| AI document capture | 🟠 | **404 — non-functional** |
| Report card generation | 🔵 | **stub — not built for school_admin** |
| Grade entry / approval (school_admin path) | 🔴 | `saveGrades` writes with no audit/approval (see doc 02 #3) |
| Modification-request approval | 🔴 | applies nothing (see doc 02 #4) |
