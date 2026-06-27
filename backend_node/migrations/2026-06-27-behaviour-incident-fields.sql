-- ============================================================================
-- EK-SMS Migration: Behaviour-incident fields (pruh_core_behaviour_incident title/evidence)
-- Date: 2026-06-27
--
-- WHY THIS EXISTS
--   The Teacher behaviour-incident form sends a `title` and uploaded evidence files,
--   but pruh_core_behaviour_incident had no column for either (teacher-dashboard audit
--   #46). The filing route now has multer (parses the multipart body + saves evidence
--   to /uploads/teacher/), the handler stores `title` and an `evidence` JSON array, and
--   the list maps fields back to what the UI reads (type/title/notes/reportedAt, #47).
--
--   - DEV: backend boot runs `db.sync({ alter: true })` and adds these from
--     backend_node/src/models/BehaviourIncident.js.
--   - PRODUCTION runs `db.sync({ alter: false })`, so RUN THIS MIGRATION on prod (or
--     run migrations/run-all-tables.js, which adds them via its column-patch list).
--
-- HOW TO APPLY (production)
--       mysql -h <PROD_HOST> -P <PORT> -u <USER> -p <DB_NAME> < backend_node/migrations/2026-06-27-behaviour-incident-fields.sql
--
--   Idempotent: each ADD COLUMN is guarded against the column already existing.
-- ============================================================================

SET @has_title := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pruh_core_behaviour_incident' AND COLUMN_NAME = 'title');
SET @ddl := IF(@has_title = 0,
  "ALTER TABLE `pruh_core_behaviour_incident` ADD COLUMN `title` VARCHAR(255) NULL AFTER `incident_type`",
  "SELECT 'column pruh_core_behaviour_incident.title already exists — skipped' AS note");
PREPARE s1 FROM @ddl; EXECUTE s1; DEALLOCATE PREPARE s1;

SET @has_evidence := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pruh_core_behaviour_incident' AND COLUMN_NAME = 'evidence');
SET @ddl := IF(@has_evidence = 0,
  "ALTER TABLE `pruh_core_behaviour_incident` ADD COLUMN `evidence` TEXT NULL AFTER `description`",
  "SELECT 'column pruh_core_behaviour_incident.evidence already exists — skipped' AS note");
PREPARE s2 FROM @ddl; EXECUTE s2; DEALLOCATE PREPARE s2;

-- ── Verify ──────────────────────────────────────────────────────────────────
--   SHOW COLUMNS FROM `pruh_core_behaviour_incident` LIKE 'title';
--   SHOW COLUMNS FROM `pruh_core_behaviour_incident` LIKE 'evidence';
--
-- ── Rollback (DESTRUCTIVE) ───────────────────────────────────────────────────
--   ALTER TABLE `pruh_core_behaviour_incident` DROP COLUMN `title`, DROP COLUMN `evidence`;
