# Backend deploy — manual tasks checklist

Production runs with Sequelize **sync disabled** (`db.sync({ alter: NODE_ENV !== 'production' })`
in `src/index.js`), so the prod DB does **not** auto-create tables/columns. Every schema
change ships as a `.sql` file in `migrations/` that must be applied by hand. This file is
the single source of truth for everything the backend team runs manually.

Apply pattern (each file):

```bash
cd EK_SMS/backend_node
mysql -u <user> -p <database> < migrations/<file>.sql
```

---

## 1. Environment variables (set in the prod host / Render dashboard)

| Var | Required | Notes |
|-----|----------|-------|
| `JWT_SECRET` | **YES** | App now **refuses to boot** without it. `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `DB_HOST` `DB_PORT` `DB_USER` `DB_PASSWORD` `DB_NAME` | YES | MySQL connection |
| `NODE_ENV` | YES | `production` (keeps sync off, sets combined logging + fail-fast on JWT) |
| `RESEND_API_KEY` | YES | email (OTP, approvals, contact). Without it OTP send 503s in prod |
| `GEMINI_API_KEY` | if using AI | AI Document Capture + syllabus generation. Absent → those features 503 (not fatal) |
| `DEFAULT_FROM_EMAIL` | optional | defaults to `EK-SMS <noreply@elkendeh.com>` |
| `BACKUP_KEEP` `BACKUP_DIR` | optional | backup retention/location (default 14 / `backend_node/backups`) |

## 2. Database migrations — apply any not yet on prod, in date order

Most are idempotent (`IF NOT EXISTS` / `information_schema`-guarded) and safe to re-run.
**Two are plain `ALTER`** (MySQL 8 has no `ADD COLUMN IF NOT EXISTS`) — check the column
doesn't already exist before running: `2026-07-03-leadership-columns-and-user-phone.sql`,
`2026-07-03-pickup-expiry-color.sql`.

Base schema (only on a fresh DB — dev uses `scripts/run-all-tables.js`):
- `2026-05-18-all-new-tables.sql`, `2026-05-18-finance-and-approvals.sql`

Feature/fix migrations (the ones tracked as pending to prod):
- [ ] `2026-06-22-timetable-slot.sql` — CREATE `pruh_core_timetable_slot` (timetabling). Without it timetable reads 500.
- [ ] `2026-06-23-ai-capture-and-expense-approval.sql` — CREATE `pruh_school_ai_document_capture`; adds expense-approval cols to `pruh_finance_expense` (`created_by`, `approved_at`, `rejection_reason`, status default → `pending`).
- [ ] `2026-06-25-academic-year-status-columns.sql` — adds `status` ENUM + `deleted_at` to `pruh_system_academicyear`. Without it every `/api/academic-years/*` 500s.
- [ ] `2026-06-25-school-approved-at.sql` — adds `approved_at` to `pruh_core_school` (real approval date).
- [ ] `2026-06-25-virtual-meeting.sql` — CREATE `pruh_core_virtual_meeting`. Without it the first vm-* request 500s.
- [ ] `2026-06-27-behaviour-incident-fields.sql` — adds `title` + `evidence` to `pruh_core_behaviour_incident`.
- [ ] `2026-06-27-exam-result.sql` — CREATE `pruh_core_exam_result` (+ UNIQUE exam+student). Without it exam endpoints 500.
- [ ] `2026-06-27-feedback-template.sql` — CREATE `pruh_core_feedback_template`.
- [ ] `2026-06-27-grade-locking.sql` — adds `is_locked` / `locked_at` / `locked_by` to `pruh_core_grade`. Without it grade lock/save 500s.
- [ ] `2026-06-27-grade-receipt.sql` — CREATE `pruh_core_grade_receipt` (hash-chained lock receipts). Without it grade lock 500s.
- [ ] `2026-06-27-live-class-status.sql` — adds `status` to `pruh_core_live_class`.
- [ ] `2026-06-27-office-hour-fields.sql` — adds `room` / `subject` / `audience` to `pruh_core_office_hour`.
- [ ] `2026-06-27-peer-review-anonymous.sql` — adds `anonymous` to `pruh_core_peer_review`.
- [ ] `2026-06-28-exam-type.sql` — exam type column(s).
- [ ] `2026-06-28-modification-request-evidence.sql` — adds `evidence_url` + `review_reason` to `pruh_core_modification_request`.
- [ ] `2026-07-03-coguardian-status-repair.sql` — DATA repair (no schema change): fixes stuck `pending` guardian links so parents see their children.
- [ ] `2026-07-03-leadership-columns-and-user-phone.sql` — ⚠️ plain ALTER. Adds `role` / `access_level` / `is_active` to `pruh_core_schooladmin` + `phone` to `users`. Required for principal/bursar suspend + provisioning.
- [ ] `2026-07-03-pickup-expiry-color.sql` — ⚠️ plain ALTER. Adds `expiry` + `photo_color` to `pruh_core_pickup_person`.
- [ ] `2026-07-04-report-card-receipt.sql` — CREATE `pruh_core_report_card_receipt` (parent/student PDF tamper receipts).
- [ ] `2026-07-13-finance-money-decimal.sql` — converts ALL currency cols FLOAT → DECIMAL(12,2) + UNIQUE receipt-number index. Required for money correctness.
- [ ] `2026-07-13-fee-terms-and-budget.sql` — late-fee/installment/scholarship cols + CREATE `pruh_finance_budget`.
- [ ] `2026-07-13-two-factor.sql` — adds `two_factor_enabled` / `two_factor_secret` / `two_factor_recovery` to `users`. Without it 2FA enrol + login gate 500.
- [ ] `2026-07-16-tenant-index-backfill.sql` — adds leading `school_id` indexes to the 6 tenant tables that lacked them (incl. `grade_event`). Perf, additive.

After each: run the verification `SELECT`s at the bottom of the script. Order between them is independent.

## 3. Dependency patch

```bash
cd EK_SMS/backend_node && npm ci && npm audit fix
```
Closes the HIGH `multer` advisory (DoS) + moderate `morgan` / low `cookie` `uuid`. Re-run `npm test` and a boot smoke after.

## 4. Rotate the old Gemini key

The previously committed Gemini API key was removed from code but is still live — rotate it in the Google Cloud console so the exposed value is dead.

## 5. Backups (no real DR yet)

See `BACKUP-RUNBOOK.md`. Decide durability (managed-DB native backups **or** object-storage push — the container disk is ephemeral, local dumps vanish on redeploy), schedule `npm run backup`, and **test one restore** before onboarding.

## 6. Deploy config

Root `render.yaml` is stale — it deploys the dead Django backend, not this Node app. Fix or delete it so no one Blueprint-deploys the wrong thing.

## 7. Pre-onboarding verification

```bash
cd EK_SMS/backend_node
npm test                 # 26 security-core tests must pass
NODE_ENV=production PORT=3999 node src/index.js   # must boot (proves JWT_SECRET is set)
curl -s localhost:3999/api/health                 # {"status":"ok"}
```
