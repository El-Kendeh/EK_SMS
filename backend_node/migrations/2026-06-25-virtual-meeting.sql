-- ============================================================================
-- EK-SMS Migration: Virtual Meetings (pruh_core_virtual_meeting)
-- Date: 2026-06-25
--
-- WHY THIS EXISTS
--   The Virtual Meeting feature (school-admin schedules video meetings for an
--   audience of parents / staff / students) is backed by the VirtualMeeting model
--   but no table-creation migration was ever shipped. In DEV the table is
--   auto-created by `db.sync({ alter: true })`; in PRODUCTION boot runs
--   `db.sync({ alter: false })`, so the table is NOT created automatically and
--   the first vm-* request 500s until this migration is run by hand.
--
--   - DEV does NOT need this file run by hand.
--   - PRODUCTION: RUN THIS MIGRATION on the production MySQL database.
--
-- CODE THAT DEPENDS ON THIS TABLE
--   model:     backend_node/src/models/VirtualMeeting.js
--   endpoints: GET/POST/PUT/DELETE /api/virtual-meetings/   (superadminDataController.js)
--   UI:        src/components/superadmin/SAVirtualMeeting.js (vm-parents/vm-staffs/vm-students)
--
-- HOW TO APPLY (production)
--   Option A — mysql client (recommended):
--       mysql -h <PROD_HOST> -P <PORT> -u <USER> -p <DB_NAME> < backend_node/migrations/2026-06-25-virtual-meeting.sql
--     (or paste the CREATE TABLE below into phpMyAdmin / Workbench / Adminer)
--
--   Idempotent: CREATE TABLE IF NOT EXISTS — safe to re-run.
--
-- COLUMN SEMANTICS
--   audience          'parents' | 'staffs' | 'students'
--   status            'scheduled' | 'completed' | 'cancelled'
--   scheduled_at      meeting start time (nullable until set)
--   duration_minutes  default 60
--   created_by        User.id of the admin who scheduled it
-- ============================================================================

CREATE TABLE IF NOT EXISTS `pruh_core_virtual_meeting` (
    `id`               BIGINT       AUTO_INCREMENT PRIMARY KEY,
    `school_id`        BIGINT       NULL,
    `audience`         VARCHAR(20)  NOT NULL DEFAULT 'parents',   -- parents | staffs | students
    `title`            VARCHAR(255) NOT NULL,
    `description`      TEXT         NULL,
    `meeting_url`      VARCHAR(500) NULL,
    `host`             VARCHAR(150) NULL,
    `scheduled_at`     DATETIME     NULL,
    `duration_minutes` INT          NULL DEFAULT 60,
    `status`           VARCHAR(20)  NULL DEFAULT 'scheduled',     -- scheduled | completed | cancelled
    `created_by`       BIGINT       NULL,
    `created_at`       DATETIME     NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`       DATETIME     NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_vm_school`            (`school_id`),
    INDEX `idx_vm_school_audience`   (`school_id`, `audience`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Verify ──────────────────────────────────────────────────────────────────
--   SHOW TABLES LIKE 'pruh_core_virtual_meeting';
--   SHOW INDEX FROM `pruh_core_virtual_meeting`;   -- expect PRIMARY + 2 keys
--   SELECT COUNT(*) FROM `pruh_core_virtual_meeting`;
--
-- ── Rollback (DESTRUCTIVE — drops all scheduled meetings) ────────────────────
--   DROP TABLE IF EXISTS `pruh_core_virtual_meeting`;
