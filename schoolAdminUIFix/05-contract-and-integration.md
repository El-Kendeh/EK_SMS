# 05 — Contract & Integration

How the live frontend talks to the backend, where they disagree, and how auth flows end-to-end.

---

## 5.1 Three API surfaces (one of which is imaginary)

| Surface | Mounted? | Role gate | Tenant scope | Who calls it |
|---------|----------|-----------|--------------|--------------|
| **A. `/api/*` (superadmin router, `sla`)** | ✅ yes | ✅ `requireRole(['superadmin','school_admin'])` | ✅ `scopedSchoolId` | **Live** `superadmin/SA*` pages (students/teachers/classes/subjects/parents/principals/bursars) |
| **B. `/api/school/*` (school router)** | ✅ yes | ❌ none (doc 02 #2) | ⚠️ `getSchoolFromUser` (works, no role gate) | **Live** add-on pages (timetable/grading/exams/rooms/etc.) **+** dead `schooladmin/` pages |
| **C. `/api/school/students…/parents…` etc.** | ❌ **does not exist** | — | — | **Dead** `schooladmin/` pages only |

Surface A is the secure one. Surface B works but is unauthenticated-by-role. Surface C is what the dead pages call — pure 404s.

---

## 5.2 FE calls to endpoints that don't exist (404 risk)

Cross-checked against [school.js](../backend_node/src/routes/school.js). Split by whether the calling page is live.

### On LIVE pages (real user-facing breaks) — see doc 03 §3.2
- `POST /api/school/students/:id/promote/` — StudentPromotionPage
- `POST /api/school/ai-capture/`, `GET /api/school/ai-capture/list/`, `POST /api/school/bulk-import/`, `POST /api/school/users/resend-credentials/` — AIDocumentCapture / adminApi
- `GET|POST /api/school/exams/:id/results/`, `DELETE /api/school/exams/:id/` — ExamsPage
- `PUT|DELETE /api/school/rooms/:id/` — RoomsPage
- `DELETE /api/school/teacher-assignments/:id/` — TeacherAssignmentsPage

### On DEAD pages (moot unless revived) — full list in doc 04
- `GET /api/school/parents/?q=`, `GET /api/school/students/:id/`, `GET /api/school/students/check-duplicate/`, the whole `/api/school/students/:id/parents/` family, `PUT /api/school/finance/fees/:id/`, `PUT /api/school/academic-years/:id/`, `DELETE /api/school/students/:id/`, `GET /api/school/grade-entry-status/`, `PUT /api/school/notifications/:id/read/` …

### Permission mismatch (403, not 404)
- `GET /api/security-logs/`, `GET /api/security-counters/` are **superadmin-only**, but the dead `SchoolAdminPages` Security page calls them. Would 403 if it were ever mounted. Keep them superadmin-only; never wire that page.

---

## 5.3 Orphaned backend endpoints (exist, nothing live calls them)

- `GET /api/school/context/`, `GET /api/school/syllabus-stats/`, `POST /api/school/attendance/class/`
- The entire `/api/school/finance/*` set (`stats`, `fees`, `expenses`) — only the **dead** `SchoolAdminPages` Finance pages used it; the live finance UI uses `/api/finance/*` (bursar pages).

These can be removed if the dead pages are deleted, or kept if you plan to build school-admin finance.

---

## 5.4 Field / method mismatches `[agent, cross-checked]`

- **Notifications read-marking:** FE calls `PUT /api/school/notifications/:id/read/` (NewPages) and `POST .../read/` (teacherApi) — backend exposes only `POST /api/school/notifications/` (`createNotification`). Both client paths 404. (Dead-page context.)
- **Finance payment field:** dead pages `PUT { amount_paid }` to a non-existent fee route; the real contract is `POST /api/finance/payments/ { student_id, amount, fee_id }`.
- **Trailing slashes:** all school/superadmin routes require a trailing slash; the live FE consistently includes it. No slash-mismatch 404s on live pages.

---

## 5.5 End-to-end auth & enforcement trace `[verified]`

**Token attach** — [client.js](../src/api/client.js): `Authorization: Bearer <localStorage.token>`. (Note: `teacherApi.js`/`adminApi.js` bypass `ApiClient` and use raw `fetch` with their own header. The live `SA*` pages also use their own inline `fetch` helper against `NODE_URL`/`API` — they do **not** go through `ApiClient`.)

**Superadmin school-scope injection** — `client.js` auto-appends `?school_id=` from `sessionStorage` for `/principal|/finance|/school/` paths. The backend honors it only for superadmin ([schoolScope.js:7](../backend_node/src/middleware/schoolScope.js#L7)) — harmless for school_admin. **Caveat:** the live `SA*` pages bypass `ApiClient`, so they never get this injection; for a superadmin those pages rely on the form's school dropdown instead (the school-scoped list handlers return "Select a school" until `?school_id` is passed). For a **school_admin** this is all correct (server pins to their school).

**401/403 handling** — `client.js` clears auth + redirects to login only when the error message matches an auth/token regex. **Gap:** a plain `403 "Access denied"` (no `auth`/`token`/`csrf` words) is thrown as a generic error and does **not** log the user out — opaque failure.

**Approval enforcement** — see [02-security-and-risks.md](02-security-and-risks.md) "Approval gate" section. Summary: enforced at **login only** + a **cosmetic** DashboardGate; **not** re-checked per request. This is the gap relative to the product rule "school admin gets access only after super admin confirms."

**Backdoor** — `TODO_JWT_TOKEN` (doc 02 #1). The FE never sends it (grep-confirmed), but it's a live server-side bypass.

---

## 5.6 Integration risk ranking

1. 🔴 `TODO_JWT_TOKEN` backdoor (doc 02 #1).
2. 🔴 No role/approval enforcement on `/api/school/*` (doc 02 #2 + approval gate).
3. 🟠 Live pages calling missing endpoints (§5.2) — visible "save did nothing" failures.
4. 🟠 Two divergent people-CRUD contracts (A vs C) — a colleague reviving dead pages hits 404s.
5. 🟡 `403` doesn't clear auth (§5.5) — confusing role-denied UX.
6. 🟡 No dedicated school-admin nav → stub items shown (doc 01).
