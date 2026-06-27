-- ============================================================================
-- EK-SMS Migration: Academic-year lifecycle columns (status + deleted_at)
-- Date: 2026-06-25
--
-- WHY THIS EXISTS
--   The SystemAcademicYear model (backend_node/src/models/SystemAcademicYear.js)
--   declares two columns the original `pruh_system_academicyear` table never had:
--       status      ENUM('draft','active','closed','archived') NOT NULL DEFAULT 'draft'
--       deleted_at  DATETIME NULL   (soft-delete marker)
--   Every superadmin academic-year endpoint reads/writes them — getAcademicYears
--   filters on `deleted_at IS NULL`, create/toggle/rollout/restore/clone/close all
--   set `status`. Because Sequelize SELECTs every model attribute, even the plain
--   list load issues `SELECT ... status, deleted_at ...`.
--
--   - DEV does NOT need this run by hand: backend boot runs
--     `db.sync({ alter: true })` (backend_node/src/index.js), which adds the
--     columns automatically from the model.
--   - PRODUCTION runs `db.sync({ alter: false })`, so the columns are NOT added
--     automatically. Without this migration, MySQL raises ER_BAD_FIELD_ERROR and
--     the controllers return 500 — the entire Academic Years page (list load +
--     every lifecycle action) and the SACreateTerm year dropdown break in prod.
--     RUN THIS MIGRATION on the production MySQL database.
--
-- CODE THAT DEPENDS ON THESE COLUMNS
--   model:      backend_node/src/models/SystemAcademicYear.js
--   endpoints:  GET/POST/PUT/DELETE/PATCH /api/academic-years[...]   (superadminDataController.js)
--               POST /api/academic-years/:id/{rollout,restore,clone,close}
--   UI:         src/components/superadmin/SARefDataManager.js (Academic Years mode)
--               src/components/superadmin/SACreateTerm.js
--
-- HOW TO APPLY (production)
--   NOTE: migrations/run-migration.js has HARD-CODED SQL and does NOT take a
--   filename — do not use it for this. Use the mysql client (recommended):
--       mysql -h <PROD_HOST> -P <PORT> -u <USER> -p <DB_NAME> < backend_node/migrations/2026-06-25-academic-year-status-columns.sql
--     (or paste the statements below into phpMyAdmin / Workbench / Adminer)
--
--   Idempotent: each ADD COLUMN is guarded against the column already existing,
--   and the backfill only touches still-default rows — safe to re-run.
-- ============================================================================

-- ── 1. Add `status` (guarded so re-runs are safe) ───────────────────────────
SET @has_status := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME   = 'pruh_system_academicyear'
    AND COLUMN_NAME  = 'status'
);
SET @ddl_status := IF(@has_status = 0,
  "ALTER TABLE `pruh_system_academicyear` ADD COLUMN `status` ENUM('draft','active','closed','archived') NOT NULL DEFAULT 'draft' AFTER `is_active`",
  "SELECT 'column pruh_system_academicyear.status already exists — skipped' AS note"
);
PREPARE s1 FROM @ddl_status; EXECUTE s1; DEALLOCATE PREPARE s1;

-- ── 2. Add `deleted_at` (guarded) ───────────────────────────────────────────
SET @has_deleted_at := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME   = 'pruh_system_academicyear'
    AND COLUMN_NAME  = 'deleted_at'
);
SET @ddl_deleted_at := IF(@has_deleted_at = 0,
  "ALTER TABLE `pruh_system_academicyear` ADD COLUMN `deleted_at` DATETIME NULL AFTER `status`",
  "SELECT 'column pruh_system_academicyear.deleted_at already exists — skipped' AS note"
);
PREPARE s2 FROM @ddl_deleted_at; EXECUTE s2; DEALLOCATE PREPARE s2;

-- ── 3. Backfill: mark the currently-active year(s) as status='active' ────────
--   Inactive rows keep the 'draft' default (is_active alone can't distinguish a
--   draft from a closed/archived year). The `status = 'draft'` guard makes this
--   safe to re-run and never clobbers a status set later by the app.
UPDATE `pruh_system_academicyear`
   SET `status` = 'active'
 WHERE `is_active` = 1
   AND `status` = 'draft';

-- ── Verify ──────────────────────────────────────────────────────────────────
--   SHOW COLUMNS FROM `pruh_system_academicyear` LIKE 'status';
--   SHOW COLUMNS FROM `pruh_system_academicyear` LIKE 'deleted_at';
--   SELECT id, name, is_active, status, deleted_at FROM `pruh_system_academicyear`;
--
-- ── Rollback (DESTRUCTIVE — drops the lifecycle columns) ─────────────────────
--   ALTER TABLE `pruh_system_academicyear` DROP COLUMN `status`, DROP COLUMN `deleted_at`;
