-- Real TOTP 2FA (SA-46): enrolment secret + per-user recovery codes.
-- The old two_factor_enabled writes targeted a column that never existed —
-- every "enable 2FA" toggle was a silent no-op until now.
-- PROD sync is OFF — apply by hand. Idempotent via information_schema guards.

SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'two_factor_enabled');
SET @sql := IF(@c = 0, 'ALTER TABLE users ADD COLUMN two_factor_enabled TINYINT(1) NOT NULL DEFAULT 0', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'two_factor_secret');
SET @sql := IF(@c = 0, 'ALTER TABLE users ADD COLUMN two_factor_secret VARCHAR(64) NULL', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'two_factor_recovery');
SET @sql := IF(@c = 0, 'ALTER TABLE users ADD COLUMN two_factor_recovery TEXT NULL', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- Verify: SHOW COLUMNS FROM users LIKE 'two_factor%';
