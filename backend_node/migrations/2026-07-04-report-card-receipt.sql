-- ============================================================================
-- EK-SMS Migration: Report-card verification receipts (pruh_core_report_card_receipt)
-- Date: 2026-07-04
--
-- WHY THIS EXISTS
--   Parent report-card downloads are now real PDFs carrying a SHA-256
--   verification hash + QR that resolves at the PUBLIC GET /api/verify/:hash.
--   This table stores one receipt per school+student+term (upserted by
--   parentController.downloadChildReportCard): content_hash fingerprints the
--   canonical JSON of the published grade rows, verification_hash is the
--   public lookup key printed on the PDF. Unchanged content on re-download
--   keeps the SAME hash; a changed published set rotates it.
--
--   - Sequelize sync is DISABLED everywhere — run this by hand on BOTH dev and prod.
--
-- HOW TO APPLY
--       mysql -h <HOST> -P <PORT> -u <USER> -p <DB_NAME> < backend_node/migrations/2026-07-04-report-card-receipt.sql
--
--   Idempotent: CREATE TABLE IF NOT EXISTS with inline keys.
-- ============================================================================

CREATE TABLE IF NOT EXISTS `pruh_core_report_card_receipt` (
  `id`                BIGINT       NOT NULL AUTO_INCREMENT,
  `school_id`         BIGINT       NOT NULL,
  `student_id`        BIGINT       NOT NULL,
  `term_id`           BIGINT       NOT NULL,
  `content_hash`      VARCHAR(64)  NULL,
  `verification_hash` VARCHAR(64)  NULL,
  `generated_at`      DATETIME     NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at`        DATETIME     NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_report_card_receipt_vhash` (`verification_hash`),
  UNIQUE KEY `uniq_report_card_receipt_scope` (`school_id`, `student_id`, `term_id`),
  KEY `idx_report_card_receipt_student` (`student_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Verify ──────────────────────────────────────────────────────────────────
--   SHOW CREATE TABLE `pruh_core_report_card_receipt`;
--
-- ── Rollback (DESTRUCTIVE) ───────────────────────────────────────────────────
--   DROP TABLE `pruh_core_report_card_receipt`;
