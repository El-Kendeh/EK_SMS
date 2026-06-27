-- ============================================================================
-- EK-SMS Migration: Peer-review anonymity flag (pruh_core_peer_review.anonymous)
-- Date: 2026-06-27
--
-- WHY THIS EXISTS
--   The Teacher Peer Review form has an "Submit anonymously" toggle, but
--   pruh_core_peer_review had no column to persist it (teacher-dashboard audit #74).
--   The handler now stores it and the giver's "Reviews I've given" list reflects it.
--
--   - DEV: backend boot runs `db.sync({ alter: true })` and adds it from
--     backend_node/src/models/PeerReview.js.
--   - PRODUCTION runs `db.sync({ alter: false })`, so RUN THIS MIGRATION on prod (or
--     run migrations/run-all-tables.js, which adds it via its column-patch list).
--
-- HOW TO APPLY (production)
--       mysql -h <PROD_HOST> -P <PORT> -u <USER> -p <DB_NAME> < backend_node/migrations/2026-06-27-peer-review-anonymous.sql
--
--   Idempotent: the ADD COLUMN is guarded against the column already existing.
-- ============================================================================

SET @has_anon := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pruh_core_peer_review' AND COLUMN_NAME = 'anonymous');
SET @ddl := IF(@has_anon = 0,
  "ALTER TABLE `pruh_core_peer_review` ADD COLUMN `anonymous` TINYINT(1) NOT NULL DEFAULT 1 AFTER `comment`",
  "SELECT 'column pruh_core_peer_review.anonymous already exists — skipped' AS note");
PREPARE s1 FROM @ddl; EXECUTE s1; DEALLOCATE PREPARE s1;

-- ── Verify ──────────────────────────────────────────────────────────────────
--   SHOW COLUMNS FROM `pruh_core_peer_review` LIKE 'anonymous';
--
-- ── Rollback (DESTRUCTIVE) ───────────────────────────────────────────────────
--   ALTER TABLE `pruh_core_peer_review` DROP COLUMN `anonymous`;
