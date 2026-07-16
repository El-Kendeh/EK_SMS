-- Tenant-scoping index backfill (2026-07-16)
--
-- Every tenant-scoped read filters WHERE school_id = ?. 46 of 52 tables with a
-- school_id column already have a leading index on it; these 6 did not, so their
-- reads were full scans that get linearly slower as schools/data grow. Adds the
-- missing single-column indexes. Additive only — no API or data change.
--
-- Prod DB sync is OFF: apply by hand (already applied to dev). Run once — MySQL
-- has no ADD INDEX IF NOT EXISTS, so re-running errors on the duplicate name.

ALTER TABLE `pruh_core_bursar`            ADD INDEX `idx_bursar_school_id`            (`school_id`);
ALTER TABLE `pruh_core_principal`         ADD INDEX `idx_principal_school_id`         (`school_id`);
ALTER TABLE `pruh_core_exam_result`       ADD INDEX `idx_exam_result_school_id`       (`school_id`);
ALTER TABLE `pruh_core_feedback_template` ADD INDEX `idx_feedback_template_school_id` (`school_id`);
ALTER TABLE `pruh_core_grade_event`       ADD INDEX `idx_grade_event_school_id`       (`school_id`);
ALTER TABLE `pruh_core_virtual_meeting`   ADD INDEX `idx_virtual_meeting_school_id`   (`school_id`);
