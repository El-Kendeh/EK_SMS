# EK-SMS Backend API Reference (Node/Express, `backend_node/src/`)

> Verified 2026-06-10 by reading all 12 route files + relevant controllers/models.
> ~487 endpoints total. Auth = `authenticateToken` middleware (Bearer token). `schoolScope` = scopes query to `req.user.school_id`.
> Endpoints most relevant to the **Principal** and **Finance/Bursar** dashboard build are given full request/response detail; the rest are summarized.

---

## `/api/principal` — `routes/principal.js` (mounted, 6 endpoints registered)

⚠️ **Only 6 of the ~15 functions available in `principalController.js` are actually routed here.** See [06-KNOWN-ISSUES.md](06-KNOWN-ISSUES.md) §1.

| Method | Path | Controller fn | Notes |
|---|---|---|---|
| GET | `/overview/` | `getOverview` (imported from **financeController**) | Returns `school.id`, `metrics.students_total`, `metrics.teachers_total`, `metrics.classrooms_total`, `metrics.pending_grade_changes`, `metrics.report_cards_pending`, `metrics.report_cards_published`, `metrics.active_term` |
| GET | `/grade-approvals/` | `listGradeApprovals` | Query: `status`, `class_id`, `term_id` (all optional). Returns `requests[]` (id, student_id, student_name, admission_number, subject_id, subject_name, subject_code, term_id, term_name, class_id, class_name, ca, midterm, final, total, grade_letter, remarks, approval_status, approved_by, approved_at, created_at) + `counts.{pending,approved,rejected}` |
| POST | `/grade-approvals/` | `reviewGradeChange` | Body: `grade_ids[]` (required), `action` (`approve`\|`reject`, required), `comment` (optional). Returns `count`, `message` |
| GET | `/report-cards/` | `listReportCards` | Returns `report_cards[]`, `term`, `term_id`, `approved_count`, `total_count` |
| POST | `/report-cards/` | `publishReportCard` | Body: `student_ids[]` (optional), `term_id` (required). Returns `published_count`, `message` |
| POST | `/report-cards/comment/` | `commentReportCard` | Body: `grade_id` (required), `comment` (required). Returns `grade_id`, `message` |

### Functions that exist in `principalController.js` but are NOT routed (need adding to `principal.js`)

These are real, working controller functions (`module.exports` confirmed at line 568 of `principalController.js`) — they're currently only reachable via `/api/finance/...` (same functions duplicated in `financeController.js`). To fix the bug in 06-KNOWN-ISSUES.md, add these routes to `principal.js`:

| Method | Path to add | Controller fn | Response fields |
|---|---|---|---|
| GET | `/dashboard/` | `getSchoolCommandDashboard` | `totalStudents`, `totalTeachers`, `totalClasses`, `avgAcademic`, `avgAttendance`, `finance`, `healthScore`, `totalGradeMods`, `totalAtRisk`, `totalFinAnom`, `totalLowAttend` |
| GET | `/class-performance/` | `getClassPerformance` | `top[]`, `low[]` — each `{ name, score, studentCount }` |
| GET | `/teacher-insights/` | `getTeacherInsights` | `overloaded`, `underperforming`, `pendingGrades`, `totalTeachers` |
| GET | `/finance-snapshot/` | `getFinanceSnapshot` | `revenue`, `outstanding`, `paymentsToday`, `transactions[]` |
| GET | `/activity-feed/` | `getActivityFeed` | `items[]` — each `{ kind, text, at }` |
| GET | `/syllabus-progress/` | `getSyllabusProgress` | `subjects[]` — each `{ name, code, pct, pending, total_topics, covered_topics }` |
| GET | `/principal-users/` | `getPrincipalUsers` | `principal_users[]` — each `{ id, full_name, email, phone, username, is_active, role, access_level, created_at }` |
| POST | `/principal-users/` | `createPrincipalUser` | Body: `full_name, email, phone, username, password, role, access_level`. Returns `id`, `message` |
| PUT | `/principal-users/:id/` | `updatePrincipalUser` | Returns `message` |

(These same 9 are also reachable today at `/api/school/principal-users/...` for the create/update/list trio — see school.js section below — and at `/api/finance/dashboard/`, `/api/finance/class-performance/` etc. for the dashboard ones.)

---

## `/api/finance` — `routes/finance.js` (mounted, 26 endpoints — full finance suite)

All endpoints `auth` only (no extra role check at router level — controller may check `req.user.role`).

| Method | Path | Controller fn | Request | Response |
|---|---|---|---|---|
| GET | `/overview/` | `getOverview` | – | `school.id`, `metrics.*` incl. `total_collected`, `total_expenses` |
| GET | `/grade-approvals/` | `listGradeApprovals` | `status`, `class_id`, `term_id` | same as principal |
| POST | `/grade-approvals/` | `reviewGradeChange` | `grade_ids[]`, `action`, `comment` | `count`, `message` |
| GET | `/report-cards/` | `listReportCards` | – | `report_cards[]`, `term`, `term_id` |
| POST | `/report-cards/` | `publishReportCard` | `student_ids[]`, `term_id` | `published_count`, `message` |
| POST | `/report-cards/comment/` | `commentReportCard` | `grade_id`, `comment` | `grade_id`, `message` |
| GET | `/dashboard/` | `getSchoolCommandDashboard` | – | same as principal dashboard |
| GET | `/class-performance/` | `getClassPerformance` | – | `top[]`, `low[]` |
| GET | `/teacher-insights/` | `getTeacherInsights` | – | `overloaded`, `underperforming`, `pendingGrades`, `totalTeachers` |
| GET | `/finance-snapshot/` | `getFinanceSnapshot` | – | `revenue`, `outstanding`, `paymentsToday`, `transactions[]` |
| GET | `/activity-feed/` | `getActivityFeed` | – | `items[]` |
| GET | `/syllabus-progress/` | `getSyllabusProgress` | – | `subjects[]` |
| GET | `/finance-users/` | `getFinanceUsers` | – | `finance_users[]` (id, full_name, email, phone, username, is_active, role, access_level, created_at) |
| POST | `/finance-users/` | `createFinanceUser` | `full_name, email, phone, username, password, role, access_level` | `id`, `message` |
| PUT | `/finance-users/:id/` | `updateFinanceUser` | – | `message` |
| GET | `/stats/` | `getFinanceStats` | – | `total_collected`, `outstanding_balance`, `expenses`, `balance`, `total_students` |
| GET | `/analytics/` | `getFinanceAnalytics` (added 2026-06-12) | `date_from?`, `date_to?` | `summary` (revenue, expenses, net, payment_count, avg_payment, largest_payment), `monthly[]` (month "YYYY-MM", revenue, expenses, payments), `methods[]` (method, total, count), `expense_categories[]` (category, total, count), `top_debtors[]` (student_id, student_name, admission_number, balance, open_fees — all-time, max 8). SQL-side GROUP BY — not subject to the 200-row ledger caps |
| GET | `/fees/` | `getFinanceFees` | `class_id?`, `status?`, `student_id?` | `fees[]` (id, student_id, student_name, admission_number, category_id, category_name, term_id, term_name, amount, discount, amount_due, amount_paid, balance, status, due_date, created_at) |
| GET | `/fee-categories/` | `getFeeCategories` | – | `categories[]` (id, school_id, name, description, amount, frequency, applicable_classes, is_active, created_at) |
| POST | `/fee-categories/` | `createFeeCategory` | `name` (req), `amount` (req), `description?`, `frequency?`, `applicable_classes[]?` | `category`, `message` |
| POST | `/fees/assign/` | `assignFees` | `fee_category_id` (req), `student_ids[]` (req), `term_id?`, `discount?` | `count`, `message` |
| POST | `/payments/` | `recordPayment` | `student_id` (req), `amount` (req), `fee_id?`, `payment_method?`, `reference?`, `notes?`, `paid_by?` | `payment` (id, amount, receipt_number, payment_hash, payment_method, paid_at), `message` |
| GET | `/payments/` | `getPayments` | `student_id?`, `date_from?`, `date_to?` | `payments[]` (id, student_id, student_name, admission_number, amount, payment_method, receipt_number, payment_hash, reference, status, notes, paid_by, paid_at) |
| GET | `/students/:student_id/fees/` | `getStudentFees` | path: `student_id` | `fees[]`, `payments[]`, `summary` (total_due, total_paid, balance) |
| POST | `/expenses/` | `recordExpense` | `description` (req), `amount` (req), `category?`, `date?`, `receipt_path?` | `expense`, `message` |
| GET | `/expenses/` | `getExpenses` | `category?`, `date_from?`, `date_to?` | `expenses[]`, `total` |

**`src/api/financeApi.js` exists (built 2026-06-11) and covers the full suite, incl. `getAnalytics(params)` for `/analytics/`.**

---

## Sequelize models for Principal/Finance (`backend_node/src/models/`)

| Model | Table | Key fields |
|---|---|---|
| `Principal.js` | `pruh_system_principal` | id, name, is_active, created_at, updated_at |
| `CorePrincipal.js` | `pruh_core_principal` | id, school_id, user_id (FK unique), employee_id, dob, gender, marital_status, nationality, state_of_origin, lga, religion, address, city, phone_number, qualification, years_experience, hire_date, contract_type, salary_grade, national_id_number, bank_name/account_number/account_name, emergency_contact_*, profile_picture, bio, must_change_password, status, is_active. `belongsTo(User)` |
| `Bursar.js` | `pruh_system_bursar` | id, name, is_active, created_at, updated_at |
| `CoreBursar.js` | `pruh_core_bursar` | same shape as CorePrincipal. `belongsTo(User)` |
| `Fee.js` | `pruh_finance_fee` | id, school_id, student_id, fee_category_id, term_id, amount, discount, amount_due, amount_paid, status, due_date, created_at |
| `FeeCategory.js` | `pruh_finance_fee_category` | id, school_id, name, description, amount, frequency, applicable_classes (JSON/TEXT), is_active, created_at |
| `Payment.js` | `pruh_finance_payment` | id, school_id, student_id, fee_id, amount, payment_method, reference, receipt_number, payment_hash, status, notes, paid_by, paid_at, created_at |
| `Expense.js` | `pruh_finance_expense` | id, school_id, category, description, amount, date, receipt_path, approved_by (FK User), status (default "approved"), created_at |
| `Donation.js` | `pruh_core_donation` | id, campaign_id, donor_id, amount, is_anonymous, receipt_hash, paid_at, created_at |
| `DonationCampaign.js` | `pruh_core_donation_campaign` | id, school_id, title, description, target_amount, current_amount, start_date, end_date, is_active, created_at |

---

## Other route files (summary — full detail available on request)

### `auth.js` (mounted at `/api`) — 5 endpoints, no auth
`POST /login/`, `POST /logout/`, `POST /register/` (file upload), `POST /send-otp/`, `POST /verify-otp/`

### `approval.js` (mounted at `/api/approval`) — superadmin only, 5 endpoints
`GET /pending-schools`, `GET /approved-schools`, `GET /school/:schoolId`, `POST /approve-school`, `POST /reject-school`

### `registration.js` — 3 endpoints
`POST /register-school-admin` (file upload, no auth), `GET /status/:schoolId` (no auth), `GET /check-status` (auth)

### `live-classes.js` (mounted at `/api/live-classes`) — 4 endpoints, auth
`GET /`, `POST /`, `PATCH /:id/`, `DELETE /:id/` → all in `studentController` (createLiveClass/updateLiveClass/deleteLiveClass/listLiveClasses)

### `whistleblower.js` (mounted at `/api/whistleblower`) — 3 endpoints, auth
`GET /categories/`, `POST /submit/`, `GET /:key/`

### `parent.js` (mounted at `/api/parent`, role:parent) — ~50 endpoints
Children & grades, report cards, attendance, behavior, fees/payments/receipts, 2FA, channel preferences, whistleblower, conferences, counsellor, teacher threads, co-guardians, pickup list, permission slips, acknowledgments, events, donations, weekly/voice digest, family activity. (Fully built — see `parentApi.ts`.)

### `student.js` (mounted at `/api/student`, role:student) — ~60 endpoints
Profile, terms, grades (+ history/peer-review/feedback/remedial/security-report/objection), attendance, notifications, timetable, assignments, messages, resources, financials, receipts, events, grade-insights, security-health, devices, 2FA, report cards, transcript, verify/tamper/access-log, channel preferences, whistleblower, goals, office-hours, counsellor, study-groups, streaks, digital-id, documents, study-plan, voice-summary, subject deep-dive, live-classes. (Fully built — see `studentApi.ts`.)

### `teacher.js` (mounted at `/api/teacher`, role:teacher) — ~65 endpoints
Profile, classes, students, gradebook (draft/lock/history), timetable, exam duties, attendance, at-risk students, analytics, modification requests, academic calendar, notifications, assignments, exams/results, announcements, messages, resources, feedback (+templates), tamper-count, access-log, channel preferences, whistleblower, office-hours, parent/student threads, behaviour incidents, substitute tokens, lesson plans, recommend-resource, counsellor-referral, workload, performance, peer-reviews, spotlight, cohort-compare, voice-digest, grade-receipts, credentials, timetable-generate, grading-scheme. (Fully built — see `teacherApi.ts`.)

### `school.js` (mounted at `/api`, schoolScope) — ~75 endpoints — **the school-admin CRUD backbone**
School info, students CRUD (+stats, next-admission-number), teachers CRUD (+stats), classes CRUD (+bulk-create, assign students/subjects), subjects CRUD (+assign classes/teachers), academic years/terms CRUD, syllabus topics CRUD (+stats, generate-from-document), grades, attendance (+class), grading-scheme, rooms, exams, notifications, analytics, finance stats/fees/expenses (legacy mirror of finance.js), teacher-assignments, exam-officers, messages, parents, **`principal-users/` CRUD** (delegates to `principalController`), **`finance-users/` CRUD** (delegates to `financeController`), timetable generate/delete, modification-request review.

> Note: `/api/school/principal-users/` and `/api/school/finance-users/` are the endpoints actually used today by `PrincipalPage.jsx` / `FinanceUsersPage.jsx` (school-admin's user-management pages) — separate from the principal/finance dashboard endpoints above.

### `superadmin.js` (mounted at `/api`) — ~150 endpoints — superadmin platform admin
Public reference data (institution-types, countries, regions, cities, academic-systems, grading-systems — no auth). Shared: dashboard, grade-alerts, profile, change-password, admin-settings. Superadmin-only: schools approve/impersonate, system-health, reset-password, security-logs/counters, forensic-events, broadcast/system alerts, branding, lockdown, manual backup, custom-roles, export, full CRUD for academic-years/system-terms/institution-types/capacity-categories/school-capacities/countries/regions/cities/school-types/syllabus-types/class-subtypes/academic-systems/grading-systems, grade-stats, school-stats, users. Superadmin|school_admin shared: classes/subjects CRUD + assignment endpoints, students/parents/teachers/bursars/principals CRUD (+toggle/block), link/unlink parent-student.
