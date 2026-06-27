-- ============================================================================
-- EK-SMS Migration: Grade receipt ledger (pruh_core_grade_receipt)
-- Date: 2026-06-27
--
-- WHY THIS EXISTS
--   Locking a batch of grades promised a "cryptographic receipt" the teacher could
--   save and a third party could verify, but no such record existed — the modal was
--   never mounted and the verify route 404'd (teacher-dashboard audit #17/#87).
--   submitGradesForLocking now writes a hash-chained GradeReceipt (content hash +
--   prev_hash at a chain_position), returns it to the receipt modal, and the public
--   GET /api/verify/:hash looks it up.
--
--   - DEV: backend boot runs `db.sync({ alter: true })` and creates this table.
--   - PRODUCTION runs `db.sync({ alter: false })`, so RUN THIS MIGRATION on prod.
--
-- HOW TO APPLY (production)
--       mysql -h <PROD_HOST> -P <PORT> -u <USER> -p <DB_NAME> < backend_node/migrations/2026-06-27-grade-receipt.sql
--
--   Idempotent: CREATE TABLE IF NOT EXISTS + a guarded UNIQUE index.
-- ============================================================================

CREATE TABLE IF NOT EXISTS `pruh_core_grade_receipt` (
  `id`                BIGINT       NOT NULL AUTO_INCREMENT,
  `school_id`         BIGINT       NOT NULL,
  `teacher_id`        BIGINT       NULL,
  `subject_id`        BIGINT       NULL,
  `term_id`           BIGINT       NULL,
  `classroom_id`      BIGINT       NULL,
  `count`             INT          NULL DEFAULT 0,
  `average`           FLOAT        NULL,
  `content_hash`      VARCHAR(64)  NULL,
  `verification_hash` VARCHAR(64)  NULL,
  `prev_hash`         VARCHAR(64)  NULL,
  `chain_position`    INT          NULL DEFAULT 1,
  `submitted_at`      DATETIME     NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at`        DATETIME     NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_grade_receipt_school` (`school_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET @has_uniq := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME   = 'pruh_core_grade_receipt'
    AND INDEX_NAME   = 'uniq_grade_receipt_vhash'
);
SET @ddl := IF(@has_uniq = 0,
  "ALTER TABLE `pruh_core_grade_receipt` ADD UNIQUE KEY `uniq_grade_receipt_vhash` (`verification_hash`)",
  "SELECT 'unique key uniq_grade_receipt_vhash already exists — skipped' AS note"
);
PREPARE s1 FROM @ddl; EXECUTE s1; DEALLOCATE PREPARE s1;

-- ── Verify ──────────────────────────────────────────────────────────────────
--   SHOW CREATE TABLE `pruh_core_grade_receipt`;
--
-- ── Rollback (DESTRUCTIVE) ───────────────────────────────────────────────────
--   DROP TABLE `pruh_core_grade_receipt`;
