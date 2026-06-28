-- Modification-request flow repair (audit #29/#32/#33).
-- Adds evidence_url (teacher's supporting file) and review_reason (admin's
-- rejection note) so the grade-correction request flow can store/show both.
-- Idempotent: guarded by information_schema so it is safe to re-run.
-- PROD sync is OFF — apply this by hand.

SET @col_evidence := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pruh_core_modification_request' AND COLUMN_NAME = 'evidence_url');
SET @sql := IF(@col_evidence = 0,
  'ALTER TABLE pruh_core_modification_request ADD COLUMN evidence_url VARCHAR(500) NULL',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_review := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pruh_core_modification_request' AND COLUMN_NAME = 'review_reason');
SET @sql := IF(@col_review = 0,
  'ALTER TABLE pruh_core_modification_request ADD COLUMN review_reason TEXT NULL',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
