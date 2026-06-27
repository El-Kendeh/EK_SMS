I'll audit the backend-school-core slice. Let me start by reading the key files.

Now let me read the schoolScope and requireRole middleware, and key controller methods.

The middleware chain looks solid. Now the critical part — let me read the controller, focusing on tenant scoping in handlers, saveGrades, reviewModificationRequest, and search for TODO_JWT_TOKEN.

Good — no TODO_JWT_TOKEN backdoor in current code, and every query is scoped via `school.id`. The `school` object is resolved somewhere. Let me find how `school` is resolved (the key tenant-scoping mechanism), and read saveGrades + reviewModificationRequest fully.

The central tenant-scoping function is `getSchoolFromUser`. Let me read it fully (lines 60-120), plus saveGrades (1449+), reviewModificationRequest (2457+), and the grades-related logic.

Let me see the top of getSchoolFromUser (lines 40-60) to understand the superadmin override path.

Now I notice: for superadmin, `req.schoolId` is set from `?school_id` in schoolScope. But `getSchoolFromUser` first tries `SchoolAdmin.findOne({ user_id })` — a superadmin has no SchoolAdmin link, so it falls to the `req.schoolId || req.user.school_id` fallback (line 72). For superadmin with `?school_id`, req.schoolId is set. Good. Now saveGrades and reviewModificationRequest.

saveGrades is tenant-guarded and audit-chained. Now reviewModificationRequest and the grade-approval interaction. Let me read 2440-2520.

Confirmed: reviewModificationRequest is a partial no-op — it flips status but does NOT apply `requested_value` to the grade nor emit a GradeEvent. This is the documented Phase 2 gap. Now let me check the FE calls that the school-admin pages make to see if any `/api/school/*` endpoint they expect is missing. The inventory lists these. Let me verify a few that aren't obviously in the route list: `/api/school/modification-requests/` (GET), `/api/school/grade-entry-status/`, `/api/school/bulk-import/`, `/api/school/users/resend-credentials/`.

Found missing endpoints. The FE calls:
- `GET /api/school/modification-requests/` (SAExtraPages.js:76) — but the route only has `/school/modification-requests/review/` (POST). No GET route → 404.
- `GET /api/school/grade-entry-status/` (SAExtraPages.js:842) — not in school.js routes.
- `POST /api/school/bulk-import/` (adminApi.js:34) — not in school.js routes.
- `POST /api/school/users/resend-credentials/` (adminApi.js:11) — not in school.js routes.

Let me confirm none of these exist anywhere in the backend routes, and check which components actually invoke them (reachability for school_admin).

Confirmed. `GET /api/school/modification-requests/` does NOT exist (only `/review/` POST and a teacher-side `/api/teacher/modification-requests/` GET). The ModRequestsPage list will always be empty (catch → `setRequests([])`). 

Now let me confirm whether ModRequestsPage and the grade-entry-status page (GradeEntryStatusPage) are reachable for school_admin. The inventory said these are "not directly on a school_admin nav key." Let me check the render map and whether `review/` POST sends `reason` but the controller reads `comment`.

The review handler reads `req.body.comment`, but FE sends `reason` (SAExtraPages.js:91). Minor — comment is unused (not persisted anyway). Now let me verify the modification-requests review payload mismatch matters and check the grade-entry-status backend. Let me also confirm reachability of these two pages and check the FinanceUsersPage analytics/notifications endpoints exist.

`ModRequestsPage` and `GradeOversightPage` are exported from SAExtraPages.js but NOT referenced in SuperadminDashboard.js — so they are NOT reachable for school_admin (dead UI / unused exports, consistent with inventory note). So the missing `GET /api/school/modification-requests/` and `grade-entry-status` endpoints don't impact a reachable page. I'll note them as missing-endpoint but lower severity since the consuming pages aren't wired into the school_admin shell.

Now let me check the FinanceUsersPage / adminApi calls that ARE reachable: bulk-import and resend-credentials. Where are they invoked from? adminApi.js exports them. Let me check if any reachable school_admin component calls these.

`bulkImport` is defined but never invoked by any component (the `_deprecated` and Teachers constants are just column specs, not calls). `resendCredentials` is invoked by `ResendCredentialsButton.js`. Let me check if that button is rendered in a reachable school_admin page.

`ResendCredentialsButton` IS used in NewPages.js:2887 (a live, reachable component). So `POST /api/school/users/resend-credentials/` is a REAL reachable call — and that endpoint does NOT exist in school.js routes. Let me confirm it doesn't exist anywhere and find what NewPages.js:2887 context is (which page).

Confirmed: `POST /api/school/users/resend-credentials/` does NOT exist in the backend at all, yet it's wired to a live "Resend Credentials" button on a teacher card inside NewPages.js (reachable via the teachers/finance-users module). This is a real missing-endpoint bug — clicking the button will 404.

Let me verify which page mounts this teacher card and confirm the button's error handling, then check the analytics/notifications endpoints used by FinanceUsersPage exist (they're in routes — confirmed: getAnalytics, getNotifications, createNotification all routed). Let me read ResendCredentialsButton fully.

Confirmed the resend-credentials missing endpoint. The button has error handling (catch → shows "Network error"/message), so it won't crash, but the feature is non-functional — clicking always fails. 

Now let me verify the `comment` vs `reason` mismatch in reviewModificationRequest isn't load-bearing (comment is unused in controller — confirmed at line 2471/2480-2481, only action+request_id used). Let me do a final check on createStudent/createTeacher tenant scoping (they create User accounts — verify school_id pinned, not client). Read createStudent and createTeacher.

createStudent pins `school_id: school.id` from the resolved school, not client. But note `classroom_id: data.classroom_id` and `academic_year_id: data.academic_year_id` are taken from the client without validating they belong to this school. Unlike createTeacherAssignment (which validates class/subject/teacher belong to school at lines 2016-2018) and saveGrades (validates student), createStudent does NOT validate classroom_id/academic_year_id belong to the school. A school admin could assign a student to another school's classroom_id. This is a data-integrity / weak cross-tenant FK issue. Let me confirm createStudent has no such validation by reading on, and check createParent's link-parent scoping briefly.

Confirmed — createStudent never validates `classroom_id`/`academic_year_id` belong to the school. This is a real (low-medium) cross-tenant FK gap, though impact is limited (the student row itself is correctly scoped to school.id; only the FK pointer could reference a foreign class). 

I now have enough verified findings. The slice is largely well-secured (role gate via schoolWriteGuard, tenant scoping via getSchoolFromUser pinning school.id, no TODO_JWT_TOKEN backdoor, saveGrades tenant-guarded + audit-chained). The real issues are: the resend-credentials missing endpoint (reachable, non-functional), reviewModificationRequest partial no-op, two missing endpoints behind unreachable pages, and the createStudent FK validation gap. Let me record findings.

The schema requires `findings` at the unit level. I provided it but the error suggests a structure issue. Let me re-call with the exact required shape.

The error persists despite `findings` being present. The likely cause is a JSON parse failure inside the `findings` string (an unescaped character making the whole property invalid). Let me simplify and remove any problematic characters, keeping the structure minimal and clean.

The error mentions only `findings` as missing at root. The schema lists required `["unit","findings","summary"]`. Possibly the validator is rejecting because one finding object is missing a required property. Each finding requires: id, title, category, severity, page, component, evidence, userImpact, suggestedFix. All present. Let me test with a minimal single-finding payload to isolate whether the issue is structural.

