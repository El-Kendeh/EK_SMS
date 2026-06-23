# CHANGELOG — Phase 2 (live pages that 404 / crash)

**Date:** 2026-06-23 · **Status:** code complete; syntax + load/export resolution verified (`node --check` + require test, incl. the new `ExamResult` model). **Not committed** (hold for "push").

> ⚠️ **Restart the backend** to load these.
> ⚠️ **PRODUCTION migration required:** the new `ExamResult` model needs a table. Dev auto-creates it (`db.sync({alter})`); prod needs a manual `CREATE TABLE pruh_core_exam_result` (id, school_id, exam_id, student_id, marks FLOAT, remarks VARCHAR(255), created_at; UNIQUE(exam_id, student_id)).

---

## What was fixed (maps to fix-plan 2.1–2.9)

| # | Item | Resolution |
|---|------|-----------|
| 2.1 | Finance-Users **"View" crash** | ✅ Fixed — `FinanceUserDetails` renders only backend-real data; perms/scope/tx/activity sections render only when present (no more `TypeError` on undefined). |
| 2.2 | Student **Promotion** 404 | ✅ Implemented `POST /api/school/students/:id/promote/` — validates target class ∈ school, moves the student, preserves grades. |
| 2.3 | **AI Document Capture** 404 | ⏸ **Deferred** — backend OCR (Gemini multimodal + a capture table) is a sizable build. Recommended interim: hide the nav by setting `'ai-capture': []` in `src/config/permissions.js`. **Not applied here because that file was being edited concurrently** — left for you to avoid clobbering changes. |
| 2.4 | **Exam delete + results** 404 | ✅ Implemented `DELETE /api/school/exams/:id/`, `GET/POST /api/school/exams/:id/results/` + new `ExamResult` model. Results page now loads the class roster, saves marks (scoped + clamped to total). `getExams` now returns `subject`/`classroom` names + `result_count` for the list badge. |
| 2.5 | **Room edit/delete/toggle** 404 | ✅ Implemented `PUT/DELETE /api/school/rooms/:id/` (toggle uses PUT `{is_active}`). |
| 2.6 | **Teacher-assignment delete** 404 | ✅ Implemented `DELETE /api/school/teacher-assignments/:id/` (soft-delete `is_active:false`, matching the list query). |
| 2.7 | SAParents **wrong password** | ✅ Fixed — credentials modal now prefers the server's `d.password`. |
| 2.8 | Finance fabricated panels | ◑ **Partial (safe subset):** crash fixed (2.1), card KPI block guarded (no `$undefined`), details modal honest. The page-level panels (`StatsCards` tx cards, `ActivityPanel`, `TransactionHeat`, `AlertsPanel`, `IntegrityPanel`) show honest **zeros** (not crashes) and were **left in place** to avoid an invasive removal — recommended follow-up: hide them or back them with real `/api/finance/*` data. |
| 2.9 | Classes capacity bars | ✅ **No change needed** — verified `Class.capacity` (default 50) and `Class.max_teachers` (default 10) are **real columns**; the bars reflect configured capacity. The audit's "fabricated" flag was a false positive. Left untouched. |

---

## Files changed

### Backend (all additive / scoped / validated)
| File | Change |
|------|--------|
| [ExamResult.js](../backend_node/src/models/ExamResult.js) | **NEW** model `pruh_core_exam_result`, unique (exam_id, student_id). |
| [schoolController.js](../backend_node/src/controllers/schoolController.js) | `require ExamResult`; enriched `getExams` (subject/classroom names + result_count); **7 new handlers**: `deleteExam`, `getExamResults`, `saveExamResults`, `updateRoom`, `deleteRoom`, `deleteTeacherAssignment`, `promoteStudent`; added all to exports. |
| [school.js](../backend_node/src/routes/school.js) | Registered the 7 routes (GET results is a read; the rest are role-gated mutations via the Phase-0 write guard). |

### Frontend (crash/bug fixes only — no structural removals)
| File | Change |
|------|--------|
| [FinanceUserDetails.jsx](../src/components/schooladmin/FinanceUsers/FinanceUserDetails.jsx) | Guard perms/scope/tx/activity sections → no crash, no fabricated panels. |
| [FinanceUserCard.jsx](../src/components/schooladmin/FinanceUsers/FinanceUserCard.jsx) | Guard the KPI block so a user with no tx data no longer shows `$undefined`. |
| [SAParents.js](../src/components/superadmin/SAParents.js) | Credentials modal prefers server `d.password`. |

---

## Manual verification (after restart)

```
# Promotion
POST /api/school/students/<id>/promote/  {classroom_id}      → student moved; grades intact

# Exams
DELETE /api/school/exams/<id>/                                → exam + its results removed
GET    /api/school/exams/<id>/results/                        → roster with marks (null if none)
POST   /api/school/exams/<id>/results/  {results:[{student_id,marks}]} → saved N

# Rooms
PUT    /api/school/rooms/<id>/  {name,...} or {is_active}     → updated
DELETE /api/school/rooms/<id>/                                → deleted

# Teacher assignment
DELETE /api/school/teacher-assignments/<id>/                 → removed (soft)

# Finance Users — open a user's "View" → no crash; card shows no "$undefined"
# Parents — create a parent → credentials modal shows the server password
```

All new mutation routes require `school_admin`/`superadmin` (Phase 0 guard) and re-check approval (Phase 1).

---

## Recommended follow-ups (not done, your call)
1. **Hide AI-capture** (`'ai-capture': []` in permissions.js) until its backend is built — left out to avoid a concurrent-edit conflict.
2. **Finance page panels** (2.8): hide `ActivityPanel`/`TransactionHeat`/`AlertsPanel`/`IntegrityPanel` + the 2 tx `StatsCards`, or wire `/api/finance/*` data into them.
3. Prod: create `pruh_core_exam_result`.

## Suggested commit (when you say "push")
```
feat(school-admin): implement promote/exam-results/exam-delete/room+assignment delete endpoints (+ ExamResult model)
fix(school-admin): finance-users crash & $undefined KPIs; parent credentials show server password
```
