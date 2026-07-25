-- ============================================================================
-- EK-SMS Migration: Exam duties table (pruh_exam_duties)
-- Date: 2026-07-10
--
-- WHY THIS EXISTS
--   ExamDuty stores teacher exam supervision assignments (invigilator, reader,
--   etc.) per exam. The Teacher "Exam Duties" tab reads this table.
--
--   DEV: `db.sync({ alter: true })` auto-creates this table.
--   PRODUCTION: `db.sync({ alter: false })` — RUN THIS MIGRATION manually.
--
-- CODE THAT DEPENDS ON THIS TABLE
--   model:  backend_node/src/models/ExamDuty.js
--   route:  GET /api/teacher/exam-duties/  (teacherController.js)
--
-- HOW TO APPLY (production)
--   mysql -h <PROD_HOST> -P <PORT> -u <USER> -p <DB_NAME> < backend_node/migrations/2026-07-10-exam-duty-table.sql
--
--   Idempotent: CREATE TABLE IF NOT EXISTS — safe to re-run.
-- ============================================================================

CREATE TABLE IF NOT EXISTS `pruh_exam_duties` (
    `id`         BIGINT    AUTO_INCREMENT PRIMARY KEY,
    `exam_id`    BIGINT    NOT NULL,
    `teacher_id` BIGINT    NOT NULL,
    `date`       DATETIME  NULL,
    `role`       VARCHAR(255) DEFAULT 'invigilator',
    `is_active`  TINYINT(1)  DEFAULT 1,
    `created_at` DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_ed_exam`    (`exam_id`),
    INDEX `idx_ed_teacher` (`teacher_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Verify ──────────────────────────────────────────────────────────────
--   SHOW TABLES LIKE 'pruh_exam_duties';
--   SELECT COUNT(*) FROM `pruh_exam_duties`;
--
-- ── Rollback (DESTRUCTIVE) ──────────────────────────────────────────────
--   DROP TABLE IF EXISTS `pruh_exam_duties`;
