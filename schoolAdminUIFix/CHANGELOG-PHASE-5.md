# CHANGELOG — Phase 5 (backend hardening)

**Date:** 2026-06-23 · **Status:** safe subset done; `node --check` + load test pass. **Not committed.**
> ⚠️ Restart the backend to pick up these two new guards (they're inert until the process reloads).

> Approach (per your caution): only the **high-confidence, additive** guards this pass. Anything that touches a working create flow's shape, needs a schema/format decision, or is a large exact-match edit was left with a documented reason.

## Done — FK tenant-validation (5.1)
Both are additive guards that reject cross-tenant foreign keys; they don't change the success path for legitimate (own-school) input.

| Handler | Guard added | File |
|---|---|---|
| `recordAttendance` | `student_id` must belong to the caller's school | [schoolController.js](../backend_node/src/controllers/schoolController.js) (~1536) |
| `createTeacherAssignment` | `class_id` / `subject_id` / `teacher_id` must each belong to the caller's school | [schoolController.js](../backend_node/src/controllers/schoolController.js) (~1997) |

(`saveGrades` already got the same treatment in Phase 0.4.) The live Teacher-Assignments page sends the school's own IDs from its dropdowns, so the guard passes for normal use and only blocks forged/foreign IDs.

## Deferred — with reasons (each is its own careful pass)
| # | Item | Why held |
|---|------|----------|
| 5.1 | `sendMessage` cross-tenant role-broadcast | `User` has **no `school_id`** (users belong to a school via role tables; **parents have none at all** — they link via students). A correct fix needs per-role resolution incl. the parent→student join. The role-broadcast path has **no live caller** (the only UI that used it is now quarantined), so it's a latent issue — better fixed deliberately than half-fixed. |
| 5.2 | Stop leaking raw `err.message` to clients | Safe but spread across many handlers; a focused find-and-replace pass (log detail server-side, return generic). |
| 5.3 | Input validation / stop mass-assigning `req.body` (createStudent/updateStudent) | Touches the **core create flow**; over-tightening could reject valid input. Needs deliberate field-by-field validation. |
| 5.4 | `getNextAdmissionNumber` per-school sequence | **Intentionally left.** It's already school-scoped; it uses the global PK because `admission_number` is **globally unique** — a naive per-school sequence (1,2,3…) would collide across schools. A real fix needs a school-prefixed format or a per-school unique constraint (a schema decision). Current behavior is collision-safe. |
| 5.5 | Remove duplicate dead handlers | The first copies of `getExamOfficers`/`assignExamOfficer`/`getMessages`/`sendMessage` are **inert** (JS uses the last definition), so they cause no runtime bug. Removal is cosmetic and a large exact-match edit — low value, nonzero risk. |
| 5.6 | Real approval workflow for `recordExpense` | Currently self-approves. A real workflow is a product decision (who approves?) and could affect the finance UI that expects approved expenses. |

## Verification
- `node --check src/controllers/schoolController.js` → OK.
- Load test: controller requires cleanly; `recordAttendance` + `createTeacherAssignment` exported.

## Suggested commit (when you say "push")
```
security(school-admin): FK tenant-validation on attendance + teacher-assignment creation
```
