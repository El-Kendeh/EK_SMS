-- P0 money-correctness (Principal/Bursar production pass, 2026-07-13).
-- 1) Currency columns FLOAT -> DECIMAL(12,2): binary floating point drifted
--    balances and could misfire the paid/partial threshold. MODIFY is
--    idempotent (re-running is a no-op change to the same type).
-- 2) UNIQUE index on payment receipt numbers: plan 4.2 requires unique
--    receipts; the old ms-timestamp generator could collide.
-- PROD sync is OFF — apply by hand.

ALTER TABLE pruh_finance_fee
  MODIFY amount      DECIMAL(12,2) NOT NULL,
  MODIFY discount    DECIMAL(12,2) DEFAULT 0,
  MODIFY amount_due  DECIMAL(12,2) NOT NULL,
  MODIFY amount_paid DECIMAL(12,2) DEFAULT 0;

ALTER TABLE pruh_finance_payment
  MODIFY amount DECIMAL(12,2) NOT NULL;

ALTER TABLE pruh_finance_expense
  MODIFY amount DECIMAL(12,2) NOT NULL;

ALTER TABLE pruh_finance_fee_category
  MODIFY amount DECIMAL(12,2) NOT NULL;

-- Donations share the same money-rule bug class; converted in the same pass.
ALTER TABLE pruh_core_donation
  MODIFY amount DECIMAL(12,2);

ALTER TABLE pruh_core_donation_campaign
  MODIFY target_amount  DECIMAL(12,2),
  MODIFY current_amount DECIMAL(12,2) DEFAULT 0;

-- Unique receipts (guarded: skip if the index already exists).
SET @c := (SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pruh_finance_payment' AND INDEX_NAME = 'uq_payment_receipt_number');
SET @sql := IF(@c = 0, 'ALTER TABLE pruh_finance_payment ADD UNIQUE INDEX uq_payment_receipt_number (receipt_number)', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- Verify:
--   SHOW COLUMNS FROM pruh_finance_fee LIKE 'amount%';
--   SHOW INDEX FROM pruh_finance_payment WHERE Key_name = 'uq_payment_receipt_number';
