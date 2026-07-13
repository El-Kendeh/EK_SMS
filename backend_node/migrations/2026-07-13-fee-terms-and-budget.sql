-- P1 bursar features (plan 4.1/4.3): late fees, installments, scholarship
-- labels, and a per-term budget for revenue-vs-budget dashboards.
-- PROD sync is OFF — apply by hand. Idempotent via information_schema guards.

-- FeeCategory: late-fee policy (plan 4.1 "Late fee calculation").
SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pruh_finance_fee_category' AND COLUMN_NAME = 'late_fee_amount');
SET @sql := IF(@c = 0, 'ALTER TABLE pruh_finance_fee_category ADD COLUMN late_fee_amount DECIMAL(12,2) NOT NULL DEFAULT 0', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pruh_finance_fee_category' AND COLUMN_NAME = 'grace_days');
SET @sql := IF(@c = 0, 'ALTER TABLE pruh_finance_fee_category ADD COLUMN grace_days INT NOT NULL DEFAULT 0', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- Fee: installment plan (plan 4.1 "Installment plans") + scholarship label.
SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pruh_finance_fee' AND COLUMN_NAME = 'installment_count');
SET @sql := IF(@c = 0, 'ALTER TABLE pruh_finance_fee ADD COLUMN installment_count INT NOT NULL DEFAULT 1', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pruh_finance_fee' AND COLUMN_NAME = 'discount_reason');
SET @sql := IF(@c = 0, 'ALTER TABLE pruh_finance_fee ADD COLUMN discount_reason VARCHAR(120) NULL', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- Budget (plan 4.3 "Revenue vs. budget"): one amount per school+term+category.
CREATE TABLE IF NOT EXISTS pruh_finance_budget (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  school_id BIGINT NOT NULL,
  term_id BIGINT NULL,
  category VARCHAR(120) NOT NULL DEFAULT 'general',
  amount DECIMAL(12,2) NOT NULL,
  notes VARCHAR(255) NULL,
  created_by BIGINT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_budget_scope (school_id, term_id, category)
);

-- Verify:
--   SHOW COLUMNS FROM pruh_finance_fee_category LIKE '%late%';
--   SHOW COLUMNS FROM pruh_finance_fee LIKE 'installment%';
--   SHOW TABLES LIKE 'pruh_finance_budget';
