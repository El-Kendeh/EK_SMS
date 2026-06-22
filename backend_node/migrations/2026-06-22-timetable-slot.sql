-- ============================================================================
-- EK-SMS Migration: Timetable persistence (pruh_core_timetable_slot)
-- Date: 2026-06-22
--
-- WHY THIS EXISTS
--   Timetabling was previously non-functional: the school-admin "Timetable
--   Manager", the teacher "My Timetable" and the student "Class Timetable" all
--   synthesized fake data on the fly and persisted NOTHING. A new persistence
--   model (TimetableSlot) is now the single source of truth, so this table must
--   exist for the feature to work.
--
--   - DEV does NOT need this file run by hand: backend boot runs
--     `db.sync({ alter: true })` (see backend_node/src/index.js), which
--     auto-creates the table from the model.
--   - PRODUCTION runs `db.sync({ alter: false })`, so the table is NOT created
--     automatically. RUN THIS MIGRATION on the production MySQL database.
--
-- CODE THAT DEPENDS ON THIS TABLE
--   model:       backend_node/src/models/TimetableSlot.js
--   endpoints:   GET/POST/DELETE /api/school/timetable[...]   (schoolController.js)
--                GET /api/student/timetable/                  (studentController.js)
--                GET /api/teacher/timetable/                  (teacherController.js)
--   manager UI:  src/components/schooladmin/NewPages.js  (TimetablePage)
--
-- HOW TO APPLY (production)
--   NOTE: migrations/run-migration.js is a one-off with HARD-CODED SQL inside —
--   it does NOT take a filename. Do not use it for this. Use either:
--
--   Option A — mysql client (recommended): run this file against the prod DB:
--       mysql -h <PROD_HOST> -P <PORT> -u <USER> -p <DB_NAME> < backend_node/migrations/2026-06-22-timetable-slot.sql
--     (or paste the CREATE TABLE below into any DB console — phpMyAdmin, Workbench, Adminer)
--
--   Option B — Node, via the project's own connection (creates from the model):
--       cd backend_node && node scripts/create-timetable-table.js
--     This runs TimetableSlot.sync() using backend_node/.env — so point .env (or
--     the DB_* env vars) at the PROD database when running it for production.
--
--   Idempotent: CREATE TABLE IF NOT EXISTS — safe to re-run either way.
--
-- COLUMN SEMANTICS
--   day        0 = Monday … 4 = Friday
--   period     1-based period index within the day (P1, P2, …)
--   is_break   1 = a break/recess row (no subject/teacher); 0 = a teaching slot
--   start_time / end_time   'HH:MM' (generator uses 60-min blocks from 08:00)
--   subject_id / teacher_id  nullable (break rows + unassigned subjects)
-- ============================================================================

CREATE TABLE IF NOT EXISTS `pruh_core_timetable_slot` (
    `id`         BIGINT       AUTO_INCREMENT PRIMARY KEY,
    `school_id`  BIGINT       NOT NULL,
    `class_id`   BIGINT       NOT NULL,
    `day`        INT          NOT NULL,                 -- 0=Mon .. 4=Fri
    `period`     INT          NOT NULL,                 -- 1-based
    `subject_id` BIGINT       NULL,
    `teacher_id` BIGINT       NULL,
    `start_time` VARCHAR(5)   NULL,                     -- 'HH:MM'
    `end_time`   VARCHAR(5)   NULL,
    `room`       VARCHAR(255) NULL,
    `is_break`   TINYINT(1)   NOT NULL DEFAULT 0,
    `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY `ux_timetable_class_day_period` (`class_id`, `day`, `period`),
    INDEX `idx_timetable_school`  (`school_id`),
    INDEX `idx_timetable_class`   (`class_id`),
    INDEX `idx_timetable_teacher` (`teacher_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Verify ──────────────────────────────────────────────────────────────────
--   SHOW TABLES LIKE 'pruh_core_timetable_slot';
--   SHOW INDEX FROM `pruh_core_timetable_slot`;   -- expect PRIMARY + 4 keys
--   SELECT COUNT(*) FROM `pruh_core_timetable_slot`;
--
-- ── Rollback (DESTRUCTIVE — drops all saved timetables) ──────────────────────
--   DROP TABLE IF EXISTS `pruh_core_timetable_slot`;
