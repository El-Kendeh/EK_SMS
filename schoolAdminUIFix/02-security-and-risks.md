# 02 — Security & Risks (Backend)

Every item re-verified by direct source read unless marked `[agent]`. Ordered by severity.

---

## 🔴 CRITICAL #1 — Unconditional auth backdoor

**File:** [auth.js:26-31](../backend_node/src/middleware/auth.js#L26) `[verified]`

```js
if (token === 'TODO_JWT_TOKEN' || token === 'TODO_REAL_JWT_TOKEN') {
  req.user = { id: 1, username: 'admin', is_superuser: true };
  return next();
}
```

Any request whose bearer token is the literal string `TODO_JWT_TOKEN` is authenticated as **superuser id 1**, on every `authenticateToken`-protected route. There is **no `NODE_ENV` guard** despite the "development" comment. The frontend never sends this string (so it's dormant in normal use), but it is a live, internet-reachable auth bypass in production.

**Fix:** delete the block, or gate it behind `if (process.env.NODE_ENV !== 'production' && ...)`. Recommended: delete it.

---

## 🔴 CRITICAL #2 — No role enforcement on `/api/school/*`

**File:** [school.js:134](../backend_node/src/routes/school.js#L134) `[verified]`

```js
const applyAuth = [authenticateToken, schoolScope];   // requireRole is NEVER added
```

`requireRole` middleware exists ([requireRole.js](../backend_node/src/middleware/requireRole.js)) but is not imported in `school.js`, and **no handler in `schoolController.js` re-checks `req.user.role`** (grep: zero role checks). [schoolScope.js:3](../backend_node/src/middleware/schoolScope.js#L3) sets `req.schoolId = req.user.school_id` for *any* non-superadmin with a school_id. So **any authenticated tenant user — student, parent, teacher — can call admin write endpoints scoped to their own school.**

Escalation examples (all reachable by a student's token):

| Handler | Route | Impact | Evidence |
|---------|-------|--------|----------|
| `createPrincipalUser` | `POST /api/school/principal-users/` | Mint a privileged admin account | principalController.js:359 |
| `createFinanceUser` | `POST /api/school/finance-users/` | Mint a bursar account | financeController.js:580 |
| `updatePrincipalUser` | `PUT /api/school/principal-users/:id/` | Flip is_active / change role / email | principalController.js:396 |
| `saveGrades` | `POST /api/school/grades/` | Write/overwrite grades (see #3) | schoolController.js:1460 |
| `setGradingScheme` | `POST /api/school/grading-scheme/` | Change pass marks school-wide | schoolController.js:1528 |
| `reviewModificationRequest` | `POST /api/school/modification-requests/review/` | Approve grade changes (see #4) | schoolController.js:2204 |
| `generateTimetable`/`deleteTimetable` | `/api/school/timetable/*` | Destroy/rebuild all slots | schoolController.js:2104 |
| `recordExpense` | `POST /api/school/finance/expenses/` | Self-approved expense | schoolController.js:1714 |
| full student/teacher/class/subject CRUD | `/api/school/*` | Create/edit/delete records | schoolController.js (many) |

> This is **vertical** privilege escalation (within the caller's own tenant), not cross-tenant — `getSchoolFromUser` still scopes data to the caller's school. But it lets a low-privilege user act as an admin.

**Fix (one place):**
```js
const requireRole = require('../middleware/requireRole');
const applyAuth = [authenticateToken, requireRole(['school_admin','superadmin']), schoolScope];
```
(Some routes legitimately need principal/bursar too, e.g. timetable/grading — widen the role list per-route where intended.)

---

## 🔴/🟠 CRITICAL FOR THE PRODUCT REQUIREMENT — Approval gate is not enforced server-side

> **Product rule (from the owner):** a School Admin must get access **only after** the Super Admin confirms/approves their school.

**Current implementation vs the rule:**

| Layer | What it does | Gap |
|-------|--------------|-----|
| Registration | School admin signs up in a `pending` state | — |
| **Login** | [authController](../backend_node/src/controllers/authController.js) blocks `!is_active` non-superusers with 403 | ✅ enforces approval **at login time only** |
| **DashboardGate** | [DashboardGate.js:18-78](../src/components/DashboardGate.js#L18) calls `/api/registration/check-status` and shows a modal if not approved | ⚠️ **UI-only / cosmetic** — it does not stop API calls |
| **Per-request (API)** | [auth.js](../backend_node/src/middleware/auth.js) verifies the JWT and sets `req.user`; **never checks `is_active`/approval** | ❌ **no per-request approval check** |

**The gap:** approval is checked when the token is *minted* (login), but the token itself is not re-validated against current approval status on subsequent requests, and there is **no token revocation**. So:

- A school admin who was approved, logged in, and is **later suspended/rejected** keeps full API access until their token expires.
- Any still-valid token reaches `/api/school/*` and the `sla` `/api/students…` routes regardless of the school's *current* approval state. The DashboardGate modal hides the UI but the endpoints still answer.

**Fix to truly honor the rule:** re-check approval/`is_active` per request. Either:
1. In `authenticateToken`, after verifying the JWT, look up the user/school and reject if not active/approved (adds a DB read per request — cache it), **or**
2. Add a lightweight `requireApprovedSchool` middleware to the protected routers that checks a cached approval flag, **or**
3. Use short-TTL tokens + a revocation list so suspension takes effect quickly.

This is the security control that actually implements "access only after Super Admin confirms" — today it's only half-implemented (login + cosmetic UI).

---

## 🟠 HIGH #3 — `saveGrades` is an unaudited grade side-door

**File:** [schoolController.js:1460](../backend_node/src/controllers/schoolController.js#L1460) `[verified]`

```js
const saved = await Promise.all(grades.map(g =>
  Grade.upsert({ school_id: school.id, student_id: g.student_id, subject_id, term_id,
                 ca: g.ca, midterm: g.midterm, final: g.final },
               { conflictFields: ['school_id','student_id','subject_id','term_id'] })));
```

Problems:
- **No `appendGradeEvent`** — the SHA-256 tamper-evidence chain ([utils/gradeEvent.js](../backend_node/src/utils/gradeEvent.js)), used correctly by `teacherController`/`principalController`, is **skipped**. Grades written here leave no audit trail and create a silent gap in the chain.
- **No `approval_status`** — rows default to `pending` but are written directly, sidestepping the teacher-submits → principal-approves workflow.
- **`student_id` trusted from the body** — no check it belongs to `school.id` (cross-tenant write/poisoning).
- **No value validation** — `ca/midterm/final` unbounded; `total`/`grade_letter` never computed, so `getAnalytics` avg (schoolController.js:1659) reads a `total` this path never sets.

**Verdict:** grade integrity is genuinely implemented elsewhere but **not enforced** — this endpoint defeats it. Combined with #2, anyone in the tenant can drive it.

**Fix:** route writes through `appendGradeEvent` + approval state, validate `student_id ∈ school`, validate score ranges — or remove the endpoint and force grades through the teacher/principal pipeline.

---

## 🟠 HIGH #4 — "Approve modification request" applies nothing

**File:** [schoolController.js:2204-2217](../backend_node/src/controllers/schoolController.js#L2204) `[verified]`

```js
const newStatus = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : modRequest.status;
await modRequest.update({ status: newStatus, reviewed_by: req.user.id, reviewed_at: new Date() });
```

It flips `status` but **never applies `requested_value` to the target grade/record** and emits no GradeEvent. The `ModificationRequest` model carries `grade_id`/`current_value`/`requested_value`, so the apply step is simply missing. Approving a grade-change request is a **cosmetic state flip** — a false sense of governance.

**Fix:** on approve, apply `requested_value` to the referenced grade via `appendGradeEvent`; on reject, record the reason. Or hide the review UI until implemented.

---

## 🟠 MED-HIGH #5 — `syllabusGenerator`: no tenant scope + committed secret

**File:** [syllabusGenerator.js:7](../backend_node/src/controllers/syllabusGenerator.js#L7) `[verified]`

```js
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyAkxhYIreiQ5XQxNHFXMqxtu_p8s3wNvVQ';
```

- A **live Gemini API key is committed in source** as a fallback — secret exposure + lets the endpoint run with no env configured.
- The handler **never calls `getSchoolFromUser` or reads `req.schoolId`** — zero tenant scoping. Combined with #2, anyone authenticated can run it for any `subject_id`/`class_id`, burning quota.
- `JSON.parse`s raw model output inside the try → malformed output → 500 with raw `err.message`.

**Fix:** remove the hardcoded key and rotate it; add school scoping; validate inputs.

---

## 🟡 MEDIUM — Cross-tenant trust via unvalidated foreign keys `[agent, cross-checked]`

Besides `saveGrades`, these accept FKs from the request without confirming they belong to the caller's school:
- `recordAttendance` (schoolController.js ~1493): `student_id`, `classroom_id` from body.
- `createTeacherAssignment` (~1779): `class_id`, `subject_id`, `teacher_id`.
- `assignTeachersToSubject` / `assignClassesToSubject` (~1246): the parent is scoped, but the supplied IDs are not.
- `sendMessage` role-targeting (~1991): `User.findAll` with **no `school_id` filter** selects users of a role across **all** schools, then notifies under the caller's school_id.

**Fix:** validate every inbound FK against `school.id` before writing.

---

## 🟡 MEDIUM — Other backend issues `[agent, cross-checked]`

- **`recordExpense` self-approves** (schoolController.js:1714): hardcodes `status:'approved', approved_by:req.user.id` — no approval workflow.
- **Raw error leakage**: many handlers return `errorResponse(\`...: ${err.message}\`)` exposing SQL/stack text (e.g. bulkCreateClasses:1008).
- **Mass-assignment**: `createStudent`/`updateStudent` push dozens of `req.body` fields with ad-hoc coercion; `vaccinations: data.vaccinations || {}` writes an arbitrary client object into the column.
- **`getNextAdmissionNumber`** derives "next" from the global PK (`lastStudent.id + 1`) — wrong per-school and racy.
- **Duplicate dead handler definitions** (`getExamOfficers`/`assignExamOfficer`/`getMessages`/`sendMessage` defined twice; JS keeps the last) — copy-paste rot; the dead `sendMessage` even queries a non-existent `role` column.
- **Fire-and-forget email** (`sendTeacherWelcomeEmail`, ~556) is unawaited with no `.catch` → possible unhandled rejection.

---

## 🟢 VERIFIED-SAFE — Live people-management surface

> This **confirms the fix recorded on 2026-06-23**: the earlier "bursars/principals PII leak" and "class/subject IDOR" findings are now closed (`scopedSchoolId` + `denyCrossTenant`). I re-verified the current source — the live surface is correctly isolated. Do not "re-fix" it.

**Role gate** — [superadmin.js:223](../backend_node/src/routes/superadmin.js#L223) `[verified]`:
```js
const sla = requireRole(['superadmin', 'school_admin']);
router.get('/students/', sla, data.getSuperStudents);   // ...teachers, parents, principals, bursars same
```

**Tenant scope** — [superadminDataController.js:55](../backend_node/src/controllers/superadminDataController.js#L55) `[verified]`:
```js
function scopedSchoolId(req) {
  if (req.user?.role === 'superadmin') return null;          // superadmin: unscoped (must pass ?school_id)
  const sid = req.schoolId || req.user?.school_id;
  const parsed = parseInt(sid, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : -1; // school-less caller → -1 → matches nothing
}
```

The list handlers apply it (verified in `getSuperStudents`:2913, `getSuperBursars`:3625, `getSuperPrincipals`:3777):
```js
const forcedSchool = scopedSchoolId(req);
if (forcedSchool === null && !school_id) return res.json(... 'Select a school ...');  // superadmin must scope
const where = {};
if (forcedSchool !== null) where.school_id = forcedSchool;   // school_admin pinned to own school
else if (school_id) where.school_id = school_id;
```

Per-id handlers (`update*`/`delete*`/`toggle*`/`block*`) guard with `outsideScope`/`denyCrossTenant` (403 on another school's row). **This surface — students/teachers/classes/subjects/parents/principals/bursars — is correctly isolated.** Do not "re-fix" it.

> **The security story is the asymmetry:** the refactored `/api/*` surface was secured (role + scope); the older `/api/school/*` surface was not (#2).

---

## Middleware reference

| File | Role |
|------|------|
| [auth.js](../backend_node/src/middleware/auth.js) | Verifies token → `req.user`. Has the backdoor (#1). No approval re-check (approval gate gap). |
| [requireRole.js](../backend_node/src/middleware/requireRole.js) | Role gate. **Used by `superadmin.js` (`sla`), NOT by `school.js`** (#2). |
| [schoolScope.js](../backend_node/src/middleware/schoolScope.js) | Sets `req.schoolId` from JWT (non-super) or `?school_id` (super). Sets nothing for a school-less user. |
