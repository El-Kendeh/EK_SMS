-- EK_SMS Migration Script
-- Date: 2026-05-18
-- Purpose: Create new finance tables and add missing columns to existing tables
-- Run: mysql -u <user> -p <database> < migrations/2026-05-18-finance-and-approvals.sql

-- ============================================
-- 1. New Finance Tables
-- ============================================

-- Fee Categories
CREATE TABLE IF NOT EXISTS `pruh_finance_fee_category` (
  `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `school_id` BIGINT NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `amount` FLOAT NOT NULL,
  `frequency` VARCHAR(50) DEFAULT 'term',
  `applicable_classes` TEXT,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Individual Fees (assigned to students)
CREATE TABLE IF NOT EXISTS `pruh_finance_fee` (
  `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `school_id` BIGINT NOT NULL,
  `student_id` BIGINT NOT NULL,
  `fee_category_id` BIGINT NOT NULL,
  `term_id` BIGINT,
  `amount` FLOAT NOT NULL,
  `discount` FLOAT DEFAULT 0,
  `amount_due` FLOAT NOT NULL,
  `amount_paid` FLOAT DEFAULT 0,
  `status` VARCHAR(50) DEFAULT 'pending',
  `due_date` DATETIME,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Payments
CREATE TABLE IF NOT EXISTS `pruh_finance_payment` (
  `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `school_id` BIGINT NOT NULL,
  `student_id` BIGINT NOT NULL,
  `fee_id` BIGINT,
  `amount` FLOAT NOT NULL,
  `payment_method` VARCHAR(50) DEFAULT 'cash',
  `reference` VARCHAR(255),
  `receipt_number` VARCHAR(255),
  `payment_hash` VARCHAR(255),
  `status` VARCHAR(50) DEFAULT 'completed',
  `notes` TEXT,
  `paid_by` VARCHAR(255),
  `paid_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Expenses
CREATE TABLE IF NOT EXISTS `pruh_finance_expense` (
  `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `school_id` BIGINT NOT NULL,
  `category` VARCHAR(255) NOT NULL,
  `description` TEXT NOT NULL,
  `amount` FLOAT NOT NULL,
  `date` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `receipt_path` VARCHAR(500),
  `approved_by` BIGINT,
  `status` VARCHAR(50) DEFAULT 'approved',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- 2. Indexes for Performance
-- ============================================

CREATE INDEX IF NOT EXISTS `idx_fee_school` ON `pruh_finance_fee` (`school_id`);
CREATE INDEX IF NOT EXISTS `idx_fee_student` ON `pruh_finance_fee` (`student_id`);
CREATE INDEX IF NOT EXISTS `idx_fee_category` ON `pruh_finance_fee` (`fee_category_id`);
CREATE INDEX IF NOT EXISTS `idx_fee_term` ON `pruh_finance_fee` (`term_id`);

CREATE INDEX IF NOT EXISTS `idx_payment_school` ON `pruh_finance_payment` (`school_id`);
CREATE INDEX IF NOT EXISTS `idx_payment_student` ON `pruh_finance_payment` (`student_id`);
CREATE INDEX IF NOT EXISTS `idx_payment_fee` ON `pruh_finance_payment` (`fee_id`);

CREATE INDEX IF NOT EXISTS `idx_expense_school` ON `pruh_finance_expense` (`school_id`);

CREATE INDEX IF NOT EXISTS `idx_fee_category_school` ON `pruh_finance_fee_category` (`school_id`);

-- ============================================
-- 3. Alter Existing Tables
-- ============================================

-- Add approval fields to Grade table
ALTER TABLE `pruh_core_grade`
  ADD COLUMN IF NOT EXISTS `approval_status` VARCHAR(50) DEFAULT 'pending' AFTER `remarks`,
  ADD COLUMN IF NOT EXISTS `approved_by` BIGINT AFTER `approval_status`,
  ADD COLUMN IF NOT EXISTS `approved_at` DATETIME AFTER `approved_by`;

-- Add user_id to Notification table for targeted notifications
ALTER TABLE `pruh_core_notification`
  ADD COLUMN IF NOT EXISTS `user_id` BIGINT AFTER `school_id`;

-- ============================================
-- 4. Verification Queries
-- ============================================

SELECT 'Migration complete. Verifying tables...' AS status;

SELECT COUNT(*) AS fee_categories FROM `pruh_finance_fee_category`;
SELECT COUNT(*) AS fees FROM `pruh_finance_fee`;
SELECT COUNT(*) AS payments FROM `pruh_finance_payment`;
SELECT COUNT(*) AS expenses FROM `pruh_finance_expense`;

SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'pruh_core_grade'
  AND COLUMN_NAME IN ('approval_status', 'approved_by', 'approved_at');

SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'pruh_core_notification'
  AND COLUMN_NAME = 'user_id';
