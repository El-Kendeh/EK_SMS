# Model/DB column mismatches causing "Unknown column" 500s — EK_SMS backend

Multi-agent sweep (2026-06-28): 14 candidates, 7 confirmed live 500s + 1 dead-code mismatch, each adversarially verified against the model files AND the migrations.

## Summary

Seven real, live 500s and one dead-code mismatch. They cluster on `SecurityAuditLog` (table `sa_security_audit_log`) plus two one-off wrong-table lookups. The `SecurityAuditLog` model declares `id, type, severity, actor, ip, action, metadata_json, ts` with `timestamps: false` — so `school_id`, `user_id`, and `created_at` do not exist on it (not in the model, not in any migration; the table is sync-created from the model). Every query that filters or orders on those names throws `Unknown column` → 500. Pages affected: the **finance activity feed** (`GET /api/finance/activity-feed`), the **principal activity feed** (`GET /api/principal/activity-feed`), the **student security-health** page (`GET /api/student/security-health`), the **student grade-history** page (`GET /api/student/grades/:gradeId/history`), and the **parent grade-verification** path (`GET /api/parent/verify/:hash?type=grade`).

## Status

| # | Severity | Where | Status |
|---|---|---|---|
| 1-2 | High | `financeController.getActivityFeed` (1135-1151) — `SecurityAuditLog` `where:{school_id}` + `order:created_at` | **FIXED** — dropped the SecurityAuditLog source (platform-wide; would also leak cross-school), feed now uses only the tenant-scoped Notification table. |
| 3 | High | `principalController.getActivityFeed` (638-660) — same | **FIXED** — same. |
| 4-5 | Medium | `studentController.getSecurityHealth` (903-904) — `where:{user_id}` + `order:created_at`; response also reads `ip_address`/`user_agent`/`created_at` that don't exist | **FLAGGED** — needs a rewrite of what the page shows (not mechanical). Fix: filter on a real column (e.g. `actor`), `order:[['ts','DESC']]`, map `l.ip`/`l.ts`. Sibling fns `getWhoSawMyData`/`getParentalAccessLog` already order by `ts`. |
| 6 | Medium | `studentController.getGradeHistory` (262) — `ForensicEvent.grade_id` (no such column; `grade_id` lives on `pruh_core_modification_request`) | **FLAGGED** — key the lookup off `metadata_json` (e.g. `LIKE %"gradeId":<id>%`), or add a `grade_id` column + migration if grade-scoped forensic history is intended. |
| 7 | Medium | `parentController.verifyHash` (687) — `Grade.payment_hash` (no such column; the verification hash lives on `pruh_core_grade_receipt.verification_hash`, a parallel-added model) | **FLAGGED** — query `GradeReceipt.findOne({ where: { verification_hash: hash } })` and load the linked grade. Touches the new GradeReceipt model. |
| 8 | Low | `teacherController.getTeacherAcademicCalendar` (905) — `Term.academic_year` (should be `academic_year_id`) | **FLAGGED (no prod 500)** — dead function, never bound to a route (live `/academic-calendar` → `getAcademicCalendar`). Fix the attribute or delete the dead function. |

## Notes

- No tenant-scoping/PII concern in the *current* (crashing) state. But "fixing" the activity feeds by merely dropping the `school_id` filter (the sweep's first suggestion) would have surfaced **platform-wide** audit events in a tenant feed — so the applied fix removes the SecurityAuditLog source entirely and keeps only the tenant-scoped Notifications.
- All `SecurityAuditLog` fixes are mechanical: `created_at → ts`, drop `school_id`/`user_id` from where-clauses. One model, one timestamp column (`ts`).
- The medium items (#4-7) sit in the student/parent portals and need portal-specific rewrites or touch parallel-added code (GradeReceipt) — left for those portal owners with the exact fixes above.
