-- ============================================================================
-- EK-SMS Migration: Per-teacher feedback templates (pruh_core_feedback_template)
-- Date: 2026-06-27
--
-- WHY THIS EXISTS
--   Quick-reply feedback templates were hardcoded and "add template" was a no-op
--   (teacher-dashboard audit #65). getFeedbackTemplates now returns the 4 system
--   defaults plus the teacher's own saved templates, and addFeedbackTemplate persists.
--
--   - DEV: backend boot runs `db.sync({ alter: true })` and creates this table.
--   - PRODUCTION runs `db.sync({ alter: false })`, so RUN THIS MIGRATION on prod.
--
-- HOW TO APPLY (production)
--       mysql -h <PROD_HOST> -P <PORT> -u <USER> -p <DB_NAME> < backend_node/migrations/2026-06-27-feedback-template.sql
--
--   Idempotent: CREATE TABLE IF NOT EXISTS.
-- ============================================================================

CREATE TABLE IF NOT EXISTS `pruh_core_feedback_template` (
  `id`         BIGINT       NOT NULL AUTO_INCREMENT,
  `school_id`  BIGINT       NOT NULL,
  `teacher_id` BIGINT       NOT NULL,
  `label`      VARCHAR(120) NULL,
  `text`       TEXT         NULL,
  `created_at` DATETIME     NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_feedback_template_teacher` (`teacher_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Verify ──────────────────────────────────────────────────────────────────
--   SHOW CREATE TABLE `pruh_core_feedback_template`;
--
-- ── Rollback (DESTRUCTIVE) ───────────────────────────────────────────────────
--   DROP TABLE `pruh_core_feedback_template`;
