-- ============================================================================
-- EK-SMS Migration: Real school approval timestamp (pruh_core_school.approved_at)
-- Date: 2026-06-25
--
-- WHY THIS EXISTS
--   serializeSchool (backend_node/src/controllers/superadminController.js) used to
--   fabricate `approval_date` from the registration date (created_at) because the
--   School table had no real approved-at column. That made the Onboarding "Avg
--   Review" KPI always 0m and showed the wrong "Approved" date on the review screen.
--   handleSchoolAction's approve branch now stamps a real `approved_at`, and the
--   serializer returns it (NULL for legacy rows approved before this column existed).
--
--   - DEV: backend boot runs `db.sync({ alter: true })` and adds the column
--     automatically from the model (backend_node/src/models/School.js).
--   - PRODUCTION runs `db.sync({ alter: false })`, so RUN THIS MIGRATION on the
--     production MySQL database (or run migrations/run-all-tables.js, which also
--     adds it via its pruh_core_school column-patch list).
--
-- HOW TO APPLY (production)
--       mysql -h <PROD_HOST> -P <PORT> -u <USER> -p <DB_NAME> < backend_node/migrations/2026-06-25-school-approved-at.sql
--     (or paste the statement below into phpMyAdmin / Workbench / Adminer)
--
--   Idempotent: the ADD COLUMN is guarded against the column already existing.
--   NOTE: we intentionally do NOT backfill approved_at for already-approved rows —
--   there is no real historical approval time, and backfilling created_at would
--   re-introduce the exact "approval == registration" fabrication this fixes.
--   Those legacy rows keep approval_date = NULL; new approvals get a real time.
-- ============================================================================

SET @has_approved_at := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME   = 'pruh_core_school'
    AND COLUMN_NAME  = 'approved_at'
);
SET @ddl := IF(@has_approved_at = 0,
  "ALTER TABLE `pruh_core_school` ADD COLUMN `approved_at` DATETIME NULL AFTER `changes_requested`",
  "SELECT 'column pruh_core_school.approved_at already exists — skipped' AS note"
);
PREPARE s1 FROM @ddl; EXECUTE s1; DEALLOCATE PREPARE s1;

-- ── Verify ──────────────────────────────────────────────────────────────────
--   SHOW COLUMNS FROM `pruh_core_school` LIKE 'approved_at';
--
-- ── Rollback (DESTRUCTIVE) ───────────────────────────────────────────────────
--   ALTER TABLE `pruh_core_school` DROP COLUMN `approved_at`;
