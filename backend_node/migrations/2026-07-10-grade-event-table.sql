-- ============================================================================
-- EK-SMS Migration: Grade event audit trail (pruh_core_grade_event)
-- Date: 2026-07-10
--
-- WHY THIS EXISTS
--   GradeEvent is the append-only, hash-chained audit trail for every grade
--   mutation. Every grade create/update/submit/approve/reject event inserts a
--   row with the SHA-256 hash of the previous event in the school's chain.
--   The UI guarantees "every grade is cryptographically signed" — this table
--   is that guarantee.
--
--   DEV: `db.sync({ alter: true })` auto-creates this table.
--   PRODUCTION: `db.sync({ alter: false })` — RUN THIS MIGRATION manually.
--
-- CODE THAT DEPENDS ON THIS TABLE
--   model:  backend_node/src/models/GradeEvent.js
--   utils:  backend_node/src/utils/gradeEvent.js  (appendGradeEvent / computeEventHash)
--   utils:  backend_node/src/utils/gradeHistory.js (mapGradeEvents)
--   views:  Teacher GradeHistoryScreen, Principal GradeAudit, Student grade history
--
-- HOW TO APPLY (production)
--   mysql -h <PROD_HOST> -P <PORT> -u <USER> -p <DB_NAME> < backend_node/migrations/2026-07-10-grade-event-table.sql
--
--   Idempotent: CREATE TABLE IF NOT EXISTS — safe to re-run.
-- ============================================================================

CREATE TABLE IF NOT EXISTS `pruh_core_grade_event` (
    `id`                    BIGINT       AUTO_INCREMENT PRIMARY KEY,
    `grade_id`              BIGINT       NULL,
    `school_id`             BIGINT       NOT NULL,
    `student_id`            BIGINT       NULL,
    `subject_id`            BIGINT       NULL,
    `term_id`               BIGINT       NULL,
    `actor_user_id`         BIGINT       NULL,
    `actor_name`            VARCHAR(191) NULL,
    `event_type`            VARCHAR(20)  NOT NULL COMMENT 'create|update|submit|approve|reject|publish|unpublish',
    `field`                 VARCHAR(40)  NULL,
    `old_value`             TEXT         NULL,
    `new_value`             TEXT         NULL,
    `approval_status_after` VARCHAR(20)  NULL,
    `prev_hash`             VARCHAR(64)  NULL,
    `hash`                  VARCHAR(64)  NOT NULL,
    `created_at`            DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_gev_school`   (`school_id`),
    INDEX `idx_ev_grade`     (`grade_id`),
    INDEX `idx_ev_student`   (`student_id`),
    INDEX `idx_ev_event_type`(`event_type`),
    INDEX `idx_ev_created`   (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Verify ──────────────────────────────────────────────────────────────
--   SHOW TABLES LIKE 'pruh_core_grade_event';
--   SELECT COUNT(*) FROM `pruh_core_grade_event`;
--
-- ── Rollback (DESTRUCTIVE — destroys the audit trail) ────────────────────
--   DROP TABLE IF EXISTS `pruh_core_grade_event`;
