-- ============================================================================
-- EK-SMS Migration: Real teacher-side grade locking (pruh_core_grade lock columns)
-- Date: 2026-06-27
--
-- WHY THIS EXISTS
--   The Teacher "Submit & Lock" flow promised a permanent, tamper-evident lock,
--   but the Grade model had no lock column at all — "locking" only set
--   approval_status='pending', so a locked grade was indistinguishable from a
--   draft and could be silently overwritten by the next auto-save
--   (teacher-dashboard audit #15/#16). submitGradesForLocking now sets a real
--   `is_locked` flag (+ locked_at / locked_by), and saveGradeDraft refuses to edit
--   a locked grade (teachers must file a modification request instead).
--
--   - DEV: backend boot runs `db.sync({ alter: true })` and adds these columns
--     automatically from the model (backend_node/src/models/Grade.js).
--   - PRODUCTION runs `db.sync({ alter: false })`, so RUN THIS MIGRATION on the
--     production MySQL database (or run migrations/run-all-tables.js, which also
--     adds them via its pruh_core_grade column-patch list).
--
-- HOW TO APPLY (production)
--       mysql -h <PROD_HOST> -P <PORT> -u <USER> -p <DB_NAME> < backend_node/migrations/2026-06-27-grade-locking.sql
--     (or paste the statements below into phpMyAdmin / Workbench / Adminer)
--
--   Idempotent: each ADD COLUMN is guarded against the column already existing.
--   NOT backfilled: existing rows keep is_locked = 0 (FALSE). Grades that were
--   already 'approved' are effectively final via the approval flow; if you want
--   them shown as locked too, run the optional backfill at the bottom.
-- ============================================================================

-- ── is_locked ───────────────────────────────────────────────────────────────
SET @has_is_locked := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME   = 'pruh_core_grade'
    AND COLUMN_NAME  = 'is_locked'
);
SET @ddl := IF(@has_is_locked = 0,
  "ALTER TABLE `pruh_core_grade` ADD COLUMN `is_locked` TINYINT(1) NOT NULL DEFAULT 0 AFTER `approved_at`",
  "SELECT 'column pruh_core_grade.is_locked already exists — skipped' AS note"
);
PREPARE s1 FROM @ddl; EXECUTE s1; DEALLOCATE PREPARE s1;

-- ── locked_at ─────────────────────────────────────────────────────────────────
SET @has_locked_at := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME   = 'pruh_core_grade'
    AND COLUMN_NAME  = 'locked_at'
);
SET @ddl := IF(@has_locked_at = 0,
  "ALTER TABLE `pruh_core_grade` ADD COLUMN `locked_at` DATETIME NULL AFTER `is_locked`",
  "SELECT 'column pruh_core_grade.locked_at already exists — skipped' AS note"
);
PREPARE s2 FROM @ddl; EXECUTE s2; DEALLOCATE PREPARE s2;

-- ── locked_by ─────────────────────────────────────────────────────────────────
SET @has_locked_by := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME   = 'pruh_core_grade'
    AND COLUMN_NAME  = 'locked_by'
);
SET @ddl := IF(@has_locked_by = 0,
  "ALTER TABLE `pruh_core_grade` ADD COLUMN `locked_by` BIGINT NULL AFTER `locked_at`",
  "SELECT 'column pruh_core_grade.locked_by already exists — skipped' AS note"
);
PREPARE s3 FROM @ddl; EXECUTE s3; DEALLOCATE PREPARE s3;

-- ── Verify ──────────────────────────────────────────────────────────────────
--   SHOW COLUMNS FROM `pruh_core_grade` LIKE 'is_locked';
--   SHOW COLUMNS FROM `pruh_core_grade` LIKE 'locked_%';
--
-- ── Optional backfill (treat already-approved grades as locked) ───────────────
--   UPDATE `pruh_core_grade` SET `is_locked` = 1, `locked_at` = COALESCE(`locked_at`, `approved_at`)
--   WHERE `approval_status` = 'approved' AND `is_locked` = 0;
--
-- ── Rollback (DESTRUCTIVE) ───────────────────────────────────────────────────
--   ALTER TABLE `pruh_core_grade` DROP COLUMN `is_locked`, DROP COLUMN `locked_at`, DROP COLUMN `locked_by`;
