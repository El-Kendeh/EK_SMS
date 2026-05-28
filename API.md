# EK-SMS API Documentation

Base URL: `https://backend.pruhsms.africa/api`

**Auth:** Most endpoints require `Authorization: Bearer <token>` header.
**Role guard:** Listed per endpoint. `authenticated` = any logged-in user.
**School scope:** `schoolScope` middleware auto-filters data by user's school.

---

## Authentication (`/api/`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/login/` | none | Login with username + password. Returns JWT token + user object |
| POST | `/logout/` | none | Invalidate session |
| POST | `/register/` | none | Register a new school (multipart: schoolBadge file) |
| POST | `/send-otp/` | none | Send OTP to email for password reset |
| POST | `/verify-otp/` | none | Verify OTP code |

**POST /login/** body: `{ "username": "...", "password": "..." }`
**Response:** `{ "success": true, "token": "jwt...", "user": { id, username, role, school_id, ... } }`

---

## Superadmin — System (`/api/`)

Requires `superadmin` role unless noted.

### School Management
| Method | Path | Description |
|--------|------|-------------|
| GET | `/schools/` | List all registered schools |
| POST | `/schools/approve/` | Approve/reject/request-changes a school |
| POST | `/impersonate/` | Impersonate a school admin (returns new JWT) |

### System
| Method | Path | Description |
|--------|------|-------------|
| GET | `/system-health/` | System health check |
| POST | `/reset-user-password/` | Reset any user's password |
| GET | `/security-logs/` | Security audit logs |
| GET | `/security-counters/` | Security counters/dashboard |
| GET | `/forensic-events/` | Forensic event trail |
| GET | `/broadcast-alerts/` | List system-wide broadcast alerts |
| POST | `/broadcast-alerts/` | Create broadcast alert |
| GET | `/system-alerts/` | List system ops alerts |
| POST | `/system-alerts/` | Create system alert |
| POST | `/sa/branding/` | Upload branding file (multipart) |
| GET | `/sa/lockdown/` | Get lockdown status |
| POST | `/sa/lockdown/` | Toggle lockdown |
| POST | `/sa/backup/manual/` | Trigger manual DB backup |
| GET | `/sa/custom-roles/` | List custom roles |
| POST | `/sa/custom-roles/` | Create custom role |
| GET | `/sa/export/` | Export system data |

### Reference Data CRUD (all follow same pattern)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/{resource}/` | List all |
| POST | `/{resource}/` | Create |
| PUT | `/{resource}/:id/` | Update |
| DELETE | `/{resource}/:id/` | Delete |
| PATCH | `/{resource}/:id/toggle/` | Toggle active status |

Resources: `academic-years/`, `system-terms/`, `institution-types/`, `capacity-categories/`, `school-capacities/`, `countries/`, `regions/`, `cities/`, `school-types/`, `syllabus-types/`, `class-subtypes/`, `academic-systems/`, `grading-systems/`

Special:
| Method | Path | Description |
|--------|------|-------------|
| POST | `/academic-years/:id/rollout/` | Roll out academic year to schools |
| POST | `/system-terms/:id/rollout/` | Roll out term to schools |

### Users & Stats
| Method | Path | Description |
|--------|------|-------------|
| GET | `/grade-stats/` | Grade statistics across all schools |
| GET | `/school-stats/` | School statistics |
| GET | `/users/` | List users (paginated/filtered) |
| GET | `/get-users/` | Short user list (id + name) |
| POST | `/users/` | Create a user |

### School-level CRUD (`superadmin` + `school_admin`)
| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/classes/` | List / Create class |
| PUT/DELETE | `/classes/:id/` | Update / Delete class |
| PATCH | `/classes/:id/toggle/` | Toggle class active |
| GET/POST | `/subjects/` | List / Create subject |
| PUT/DELETE | `/subjects/:id/` | Update / Delete subject |
| PATCH | `/subjects/:id/toggle/` | Toggle subject active |
| GET | `/classes/:id/students/` | Students in a class |
| GET | `/classes/:id/available-students/` | Unassigned students |
| POST | `/classes/:id/assign-students/` | Assign students to class |
| GET | `/classes/:id/subjects/` | Subjects in a class |
| GET | `/classes/:id/available-subjects/` | Available subjects for class |
| POST | `/classes/:id/assign-subjects/` | Assign subjects to class |
| POST | `/classes/:id/assign-teacher/` | Assign class teacher |
| GET | `/classes/:id/teachers/` | Teachers for a class |
| POST | `/classes/:id/assign-multiple-teachers/` | Bulk assign teachers |
| GET | `/classes/:id/available-teachers/` | Available teachers |
| GET | `/subjects/:id/classes/` | Classes for a subject |
| GET | `/subjects/:id/available-classes/` | Available classes for subject |
| POST | `/subjects/:id/assign-classes/` | Assign subject to classes |
| GET | `/subjects/:id/teachers/` | Teachers for a subject |
| POST | `/subjects/:id/assign-teacher/` | Assign teacher to subject |
| GET/POST/PUT/DELETE | `/students/` | Student CRUD |
| PATCH | `/students/:id/toggle/` | Toggle student active |
| PATCH | `/students/:id/block/` | Block/unblock student |
| GET | `/students/:id/parents/` | Get student's parents |
| GET/POST/DELETE | `/students/:id/documents/` | Student document management (multipart) |
| GET/POST/PUT/DELETE | `/parents/` | Parent CRUD |
| PATCH | `/parents/:id/toggle/` | Toggle parent active |
| PATCH | `/parents/:id/block/` | Block/unblock parent |
| POST | `/link-parent/` | Link parent to student |
| POST | `/unlink-parent/` | Unlink parent from student |
| GET/POST/PUT/DELETE | `/teachers/` | Teacher CRUD |
| PATCH | `/teachers/:id/toggle/` | Toggle teacher active |
| PATCH | `/teachers/:id/block/` | Block/unblock teacher |
| GET/POST/PUT/DELETE | `/bursars/` | Bursar CRUD (multipart profile_picture) |
| PATCH | `/bursars/:id/toggle/` | Toggle bursar active |
| PATCH | `/bursars/:id/block/` | Block/unblock bursar |
| GET/POST/PUT/DELETE | `/principals/` | Principal CRUD (multipart profile_picture) |
| PATCH | `/principals/:id/toggle/` | Toggle principal active |
| PATCH | `/principals/:id/block/` | Block/unblock principal |

### Shared (any authenticated role)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/dashboard/` | Dashboard overview data |
| GET | `/grade-alerts/` | Grade alerts/notifications |
| GET | `/profile/` | Get own profile |
| PATCH | `/profile/` | Update own profile |
| POST | `/change-password/` | Change own password |
| GET | `/admin-settings/` | Get admin settings |
| PATCH | `/admin-settings/` | Update admin settings |

---

## School (`/api/`)

All endpoints require `authenticated` + `schoolScope` (auto-scoped to user's school).

### Public
| Method | Path | Description |
|--------|------|-------------|
| GET | `/check-school-name/` | Check if school name is available |

### School Info
| Method | Path | Description |
|--------|------|-------------|
| GET | `/school/info/` | Get school profile |
| POST | `/school/info/` | Update school info (multipart badge) |

### Students
| Method | Path | Description |
|--------|------|-------------|
| GET | `/school/students/` | List students |
| POST | `/school/students/` | Create student |
| PUT | `/school/students/:id/` | Update student |
| GET | `/school/students/next-admission-number/` | Get next admission number |
| GET | `/school/student-stats/` | Student statistics |

### Teachers
| Method | Path | Description |
|--------|------|-------------|
| GET | `/school/teachers/` | List teachers |
| POST | `/school/teachers/` | Create teacher |
| PUT | `/school/teachers/:id/` | Update teacher |
| GET | `/school/teacher-stats/` | Teacher statistics |

### Classes
| Method | Path | Description |
|--------|------|-------------|
| GET | `/school/classes/` | List classes |
| GET | `/school/classes/:id/` | Get class by ID |
| POST | `/school/classes/` | Create class |
| PUT | `/school/classes/:id/` | Update class |
| DELETE | `/school/classes/:id/` | Delete class |
| POST | `/school/classes/bulk-create/` | Bulk create classes |
| POST | `/school/classes/:id/assign-students/` | Assign students to class |
| POST | `/school/classes/:id/assign-subjects/` | Assign subjects to class |

### Subjects
| Method | Path | Description |
|--------|------|-------------|
| GET | `/school/subjects/` | List subjects |
| POST | `/school/subjects/` | Create subject |
| PUT | `/school/subjects/:id/` | Update subject |
| DELETE | `/school/subjects/:id/` | Delete subject |
| POST | `/school/subjects/:id/assign-classes/` | Assign classes to subject |
| POST | `/school/subjects/:id/assign-teachers/` | Assign teachers to subject |

### Academic
| Method | Path | Description |
|--------|------|-------------|
| GET | `/school/context/` | Get school academic context |
| GET | `/school/academic-years/` | List academic years |
| POST | `/school/academic-years/` | Create academic year |
| GET | `/school/terms/` | List terms |
| POST | `/school/terms/` | Create term |
| PUT | `/school/terms/:id/` | Update term |
| DELETE | `/school/terms/:id/` | Delete term |

### Syllabus
| Method | Path | Description |
|--------|------|-------------|
| GET | `/school/syllabus-topics/` | List syllabus topics |
| POST | `/school/syllabus-topics/` | Create topic |
| PUT | `/school/syllabus-topics/:id/` | Update topic |
| DELETE | `/school/syllabus-topics/:id/` | Delete topic |
| GET | `/school/syllabus-stats/` | Syllabus statistics |
| POST | `/school/syllabus/generate/` | Generate syllabus from document (multipart PDF/DOCX) |

### Grades
| Method | Path | Description |
|--------|------|-------------|
| GET | `/school/grades/` | List grades |
| POST | `/school/grades/` | Save grades |

### Attendance
| Method | Path | Description |
|--------|------|-------------|
| POST | `/school/attendance/` | Record attendance |

### Grading Scheme
| Method | Path | Description |
|--------|------|-------------|
| GET | `/school/grading-scheme/` | Get grading scheme |
| POST | `/school/grading-scheme/` | Set grading scheme |

### Rooms
| Method | Path | Description |
|--------|------|-------------|
| GET | `/school/rooms/` | List rooms |
| POST | `/school/rooms/` | Create room |

### Exams
| Method | Path | Description |
|--------|------|-------------|
| GET | `/school/exams/` | List exams |
| POST | `/school/exams/` | Create exam |

### Notifications
| Method | Path | Description |
|--------|------|-------------|
| GET | `/school/notifications/` | List notifications |
| POST | `/school/notifications/` | Create notification |

### Analytics
| Method | Path | Description |
|--------|------|-------------|
| GET | `/school/analytics/` | School analytics data |

### Finance
| Method | Path | Description |
|--------|------|-------------|
| GET | `/school/finance/stats/` | Finance stats summary |
| GET | `/school/finance/fees/` | List fee structures |
| GET | `/school/finance/expenses/` | List expenses |
| POST | `/school/finance/expenses/` | Record expense |

### Teacher Assignments
| Method | Path | Description |
|--------|------|-------------|
| GET | `/school/teacher-assignments/` | List teacher assignments |
| POST | `/school/teacher-assignments/` | Create assignment |

### Exam Officers
| Method | Path | Description |
|--------|------|-------------|
| GET | `/school/exam-officers/` | List exam officers |
| POST | `/school/exam-officers/` | Assign exam officer |

### Messages
| Method | Path | Description |
|--------|------|-------------|
| GET | `/school/messages/` | List messages |
| POST | `/school/messages/` | Send message |
| POST | `/school/attendance/class/` | Record class attendance |

### Parents (school admin)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/school/parents/` | Create parent |

### Principal Users
| Method | Path | Description |
|--------|------|-------------|
| GET | `/school/principal-users/` | List principal accounts |
| POST | `/school/principal-users/` | Create principal user |
| PUT | `/school/principal-users/:id/` | Update principal user |

### Finance Users
| Method | Path | Description |
|--------|------|-------------|
| GET | `/school/finance-users/` | List finance users |
| POST | `/school/finance-users/` | Create finance user |
| PUT | `/school/finance-users/:id/` | Update finance user |

### Timetable
| Method | Path | Description |
|--------|------|-------------|
| POST | `/school/timetable/generate/` | Generate timetable |
| DELETE | `/school/timetable/` | Delete timetable |

### Modification Requests
| Method | Path | Description |
|--------|------|-------------|
| POST | `/school/modification-requests/review/` | Review a grade modification request |

---

## Student (`/api/`)

All require `authenticated`.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/student/profile/` | Get own profile |
| PATCH | `/student/profile/` | Update profile |
| GET | `/student/grades/` | Get own grades |
| GET | `/student/attendance/` | Get own attendance |
| GET | `/student/timetable/` | Get own timetable |
| GET | `/student/classes/` | Get enrolled classes |
| GET | `/student/subjects/` | Get enrolled subjects |
| GET | `/student/assignments/` | List assignments |
| GET | `/student/assignments/:id/` | Get assignment detail |
| POST | `/student/assignments/:id/submit/` | Submit assignment |
| GET | `/student/fees/` | Get fee statements |
| GET | `/student/payments/` | Get payment history |
| GET | `/student/report-cards/` | Get report cards |
| GET | `/student/notifications/` | List notifications |
| PUT | `/student/notifications/:id/read/` | Mark notification read |
| GET | `/student/messages/` | List messages |
| POST | `/student/messages/` | Send message |
| GET | `/student/exams/` | List exams |
| GET | `/student/exam-timetable/` | Exam schedule |
| GET | `/student/study-groups/` | Study groups |
| POST | `/student/study-groups/:id/join/` | Join study group |
| GET | `/student/study-plans/` | Study plans |
| POST | `/student/study-plans/` | Create study plan |
| GET | `/student/goals/` | Goals |
| POST | `/student/goals/` | Create goal |
| GET | `/student/learning-resources/` | Learning resources |
| GET | `/student/office-hours/` | Office hours |
| POST | `/student/office-hours/:id/book/` | Book office hour slot |
| GET | `/student/live-classes/` | Live/virtual classes |
| GET | `/student/peer-reviews/` | Peer reviews |
| POST | `/student/peer-reviews/` | Submit peer review |
| GET | `/student/behaviour/` | Behaviour records |
| GET | `/student/documents/` | Documents |
| GET | `/student/transcript-requests/` | Transcript requests |
| POST | `/student/transcript-requests/` | Request transcript |
| GET | `/student/security-logs/` | Security audit for own account |
| GET | `/student/channel-preferences/` | Notification preferences |
| PUT | `/student/channel-preferences/` | Update preferences |
| GET | `/student/whistleblower/categories/` | Whistleblower categories |
| POST | `/student/whistleblower/reports/` | Submit whistleblower report |

---

## Parent (`/api/`)

All require `authenticated`.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/parent/children/` | List linked children |
| GET | `/parent/children/:id/grades/` | Child's grades |
| GET | `/parent/children/:id/attendance/` | Child's attendance |
| GET | `/parent/children/:id/report-cards/` | Child's report cards |
| GET | `/parent/children/:id/fees/` | Child's fees |
| GET | `/parent/children/:id/behaviour/` | Child's behaviour records |
| GET | `/parent/children/:id/timetable/` | Child's timetable |
| GET | `/parent/notifications/` | List notifications |
| PUT | `/parent/notifications/:id/read/` | Mark notification read |
| GET | `/parent/messages/` | Messages |
| POST | `/parent/messages/` | Send message |
| GET | `/parent/payments/` | Payment history |
| POST | `/parent/payments/` | Make payment |
| GET | `/parent/fees/` | Fee structures |
| GET | `/parent/permission-slips/` | Permission slips |
| POST | `/parent/permission-slips/:id/sign/` | Sign permission slip |
| GET | `/parent/conference-slots/` | Parent-teacher conference slots |
| POST | `/parent/conference-slots/:id/book/` | Book conference slot |
| GET | `/parent/pickup-persons/` | Pickup persons |
| POST | `/parent/pickup-persons/` | Add pickup person |
| GET | `/parent/donations/` | Donations |
| POST | `/parent/donations/` | Make donation |
| GET | `/parent/acknowledgments/` | Acknowledgments |
| POST | `/parent/acknowledgments/` | Acknowledge receipt |
| GET | `/parent/co-guardians/` | Co-guardians |
| POST | `/parent/co-guardians/` | Add co-guardian |
| GET | `/parent/security-logs/` | Security audit |
| GET | `/parent/channel-preferences/` | Notification preferences |
| PUT | `/parent/channel-preferences/` | Update preferences |
| GET | `/parent/whistleblower/categories/` | Whistleblower categories |
| POST | `/parent/whistleblower/reports/` | Submit report |

---

## Teacher (`/api/`)

All require `authenticated`.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/teacher/profile/` | Get profile |
| PATCH | `/teacher/profile/` | Update profile |
| GET | `/teacher/classes/` | List assigned classes |
| GET | `/teacher/classes/:id/students/` | Students in a class |
| GET | `/teacher/subjects/` | List assigned subjects |
| GET | `/teacher/grades/` | Grades (filterable) |
| POST | `/teacher/grades/save/` | Save/update grades |
| POST | `/teacher/grades/submit/` | Submit grades for approval |
| GET | `/teacher/grade-history/` | Grade change history |
| GET | `/teacher/attendance/` | Attendance records |
| POST | `/teacher/attendance/` | Record attendance |
| GET | `/teacher/assignments/` | Assignments |
| POST | `/teacher/assignments/` | Create assignment |
| PUT | `/teacher/assignments/:id/` | Update assignment |
| DELETE | `/teacher/assignments/:id/` | Delete assignment |
| GET | `/teacher/assignments/:id/submissions/` | View submissions |
| POST | `/teacher/assignments/:id/grade/` | Grade submission |
| GET | `/teacher/exams/` | Exams |
| POST | `/teacher/exams/` | Create exam |
| GET | `/teacher/exam-duties/` | Exam duty roster |
| GET | `/teacher/lesson-plans/` | Lesson plans |
| POST | `/teacher/lesson-plans/` | Create lesson plan |
| PUT | `/teacher/lesson-plans/:id/` | Update lesson plan |
| DELETE | `/teacher/lesson-plans/:id/` | Delete lesson plan |
| GET | `/teacher/learning-resources/` | Learning resources |
| POST | `/teacher/learning-resources/` | Upload resource |
| DELETE | `/teacher/learning-resources/:id/` | Delete resource |
| GET | `/teacher/office-hours/` | Office hours |
| POST | `/teacher/office-hours/` | Set office hours |
| DELETE | `/teacher/office-hours/:id/` | Remove slot |
| GET | `/teacher/office-hours/:id/bookings/` | View bookings |
| GET | `/teacher/live-classes/` | Live classes |
| POST | `/teacher/live-classes/` | Create live class |
| DELETE | `/teacher/live-classes/:id/` | End live class |
| GET | `/teacher/behaviour/` | Behaviour incidents |
| POST | `/teacher/behaviour/` | Report incident |
| GET | `/teacher/notifications/` | Notifications |
| PUT | `/teacher/notifications/:id/read/` | Mark read |
| GET | `/teacher/messages/` | Messages |
| POST | `/teacher/messages/` | Send message |
| GET | `/teacher/modification-requests/` | Grade modification requests |
| POST | `/teacher/modification-requests/` | Request modification |
| GET | `/teacher/peer-reviews/` | Peer reviews |
| POST | `/teacher/peer-reviews/` | Submit peer review |
| GET | `/teacher/spotlight-students/` | Spotlight students |
| POST | `/teacher/spotlight-students/` | Add spotlight |
| DELETE | `/teacher/spotlight-students/:id/` | Remove spotlight |
| GET | `/teacher/security-logs/` | Security audit |
| GET | `/teacher/channel-preferences/` | Notification prefs |
| PUT | `/teacher/channel-preferences/` | Update prefs |
| GET | `/teacher/whistleblower/categories/` | Whistleblower categories |
| POST | `/teacher/whistleblower/reports/` | Submit report |
| GET | `/teacher/timetable/` | Timetable |
| GET | `/teacher/syllabus-topics/` | Syllabus topics |
| POST | `/teacher/syllabus-topics/` | Create topic |
| PUT | `/teacher/syllabus-topics/:id/` | Update topic |
| DELETE | `/teacher/syllabus-topics/:id/` | Delete topic |
| GET | `/teacher/syllabus-progress/` | Syllabus progress |
| GET | `/teacher/grading-scheme/` | Grading scheme |
| GET | `/teacher/class-analytics/` | Class analytics |
| GET | `/teacher/teacher-stats/` | Teacher dashboard stats |

---

## Finance (`/api/`)

All require `authenticated`.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/finance/dashboard/` | Finance dashboard summary |
| GET | `/finance/fee-categories/` | List fee categories |
| POST | `/finance/fee-categories/` | Create fee category |
| PUT | `/finance/fee-categories/:id/` | Update category |
| DELETE | `/finance/fee-categories/:id/` | Delete category |
| GET | `/finance/fees/` | List fee structures |
| POST | `/finance/fees/` | Create fee |
| PUT | `/finance/fees/:id/` | Update fee |
| DELETE | `/finance/fees/:id/` | Delete fee |
| GET | `/finance/payments/` | List payments |
| POST | `/finance/payments/` | Record payment |
| GET | `/finance/payments/:id/` | Payment detail |
| GET | `/finance/expenses/` | List expenses |
| POST | `/finance/expenses/` | Record expense |
| PUT | `/finance/expenses/:id/` | Update expense |
| DELETE | `/finance/expenses/:id/` | Delete expense |
| GET | `/finance/reports/` | Financial reports |
| GET | `/finance/students/:id/fees/` | Student's fee statement |
| GET | `/finance/transactions/` | All transactions |
| GET | `/finance/receipt/:id/` | Generate receipt |
| GET | `/finance/stats/` | Quick stats |

---

## Approval (`/api/`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/approval/schools/pending/` | superadmin | List pending school approvals |
| POST | `/approval/schools/:id/approve/` | superadmin | Approve school |
| POST | `/approval/schools/:id/reject/` | superadmin | Reject school |
| POST | `/approval/schools/:id/request-changes/` | superadmin | Request changes from school |
| GET | `/approval/schools/:id/history/` | superadmin | Approval history |

---

## Principal (`/api/`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/principal/grades/pending/` | principal | Pending grade approvals |
| POST | `/principal/grades/:id/approve/` | principal | Approve grade |
| POST | `/principal/grades/:id/reject/` | principal | Reject grade |
| GET | `/principal/report-cards/pending/` | principal | Pending report card approvals |
| POST | `/principal/report-cards/:id/approve/` | principal | Approve report card |
| POST | `/principal/report-cards/:id/reject/` | principal | Reject report card |

---

## Live Classes (`/api/`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/live-classes/` | authenticated | List live classes |
| POST | `/live-classes/` | teacher | Create live class |
| POST | `/live-classes/:id/join/` | authenticated | Join live class |
| POST | `/live-classes/:id/end/` | teacher | End live class |

---

## Whistleblower (`/api/`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/whistleblower/categories/` | authenticated | List categories |
| POST | `/whistleblower/reports/` | authenticated | Submit anonymous report |
| GET | `/whistleblower/reports/:id/` | authenticated | View own report status |

---

## Registration (`/api/`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/registration/register-school/` | none | Initial school registration |
| POST | `/registration/verify-email/` | none | Verify registration email |
| POST | `/registration/complete/` | none | Complete registration with payment |

---

## Teacher (`/api/`)

Also available at `/api/teacher/` — see Teacher section above.

---

## Common Response Format

**Success:**
```json
{ "success": true, "data": { ... } }
```

**Error:**
```json
{ "success": false, "message": "Error description" }
```

**List responses:**
```json
{ "success": true, "students": [...], "total": 50 }
```

**Auth error (401):**
```json
{ "success": false, "message": "Authentication required." }
```

**Permission denied (403):**
```json
{ "success": false, "message": "Access denied. Requires one of: superadmin, school_admin." }
```

---

## Role Permissions Summary

| Role | Can access |
|------|-----------|
| `superadmin` | Everything — system config, school mgmt, impersonation, security, all CRUD |
| `school_admin` | School-level classes, subjects, students, teachers, parents, finance, academics |
| `principal` | Grade approvals, report card approvals, attendance reports, syllabus progress |
| `bursar` | Fee dashboard, fee categories, payments, expenses, receipts, financial reports |
| `teacher` | Grade entry, my classes, attendance recording, lesson plans, assignments, exams |
| `student` | My grades, my attendance, my timetable, my fees, assignments, report cards |
| `parent` | Children's grades, attendance, report cards, fees, permission slips |
