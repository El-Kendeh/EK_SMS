# CHANGELOG — Phase 0 & Phase 1 (implemented)

**Date:** 2026-06-23 · **Status:** code complete, syntax + require-resolution verified (`node --check` + load test passed). **Not yet committed/pushed** (per repo rule: hold until told "push").

> ⚠️ **The running backend must be restarted** to pick these up (`npm start` runs plain `node`, no hot-reload).

---

## Files changed

### Backend
| File | Change |
|------|--------|
| [auth.js](../backend_node/src/middleware/auth.js) | **0.1** Removed the `TODO_JWT_TOKEN`/`TODO_REAL_JWT_TOKEN` → superuser backdoor block entirely. Invalid tokens now always 401. |
| [school.js](../backend_node/src/routes/school.js) | **0.2** Added `requireRole` + a method-based `schoolWriteGuard`: GET stays open to any authenticated user (theming + cross-role reads), POST/PUT/PATCH/DELETE require `school_admin`/`superadmin`. **1.1** Added `requireActiveAccount` to `applyAuth`. |
| [syllabusGenerator.js](../backend_node/src/controllers/syllabusGenerator.js) | **0.3** Removed the committed Gemini key fallback; `genAI` is `null` when unconfigured; handler returns **503** if `GEMINI_API_KEY` is unset. |
| [schoolController.js](../backend_node/src/controllers/schoolController.js) | **0.4** Hardened `saveGrades`: rejects students not in the caller's school, clamps scores to 0–100, writes a tamper-evident `appendGradeEventSafe` audit row per grade, returns `{saved,skipped}`. Documented the `reviewModificationRequest` no-op as a Phase-2 TODO. |
| [requireActiveAccount.js](../backend_node/src/middleware/requireActiveAccount.js) | **1.1 (NEW)** Per-request `is_active` re-check. Superadmin bypasses; deactivated/rejected accounts get **403 `ACCOUNT_INACTIVE`**; fails *open* on a transient DB error (logs it). |
| [superadmin.js](../backend_node/src/routes/superadmin.js) | **1.1** `sla` is now `[requireActiveAccount, requireRole(['superadmin','school_admin'])]`, so the shared `/api/students|teachers|classes|subjects|parents|principals|bursars/` routes are also approval-gated per request. |

### Frontend
| File | Change |
|------|--------|
| [client.js](../src/api/client.js) | **1.2** `isAuthError` now treats a 403 with `code: 'ACCOUNT_INACTIVE'` (or an approval/"not active" message) as an auth error → clears auth → returns to login. A plain role-permission denial is deliberately **not** treated as logout. |

---

## What each phase achieves

**Phase 0 — stop the bleeding**
- 0.1 The internet-reachable superuser backdoor is gone.
- 0.2 A teacher/student/parent token can no longer perform school-admin **writes** (create principal/finance accounts, edit grades, wipe timetable…). Reads + theming still work for every role; superadmin still works (incl. `SABatchTransfer` batch-grades and impersonation).
- 0.3 No secret in source; AI syllabus fails with a clear 503 instead of silently using a leaked key.
- 0.4 No more silent, unaudited, cross-tenant grade writes — every direct write is scoped, validated, and recorded in the SHA-256 grade-event chain.

**Phase 1 — honor "access only after Super Admin confirms"**
- 1.1 Approval is now re-checked on **every** tenant-data request, not just at login. A school admin suspended/rejected *after* logging in loses API access immediately (no waiting for token expiry).
- 1.2 Such a user is cleanly returned to the login screen instead of seeing an opaque error.

---

## Manual verification (run after restarting the backend, once login works)

```
# 0.1 — backdoor gone
curl -i -H "Authorization: Bearer TODO_JWT_TOKEN" <api>/api/school/teachers/      # expect 401

# 0.2 — role gate (need real tokens)
#   teacher/student token  →  POST /api/school/teachers/   expect 403
#   school_admin token     →  POST /api/school/teachers/   expect 200/201
#   any role               →  GET  /api/school/info/       expect 200 (theming intact)
#   superadmin             →  POST /api/school/grades/?school_id=N   expect 200 (SABatchTransfer)

# 0.3 — AI key
#   unset GEMINI_API_KEY → POST /api/school/syllabus/generate/   expect 503 clear message

# 0.4 — grades
#   POST /api/school/grades/ with a foreign student_id → that row skipped; check pruh_core_grade_event has a new row

# 1.1 — approval gate
#   approve a school_admin, log in, get token
#   set that user is_active=false in DB
#   reuse the token → GET /api/school/students/   expect 403 {code:'ACCOUNT_INACTIVE'}
#   (frontend: that response logs them out to /login)
```

---

## Action items for you (manual, outside code)

1. **Rotate the Gemini key** `AIzaSyAkx…WvVQ` in the Google Cloud console — it was committed and remains in git history. Removing it from source is not enough.
2. Set `GEMINI_API_KEY=...` in `backend_node/.env` if you want AI syllabus generation to keep working.
3. **Restart the backend** so all changes take effect.

---

## Deliberately deferred (not Phase 0/1)

- `reviewModificationRequest` still only flips status — applying the approved value to the grade (+ GradeEvent) is **Phase 2** (needs the modification-request workflow + a field-mapping convention). It is now role-gated, so the security risk is closed; the correctness gap is documented in code.
- Optional hardening (short-TTL tokens + revocation list) from fix-plan 1.3 was **not** done — the per-request `is_active` check already makes suspension effective immediately, which satisfies the rule. Add TTL/revocation later if you want defense-in-depth.

---

## Suggested commits (when you say "push")

```
security: remove dev auth backdoor + gate /api/school/* writes by role
security: per-request school-approval enforcement (requireActiveAccount) + client 403 handling
security: remove committed Gemini key; harden saveGrades (scope+validate+audit)
```
Branch first, `git pull --rebase origin main`, `Signed-off-by: iconicRog <ishmailr65@gmail.com>`, no `Co-Authored-By`.
