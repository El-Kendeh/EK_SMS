# Appendix — Endpoint Inventory (reference)

Mounted endpoints from direct reads of [school.js](../backend_node/src/routes/school.js) and [superadmin.js](../backend_node/src/routes/superadmin.js). FE calls from the audit agents. All school routes carry a trailing slash.

---

## A. `/api/school/*` (school router) — `[authenticateToken, schoolScope]`, NO role gate

```
GET  /api/school/check-school-name/        (public)
GET|POST  /api/school/info/
GET  /api/school/context/                  (orphan — no live caller)

# Students
GET|POST  /api/school/students/
PUT  /api/school/students/:id/
GET  /api/school/students/next-admission-number/
GET  /api/school/student-stats/

# Teachers
GET|POST  /api/school/teachers/
PUT  /api/school/teachers/:id/
GET  /api/school/teacher-stats/

# Classes
GET  /api/school/classes/
GET  /api/school/classes/:id/
POST /api/school/classes/
PUT|DELETE  /api/school/classes/:id/
POST /api/school/classes/bulk-create/
POST /api/school/classes/:id/assign-students/
POST /api/school/classes/:id/assign-subjects/

# Subjects
GET|POST  /api/school/subjects/
PUT|DELETE  /api/school/subjects/:id/
POST /api/school/subjects/:id/assign-classes/
POST /api/school/subjects/:id/assign-teachers/

# Academic
GET  /api/school/academic-years/    POST /api/school/academic-years/
GET  /api/school/terms/             POST /api/school/terms/
PUT|DELETE  /api/school/terms/:id/

# Syllabus
GET|POST  /api/school/syllabus-topics/
PUT|DELETE  /api/school/syllabus-topics/:id/
GET  /api/school/syllabus-stats/           (orphan)
POST /api/school/syllabus/generate/        (no tenant scope — see doc 02 #5)

# Grades / Attendance / Grading
GET|POST  /api/school/grades/              (saveGrades — bypasses audit, see doc 02 #3)
POST /api/school/attendance/
POST /api/school/attendance/class/         (orphan for school_admin)
GET|POST  /api/school/grading-scheme/

# Rooms / Exams / Notifications / Analytics
GET|POST  /api/school/rooms/               (NO :id PUT/DELETE — see 404s)
GET|POST  /api/school/exams/               (NO :id DELETE, NO :id/results/)
GET|POST  /api/school/notifications/       (NO :id/read/)
GET  /api/school/analytics/

# Finance (orphaned in practice — live UI uses /api/finance/*)
GET  /api/school/finance/stats/
GET  /api/school/finance/fees/
GET|POST  /api/school/finance/expenses/

# Teacher-assignments / Exam-officers / Messages / Parents
GET|POST  /api/school/teacher-assignments/  (NO :id DELETE)
GET|POST  /api/school/exam-officers/
GET|POST  /api/school/messages/
POST /api/school/parents/                   (NO GET — dead pages call GET ?q=)

# Principal-users / Finance-users
GET|POST  /api/school/principal-users/   PUT /api/school/principal-users/:id/
GET|POST  /api/school/finance-users/     PUT /api/school/finance-users/:id/

# Timetable / Modification requests
GET  /api/school/timetable/   POST /api/school/timetable/generate/   DELETE /api/school/timetable/
POST /api/school/modification-requests/review/   (no-op apply — see doc 02 #4)
```

---

## B. `/api/*` superadmin router, `sla = requireRole(['superadmin','school_admin'])` — SECURE surface

```
# Classes / Subjects CRUD (+toggle)
GET|POST  /api/classes/        PUT|DELETE|PATCH /api/classes/:id/[toggle/]
GET|POST  /api/subjects/       PUT|DELETE|PATCH /api/subjects/:id/[toggle/]

# Class assignment
GET  /api/classes/:id/students/         GET /api/classes/:id/available-students/
POST /api/classes/:id/assign-students/
GET  /api/classes/:id/subjects/         GET /api/classes/:id/available-subjects/
POST /api/classes/:id/assign-subjects/
GET  /api/classes/:id/teachers/         GET /api/classes/:id/available-teachers/
POST /api/classes/:id/assign-teacher/   POST /api/classes/:id/assign-multiple-teachers/

# Subject assignment
GET  /api/subjects/:id/classes/         GET /api/subjects/:id/available-classes/
POST /api/subjects/:id/assign-classes/
GET  /api/subjects/:id/teachers/        POST /api/subjects/:id/assign-teacher/

# Students CRUD (+toggle/block, parents, documents)
GET|POST  /api/students/   PUT|DELETE /api/students/:id/   PATCH /api/students/:id/toggle/  /block/
GET  /api/students/:id/parents/
GET|POST  /api/students/:id/documents/   DELETE /api/students/:id/documents/:docId/

# Parents CRUD (+toggle/block) + linking
GET|POST  /api/parents/   PUT|DELETE /api/parents/:id/   PATCH /api/parents/:id/toggle/  /block/
POST /api/link-parent/    POST /api/unlink-parent/

# Teachers CRUD (+toggle/block)
GET|POST  /api/teachers/  PUT|DELETE /api/teachers/:id/  PATCH /api/teachers/:id/toggle/  /block/

# Bursars / Principals CRUD (+toggle/block)
GET|POST  /api/bursars/    PUT|DELETE /api/bursars/:id/    PATCH /api/bursars/:id/toggle/  /block/
GET|POST  /api/principals/ PUT|DELETE /api/principals/:id/ PATCH /api/principals/:id/toggle/  /block/

# Virtual meetings
GET|POST  /api/virtual-meetings/   PUT|DELETE /api/virtual-meetings/:id/
```

All of B's list handlers apply `scopedSchoolId` (doc 02 §Verified-Safe).

---

## C. FE calls by LIVE page (what each live component hits)

| Page | Endpoints |
|------|-----------|
| `superadmin/SAStudents` | `GET|POST /api/students/`, `PUT /api/students/:id/`, `PATCH /api/students/:id/toggle/  /block/`, `DELETE /api/students/:id/`, `GET /api/schools/` (super only) |
| `superadmin/SATeachers` | `GET|POST /api/teachers/`, `PUT /api/teachers/:id/`, `PATCH .../toggle/ /block/`, `DELETE`, `GET /api/schools/` (super) |
| `superadmin/SAClasses` | `GET|POST /api/classes/`, `PUT|DELETE|PATCH /api/classes/:id/`, `GET /api/class-subtypes/`, all `/api/classes/:id/[available-]students|subjects|teachers/` + `assign-*` |
| `superadmin/SASubjects` | `GET|POST /api/subjects/`, `PUT|DELETE|PATCH /api/subjects/:id/`, `/api/subjects/:id/[available-]classes|teachers/` + `assign-*` |
| `superadmin/SAParents` | `GET|POST /api/parents/`, `PUT /api/parents/:id/`, `PATCH .../toggle/ /block/`, `DELETE`, `POST /api/link-parent/` |
| `SAStaffManager` (principal/bursar) | `GET|POST /api/principals/` or `/api/bursars/` (+`?page=&limit=`), `PUT/PATCH/DELETE :id/`, `GET /api/schools/` (super) |
| `FinanceUsersPage` | `GET|POST /api/school/finance-users/`, `PUT /api/school/finance-users/:id/` |
| `ExamsPage` | `GET|POST /api/school/exams/` ✅ · `DELETE /api/school/exams/:id/` ❌ · `GET|POST /api/school/exams/:id/results/` ❌ |
| `TimetablePage` | `GET /api/school/timetable/`, `POST /api/school/timetable/generate/`, `DELETE /api/school/timetable/` ✅ |
| `RoomsPage` | `GET|POST /api/school/rooms/` ✅ · `PUT|DELETE /api/school/rooms/:id/` ❌ |
| `GradingSchemePage` | `GET|POST /api/school/grading-scheme/` ✅ |
| `AcademicCalendarPage` | `GET|POST /api/school/academic-years/`, `GET|POST|PUT|DELETE /api/school/terms/` ✅ (note: `PUT /academic-years/:id/` ❌) |
| `StudentPromotionPage` | `POST /api/school/students/:id/promote/` ❌ (whole feature) |
| `TeacherAssignmentsPage` | `GET|POST /api/school/teacher-assignments/` ✅ · `DELETE :id/` ❌ |
| `ExamOfficersPage` | `GET|POST /api/school/exam-officers/` ✅ |
| `AIDocumentCapture` | `POST /api/school/ai-capture/`, `GET /api/school/ai-capture/list/` ❌ (whole feature) |

✅ = endpoint exists · ❌ = 404 (missing on backend)

---

## D. Quick 404 checklist (live pages)

```
[ ] POST   /api/school/students/:id/promote/
[ ] POST   /api/school/ai-capture/
[ ] GET    /api/school/ai-capture/list/
[ ] POST   /api/school/bulk-import/
[ ] POST   /api/school/users/resend-credentials/
[ ] GET    /api/school/exams/:id/results/
[ ] POST   /api/school/exams/:id/results/
[ ] DELETE /api/school/exams/:id/
[ ] PUT    /api/school/rooms/:id/
[ ] DELETE /api/school/rooms/:id/
[ ] DELETE /api/school/teacher-assignments/:id/
[ ] PUT    /api/school/academic-years/:id/   (used by some calendar/activate flows)
```
Implement these in `school.js` + `schoolController.js`, or remove the UI actions that call them.
