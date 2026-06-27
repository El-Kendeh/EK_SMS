-- ============================================================================
-- EK-SMS Migration: Exam results table (pruh_core_exam_result)
-- Date: 2026-06-27
--
-- WHY THIS EXISTS
--   Teacher exam-result entry used to blind-upsert a row into the term Grade table
--   (pruh_core_grade), which silently nulled the student's existing ca/midterm and
--   never stored the marks against the exam (teacher-dashboard audit #30). It now
--   writes to a dedicated ExamResult table keyed (exam_id, student_id), leaving term
--   grades untouched. The model exists (backend_node/src/models/ExamResult.js) but
--   prod had no table for it.
--
--   - DEV: backend boot runs `db.sync({ alter: true })` and creates this table
--     automatically from the model.
--   - PRODUCTION runs `db.sync({ alter: false })`, so RUN THIS MIGRATION on the
--     production MySQL database. Without it, every getTeacherExams / getExamResults /
--     saveExamResults call 500s (model SELECT/INSERT against a missing table).
--
-- HOW TO APPLY (production)
--       mysql -h <PROD_HOST> -P <PORT> -u <USER> -p <DB_NAME> < backend_node/migrations/2026-06-27-exam-result.sql
--
--   Idempotent: CREATE TABLE IF NOT EXISTS + a guarded UNIQUE index.
-- ============================================================================

CREATE TABLE IF NOT EXISTS `pruh_core_exam_result` (
  `id`         BIGINT       NOT NULL AUTO_INCREMENT,
  `school_id`  BIGINT       NOT NULL,
  `exam_id`    BIGINT       NOT NULL,
  `student_id` BIGINT       NOT NULL,
  `marks`      FLOAT        NULL,
  `remarks`    VARCHAR(255) NULL,
  `created_at` DATETIME     NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_exam_result_exam` (`exam_id`),
  KEY `idx_exam_result_school` (`school_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Unique (exam_id, student_id) so saving results upserts cleanly ───────────
SET @has_uniq := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME   = 'pruh_core_exam_result'
    AND INDEX_NAME   = 'uniq_exam_result_exam_student'
);
SET @ddl := IF(@has_uniq = 0,
  "ALTER TABLE `pruh_core_exam_result` ADD UNIQUE KEY `uniq_exam_result_exam_student` (`exam_id`, `student_id`)",
  "SELECT 'unique key uniq_exam_result_exam_student already exists — skipped' AS note"
);
PREPARE s1 FROM @ddl; EXECUTE s1; DEALLOCATE PREPARE s1;

-- ── Verify ──────────────────────────────────────────────────────────────────
--   SHOW CREATE TABLE `pruh_core_exam_result`;
--   SHOW INDEX FROM `pruh_core_exam_result`;
--
-- ── Rollback (DESTRUCTIVE) ───────────────────────────────────────────────────
--   DROP TABLE `pruh_core_exam_result`;
