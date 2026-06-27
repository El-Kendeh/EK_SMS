-- ============================================================================
-- EK-SMS Migration: Office-hour slot fields (pruh_core_office_hour room/subject/audience)
-- Date: 2026-06-27
--
-- WHY THIS EXISTS
--   The Teacher Office Hours publish form sends room, subject, and audience
--   (student|parent) per slot, but pruh_core_office_hour had no columns for them, so
--   publishing 400'd / lost those fields (teacher-dashboard audit #61). The handler
--   now stores them (and stores the full start datetime in `date`).
--
--   - DEV: backend boot runs `db.sync({ alter: true })` and adds these from
--     backend_node/src/models/OfficeHour.js.
--   - PRODUCTION runs `db.sync({ alter: false })`, so RUN THIS MIGRATION on prod (or
--     run migrations/run-all-tables.js, which adds them via its column-patch list).
--
-- HOW TO APPLY (production)
--       mysql -h <PROD_HOST> -P <PORT> -u <USER> -p <DB_NAME> < backend_node/migrations/2026-06-27-office-hour-fields.sql
--
--   Idempotent: each ADD COLUMN is guarded against the column already existing.
-- ============================================================================

SET @has_room := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pruh_core_office_hour' AND COLUMN_NAME = 'room');
SET @ddl := IF(@has_room = 0,
  "ALTER TABLE `pruh_core_office_hour` ADD COLUMN `room` VARCHAR(120) NULL AFTER `max_bookings`",
  "SELECT 'column pruh_core_office_hour.room already exists — skipped' AS note");
PREPARE s1 FROM @ddl; EXECUTE s1; DEALLOCATE PREPARE s1;

SET @has_subject := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pruh_core_office_hour' AND COLUMN_NAME = 'subject');
SET @ddl := IF(@has_subject = 0,
  "ALTER TABLE `pruh_core_office_hour` ADD COLUMN `subject` VARCHAR(120) NULL AFTER `room`",
  "SELECT 'column pruh_core_office_hour.subject already exists — skipped' AS note");
PREPARE s2 FROM @ddl; EXECUTE s2; DEALLOCATE PREPARE s2;

SET @has_audience := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pruh_core_office_hour' AND COLUMN_NAME = 'audience');
SET @ddl := IF(@has_audience = 0,
  "ALTER TABLE `pruh_core_office_hour` ADD COLUMN `audience` VARCHAR(20) NULL DEFAULT 'student' AFTER `subject`",
  "SELECT 'column pruh_core_office_hour.audience already exists — skipped' AS note");
PREPARE s3 FROM @ddl; EXECUTE s3; DEALLOCATE PREPARE s3;

-- ── Verify ──────────────────────────────────────────────────────────────────
--   SHOW COLUMNS FROM `pruh_core_office_hour` LIKE 'room';
--   SHOW COLUMNS FROM `pruh_core_office_hour` LIKE 'audience';
--
-- ── Rollback (DESTRUCTIVE) ───────────────────────────────────────────────────
--   ALTER TABLE `pruh_core_office_hour` DROP COLUMN `room`, DROP COLUMN `subject`, DROP COLUMN `audience`;
