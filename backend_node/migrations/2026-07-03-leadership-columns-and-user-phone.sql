-- Principal Leadership Team: persist role/access_level/is_active on the
-- SchoolAdmin link row (they were silently dropped before — the model had no
-- such columns, so every member rendered "Principal / Full / Active"), and
-- give users a phone column (Leadership + Finance-team forms collect one).
-- role/access_level stay NULLable on purpose: the tenant school_admin's own
-- link row must not be mislabeled "Principal" (readers fall back per-row).
-- NOTE: prod sync is OFF — run this manually on prod as well.

ALTER TABLE pruh_core_schooladmin
  ADD COLUMN role VARCHAR(50) NULL AFTER must_change_password,
  ADD COLUMN access_level VARCHAR(20) NULL AFTER role,
  ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1 AFTER access_level;

ALTER TABLE users
  ADD COLUMN phone VARCHAR(20) NULL AFTER last_name;
