-- ============================================================================
-- EK-SMS Migration: Exam type column (pruh_core_exam.exam_type)
-- Date: 2026-06-28
--
-- WHY THIS EXISTS
--   The school-admin Examination form lets the admin pick an exam Type
--   (C.A. / Mid-Term / Final / Mock / Quiz), but createExam dropped the value
--   (no column) so every exam showed a blank Type badge. The Exam model now
--   declares `exam_type`; createExam persists it and getExams returns it.
--
--   - DEV auto-adds the column via db.sync({ alter: true }) (NODE_ENV !== production).
--   - PRODUCTION runs db.sync({ alter: false }) — RUN THIS MIGRATION by hand so the
--     column exists; without it, createExam INSERT and getExams SELECT will fail.
--
-- CODE THAT DEPENDS ON THIS COLUMN
--   model:    backend_node/src/models/Exam.js (exam_type STRING(30) default 'final')
--   write:    schoolController.createExam   (POST /api/school/exams/)
--   read:     schoolController.getExams     (GET  /api/school/exams/)
--   UI:       src/components/schooladmin/NewPages.js (ExamsPage Type dropdown + badge)
--
-- HOW TO APPLY (production)
--   mysql -h <PROD_HOST> -P <PORT> -u <USER> -p <DB_NAME> < backend_node/migrations/2026-06-28-exam-type.sql
--   Idempotent: ADD COLUMN IF NOT EXISTS — safe to re-run.
-- ============================================================================

ALTER TABLE `pruh_core_exam`
  ADD COLUMN IF NOT EXISTS `exam_type` VARCHAR(30) NULL DEFAULT 'final' AFTER `total_marks`;

-- ── Verify ──────────────────────────────────────────────────────────────────
--   SHOW COLUMNS FROM `pruh_core_exam` LIKE 'exam_type';
--   SELECT id, name, exam_type FROM `pruh_core_exam` LIMIT 5;
--
-- ── Rollback ─────────────────────────────────────────────────────────────────
--   ALTER TABLE `pruh_core_exam` DROP COLUMN `exam_type`;
