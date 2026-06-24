-- EK_SMS Migration Script
-- Date: 2026-06-23
-- Purpose:
--   1. Create the AI Document Capture history table (feature 2.3).
--   2. Add the expense approval workflow columns (feature 5.6) so recorded
--      expenses start 'pending' and require principal/school_admin approval.
-- Run: mysql -u <user> -p <database> < migrations/2026-06-23-ai-capture-and-expense-approval.sql
--
-- NOTE: in non-production the Node app auto-syncs models (db.sync({ alter:true })),
-- so this script is only required for PRODUCTION where sync is disabled.

-- ============================================
-- 1. AI Document Capture history
-- ============================================

CREATE TABLE IF NOT EXISTS `pruh_school_ai_document_capture` (
  `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `school_id` BIGINT NOT NULL,
  `document_type` VARCHAR(50) NOT NULL DEFAULT 'other',
  `status` VARCHAR(50) NOT NULL DEFAULT 'processing',
  `file_name` VARCHAR(255),
  `file_size` INT,
  `file_mimetype` VARCHAR(100),
  `rows_count` INT DEFAULT 0,
  `extracted_rows` LONGTEXT,
  `error` TEXT,
  `uploaded_by` BIGINT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX IF NOT EXISTS `idx_aicapture_school_created` ON `pruh_school_ai_document_capture` (`school_id`, `created_at`);
CREATE INDEX IF NOT EXISTS `idx_aicapture_school_status`  ON `pruh_school_ai_document_capture` (`school_id`, `status`);

-- ============================================
-- 2. Expense approval workflow
-- ============================================

ALTER TABLE `pruh_finance_expense`
  ADD COLUMN IF NOT EXISTS `created_by` BIGINT AFTER `receipt_path`,
  ADD COLUMN IF NOT EXISTS `approved_at` DATETIME AFTER `approved_by`,
  ADD COLUMN IF NOT EXISTS `rejection_reason` TEXT AFTER `approved_at`;

-- Safety: legacy expenses pre-date the workflow and were effectively on the books.
-- Backfill any NULL/empty status to 'approved' BEFORE flipping the column default so no
-- historical row is left in an ambiguous state.
UPDATE `pruh_finance_expense` SET `status` = 'approved' WHERE `status` IS NULL OR `status` = '';

-- New expenses must start 'pending'. Existing rows keep their (now-backfilled) value.
ALTER TABLE `pruh_finance_expense`
  MODIFY COLUMN `status` VARCHAR(50) DEFAULT 'pending';

CREATE INDEX IF NOT EXISTS `idx_expense_school_status` ON `pruh_finance_expense` (`school_id`, `status`);

-- ============================================
-- 3. Verification
-- ============================================

SELECT 'Migration complete. Verifying...' AS status;

SELECT COUNT(*) AS ai_capture_rows FROM `pruh_school_ai_document_capture`;

SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'pruh_finance_expense'
  AND COLUMN_NAME IN ('created_by', 'approved_at', 'rejection_reason', 'status');
