-- ============================================================================
-- EK-SMS Migration: Live class status (pruh_core_live_class.status)
-- Date: 2026-06-27
--
-- WHY THIS EXISTS
--   The Teacher Live Classes UI is built around a status (scheduled / live / ended /
--   cancelled) — Cancel and "Mark ended" set it, and each card renders it — but the
--   pruh_core_live_class table had no status column (teacher-dashboard audit #71/#72).
--   listLiveClasses now branches by role and serialises status; create sets
--   'scheduled', update accepts 'cancelled'/'ended', and 'live' is derived from the
--   scheduled time.
--
--   - DEV: backend boot runs `db.sync({ alter: true })` and adds the column from
--     backend_node/src/models/LiveClass.js.
--   - PRODUCTION runs `db.sync({ alter: false })`, so RUN THIS MIGRATION on the
--     production MySQL database (or run migrations/run-all-tables.js, which also adds
--     it via its pruh_core_live_class column-patch list).
--
-- HOW TO APPLY (production)
--       mysql -h <PROD_HOST> -P <PORT> -u <USER> -p <DB_NAME> < backend_node/migrations/2026-06-27-live-class-status.sql
--
--   Idempotent: the ADD COLUMN is guarded against the column already existing.
-- ============================================================================

SET @has_status := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME   = 'pruh_core_live_class'
    AND COLUMN_NAME  = 'status'
);
SET @ddl := IF(@has_status = 0,
  "ALTER TABLE `pruh_core_live_class` ADD COLUMN `status` VARCHAR(20) NOT NULL DEFAULT 'scheduled' AFTER `duration_minutes`",
  "SELECT 'column pruh_core_live_class.status already exists — skipped' AS note"
);
PREPARE s1 FROM @ddl; EXECUTE s1; DEALLOCATE PREPARE s1;

-- ── Verify ──────────────────────────────────────────────────────────────────
--   SHOW COLUMNS FROM `pruh_core_live_class` LIKE 'status';
--
-- ── Rollback (DESTRUCTIVE) ───────────────────────────────────────────────────
--   ALTER TABLE `pruh_core_live_class` DROP COLUMN `status`;
