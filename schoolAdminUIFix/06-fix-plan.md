# 06 — Fix Plan (prioritized)

> ✅ **Phases 0, 1, 2 + the safe subset of Phase 3 are IMPLEMENTED (2026-06-23)** — not yet committed. Backend verified with `node --check` + require/export tests; frontend verified with a clean `npm run build`.
> - Phase 0 + 1 details: [CHANGELOG-PHASE-0-1.md](CHANGELOG-PHASE-0-1.md)
> - Phase 2 details: [CHANGELOG-PHASE-2.md](CHANGELOG-PHASE-2.md) (2.9 was a false positive — no change; 2.3 AI-capture deferred; 2.8 done as a safe subset)
> - Phase 3 details: [CHANGELOG-PHASE-3.md](CHANGELOG-PHASE-3.md) (3.1/3.2/3.4/3.6 done; 3.3/3.5/3.7/3.8 deferred with reasons)
> - Phase 4 details: [CHANGELOG-PHASE-4.md](CHANGELOG-PHASE-4.md) (~9.3k lines of orphaned UI quarantined to `_deprecated/`, build-verified; Parents/Principal + backend orphan routes held for a focused pass) — **backend restarted; `pruh_core_exam_result` created in dev**
> - **Manual still needed:** rotate Gemini key · create `pruh_core_exam_result` in **prod** · (optional) hide `ai-capture` in permissions.js · delete `_deprecated/` after a release cycle.
> Remaining: deferred Phase 3 items + Phase 4 follow-ups + Phase 5 below.

Sequenced so the highest-risk, lowest-effort items come first. Effort = rough dev time. Each item has an acceptance check.

> Reminder (repo rules): hold pushes until told "push"/"deploy"; sign commits `Signed-off-by: iconicRog <ishmailr65@gmail.com>`; never add `Co-Authored-By: Claude`.

---

## Phase 0 — Stop the bleeding (security) · ~1–2 hrs

| # | Task | File | Effort | Done when |
|---|------|------|--------|-----------|
| 0.1 | **Remove the `TODO_JWT_TOKEN` backdoor** | [auth.js:26-31](../backend_node/src/middleware/auth.js#L26) | 5 min | The literal-token branch is gone (or gated `NODE_ENV!=='production'`); sending `TODO_JWT_TOKEN` → 401 |
| 0.2 | **Add role gate to `/api/school/*`** | [school.js:134](../backend_node/src/routes/school.js#L134) | 30 min | `applyAuth` includes `requireRole([...])`; a teacher/student token → 403 on `POST /api/school/principal-users/`. Widen role list per-route where principal/bursar legitimately need access (timetable, grading, grades) |
| 0.3 | **Pull hardcoded Gemini key + rotate** | [syllabusGenerator.js:7](../backend_node/src/controllers/syllabusGenerator.js#L7) | 15 min | No key literal in source; key only from `process.env`; old key rotated in Google console |
| 0.4 | **Disable or guard `saveGrades` & `reviewModificationRequest`** | [schoolController.js:1460](../backend_node/src/controllers/schoolController.js#L1460), [:2204](../backend_node/src/controllers/schoolController.js#L2204) | 30 min | Either endpoints removed from `school.js`, or each now routes through `appendGradeEvent` + applies the value. No silent grade writes remain |

---

## Phase 1 — Honor the approval rule (server-side) · ~half day

> Product rule: **school admin gets access only after super admin confirms.** Today: login-only + cosmetic UI gate. Make it real.

| # | Task | Where | Done when |
|---|------|-------|-----------|
| 1.1 | Add per-request approval check | [auth.js](../backend_node/src/middleware/auth.js) or a new `requireApprovedSchool` middleware on the protected routers | A token for a school that is now `pending`/`rejected`/suspended → 403 on `/api/school/*` and `/api/students…`, even if minted while approved |
| 1.2 | Make `403 "approval"`/`"access denied"` log the user out | [client.js](../src/api/client.js) 401/403 regex | Role/approval-denied responses clear auth + redirect to login (no opaque error) |
| 1.3 | (Optional) short-TTL tokens + revocation list | jwt utils | Suspension takes effect within token TTL |

**Note:** to keep cost down, cache the approval flag (e.g. on the token claims refreshed periodically, or a short in-memory/Redis lookup) rather than a full DB read per request.

---

## Phase 2 — Fix live pages that 404 / crash · ~1–2 days

For each, **either** implement the missing endpoint **or** hide the action until it exists. Recommended choice in the table.

| # | Feature | Missing endpoint | Recommended | Done when |
|---|---------|------------------|-------------|-----------|
| 2.1 | Finance-Users **crash on View** | n/a (FE bug) | **Fix FE** — guard `u.perms`/`u.scope`/`u.activity` with `|| []` | Opening a finance user's details never throws |
| 2.2 | Student **Promotion** | `POST /api/school/students/:id/promote/` | **Implement** (move student to new class/year, audit) | Promote updates the record + reloads |
| 2.3 | **AI Document Capture** | `/api/school/ai-capture/`, `/list/`, `/bulk-import/` | **Implement** (already have `adminApi` + Gemini) or hide nav | Upload+list work, or `ai-capture` removed from nav |
| 2.4 | **Exam results + delete** | `GET|POST /api/school/exams/:id/results/`, `DELETE /api/school/exams/:id/` | **Implement** | Can enter marks + delete an exam |
| 2.5 | **Room edit/delete/toggle** | `PUT|DELETE /api/school/rooms/:id/` | **Implement** (trivial CRUD) | Room edit/delete persist |
| 2.6 | **Teacher-assignment delete** | `DELETE /api/school/teacher-assignments/:id/` | **Implement** (trivial) | Un-assign works |
| 2.7 | **SAParents wrong password** | n/a (FE bug) | **Fix FE** — read `d.password` from server like SAStudents | Modal shows the actual server password |
| 2.8 | Finance-Users fabricated panels | n/a | Hide/disable mock panels (heat/integrity/alerts) or back them with real data | No fake metrics presented as real |
| 2.9 | Classes fabricated capacity bars | [SAClasses.js:101](../src/components/superadmin/SAClasses.js#L101) | Show real values or hide bars when fields absent | No invented `/50` capacity shown |

---

## Phase 3 — UX completeness · ~2–3 days

| # | Task | Where |
|---|------|-------|
| 3.1 | Double-submit guards on create forms | SAParents.js:402, SAStaffManager.js:476 |
| 3.2 | Replace raw-ID inputs with name/lookup pickers | SAParents link, SAStudents `Classroom ID`/`Academic Year ID`, SAClasses `academic_year_id` |
| 3.3 | Real document upload on student create | port from dead `Students/` wizard onto `/api/students/` |
| 3.4 | List error states on SAClasses/SASubjects | those files |
| 3.5 | Server-side (or full-dataset) search | live SA* pages |
| 3.6 | Fix superadmin-flavored copy for tenants | SAStudents.js:825 etc. |
| 3.7 | Build or remove the stub nav items | Examination, Report Card Generator, Fees Structure, School Financial Report |
| 3.8 | Add a dedicated `SCHOOL_ADMIN_NAV_ITEMS` | [SuperadminDashboard.js](../src/components/superadmin/SuperadminDashboard.js) (mirror PRINCIPAL/BURSAR) |

---

## Phase 4 — Clean up the graveyard · ~1 day (after harvest)

| # | Task |
|---|------|
| 4.1 | Harvest the two valuable wizards (`Students/AddStudentWizard`, `Teachers/AddTeacherWizard`) — repoint to `/api/*` and use on live pages, or archive |
| 4.2 | Move all dead `schooladmin/` files (doc 04) into `schooladmin/_deprecated/` in one commit |
| 4.3 | Remove orphaned `/api/school/finance/*` + `context`/`syllabus-stats`/`attendance/class` if unused |
| 4.4 | Delete `_deprecated/` after one release cycle once nothing references it |

---

## Phase 5 — Backend hardening · ongoing

| # | Task |
|---|------|
| 5.1 | Validate every inbound FK against `school.id` (`saveGrades`, `recordAttendance`, `createTeacherAssignment`, assign-* , `sendMessage`) |
| 5.2 | Stop leaking raw `err.message` to clients |
| 5.3 | Add input validation / stop mass-assigning `req.body` |
| 5.4 | Fix `getNextAdmissionNumber` to be per-school + race-safe |
| 5.5 | Remove duplicate dead handlers in `schoolController.js` |
| 5.6 | Add a real approval workflow for `recordExpense` (don't self-approve) |

---

## Suggested commit slices

1. `security: remove dev auth backdoor + add role gate to school routes` (Phase 0)
2. `security: enforce school approval per-request` (Phase 1)
3. `fix(school-admin): implement missing CRUD endpoints (promote/rooms/exam-results/assignments)` (Phase 2 backend)
4. `fix(school-admin): finance-users crash, parent password, fabricated bars` (Phase 2 frontend)
5. `chore: quarantine dead schooladmin/ tree` (Phase 4)

Each: branch first (repo is collaborative), `git pull --rebase origin main` before push, hold until told to push.
