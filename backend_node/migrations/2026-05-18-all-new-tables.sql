-- EK-SMS Migration: Create all new tables
-- Date: 2026-05-18

-- 1. pruh_core_message
CREATE TABLE IF NOT EXISTS `pruh_core_message` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `school_id` BIGINT NOT NULL,
    `sender_id` BIGINT,
    `sender_type` VARCHAR(50),
    `recipient_id` BIGINT,
    `recipient_type` VARCHAR(50),
    `subject` VARCHAR(255),
    `body` TEXT,
    `is_read` TINYINT(1) DEFAULT 0,
    `thread_id` VARCHAR(100),
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_school_id` (`school_id`),
    INDEX `idx_sender_id` (`sender_id`),
    INDEX `idx_recipient_id` (`recipient_id`),
    INDEX `idx_thread_id` (`thread_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. pruh_core_assignment
CREATE TABLE IF NOT EXISTS `pruh_core_assignment` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `school_id` BIGINT NOT NULL,
    `class_id` BIGINT,
    `subject_id` BIGINT,
    `teacher_id` BIGINT,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT,
    `due_date` DATE,
    `max_score` FLOAT,
    `attachment_path` VARCHAR(500),
    `is_active` TINYINT(1) DEFAULT 1,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_school_id` (`school_id`),
    INDEX `idx_class_id` (`class_id`),
    INDEX `idx_subject_id` (`subject_id`),
    INDEX `idx_teacher_id` (`teacher_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. pruh_core_assignment_submission
CREATE TABLE IF NOT EXISTS `pruh_core_assignment_submission` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `assignment_id` BIGINT NOT NULL,
    `student_id` BIGINT NOT NULL,
    `submitted_at` DATE,
    `content` TEXT,
    `attachment_path` VARCHAR(500),
    `score` FLOAT,
    `feedback` TEXT,
    `status` VARCHAR(50) DEFAULT 'pending',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_assignment_id` (`assignment_id`),
    INDEX `idx_student_id` (`student_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. pruh_core_learning_resource
CREATE TABLE IF NOT EXISTS `pruh_core_learning_resource` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `school_id` BIGINT NOT NULL,
    `class_id` BIGINT,
    `subject_id` BIGINT,
    `teacher_id` BIGINT,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT,
    `resource_type` VARCHAR(50),
    `file_path` VARCHAR(500),
    `url` VARCHAR(500),
    `is_active` TINYINT(1) DEFAULT 1,
    `download_count` INT DEFAULT 0,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_school_id` (`school_id`),
    INDEX `idx_class_id` (`class_id`),
    INDEX `idx_subject_id` (`subject_id`),
    INDEX `idx_teacher_id` (`teacher_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. pruh_core_office_hour
CREATE TABLE IF NOT EXISTS `pruh_core_office_hour` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `school_id` BIGINT NOT NULL,
    `teacher_id` BIGINT NOT NULL,
    `date` DATE,
    `start_time` VARCHAR(10),
    `end_time` VARCHAR(10),
    `slot_duration_minutes` INT DEFAULT 30,
    `max_bookings` INT DEFAULT 1,
    `is_active` TINYINT(1) DEFAULT 1,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_school_id` (`school_id`),
    INDEX `idx_teacher_id` (`teacher_id`),
    INDEX `idx_date` (`date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. pruh_core_office_hour_booking
CREATE TABLE IF NOT EXISTS `pruh_core_office_hour_booking` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `office_hour_id` BIGINT NOT NULL,
    `student_id` BIGINT,
    `parent_id` BIGINT,
    `status` VARCHAR(50) DEFAULT 'booked',
    `notes` TEXT,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_office_hour_id` (`office_hour_id`),
    INDEX `idx_student_id` (`student_id`),
    INDEX `idx_parent_id` (`parent_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. pruh_core_behaviour_incident
CREATE TABLE IF NOT EXISTS `pruh_core_behaviour_incident` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `school_id` BIGINT NOT NULL,
    `student_id` BIGINT NOT NULL,
    `reported_by` BIGINT,
    `incident_type` VARCHAR(100),
    `severity` VARCHAR(50),
    `description` TEXT,
    `action_taken` TEXT,
    `follow_up_required` TINYINT(1) DEFAULT 0,
    `follow_up_date` DATE,
    `parent_notified` TINYINT(1) DEFAULT 0,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_school_id` (`school_id`),
    INDEX `idx_student_id` (`student_id`),
    INDEX `idx_reported_by` (`reported_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. pruh_core_lesson_plan
CREATE TABLE IF NOT EXISTS `pruh_core_lesson_plan` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `school_id` BIGINT NOT NULL,
    `teacher_id` BIGINT NOT NULL,
    `class_id` BIGINT,
    `subject_id` BIGINT,
    `date` DATE,
    `topic` VARCHAR(255),
    `objectives` TEXT,
    `activities` TEXT,
    `materials` TEXT,
    `homework` TEXT,
    `reflection` TEXT,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_school_id` (`school_id`),
    INDEX `idx_teacher_id` (`teacher_id`),
    INDEX `idx_class_id` (`class_id`),
    INDEX `idx_subject_id` (`subject_id`),
    INDEX `idx_date` (`date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. pruh_core_student_goal
CREATE TABLE IF NOT EXISTS `pruh_core_student_goal` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `school_id` BIGINT NOT NULL,
    `student_id` BIGINT NOT NULL,
    `title` VARCHAR(255),
    `description` TEXT,
    `target_date` DATE,
    `status` VARCHAR(50) DEFAULT 'active',
    `progress_pct` INT DEFAULT 0,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_school_id` (`school_id`),
    INDEX `idx_student_id` (`student_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 10. pruh_core_study_group
CREATE TABLE IF NOT EXISTS `pruh_core_study_group` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `school_id` BIGINT NOT NULL,
    `name` VARCHAR(255),
    `subject_id` BIGINT,
    `teacher_id` BIGINT,
    `description` TEXT,
    `meeting_schedule` VARCHAR(255),
    `is_active` TINYINT(1) DEFAULT 1,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_school_id` (`school_id`),
    INDEX `idx_subject_id` (`subject_id`),
    INDEX `idx_teacher_id` (`teacher_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 11. pruh_core_study_group_member
CREATE TABLE IF NOT EXISTS `pruh_core_study_group_member` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `study_group_id` BIGINT NOT NULL,
    `student_id` BIGINT NOT NULL,
    `role` VARCHAR(50) DEFAULT 'member',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_study_group_id` (`study_group_id`),
    INDEX `idx_student_id` (`student_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 12. pruh_core_conference_slot
CREATE TABLE IF NOT EXISTS `pruh_core_conference_slot` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `school_id` BIGINT NOT NULL,
    `teacher_id` BIGINT,
    `date` DATE,
    `start_time` VARCHAR(10),
    `end_time` VARCHAR(10),
    `status` VARCHAR(50) DEFAULT 'available',
    `parent_id` BIGINT,
    `notes` TEXT,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_school_id` (`school_id`),
    INDEX `idx_teacher_id` (`teacher_id`),
    INDEX `idx_parent_id` (`parent_id`),
    INDEX `idx_date` (`date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 13. pruh_core_pickup_person
CREATE TABLE IF NOT EXISTS `pruh_core_pickup_person` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `school_id` BIGINT NOT NULL,
    `student_id` BIGINT NOT NULL,
    `name` VARCHAR(255),
    `phone` VARCHAR(50),
    `relationship` VARCHAR(100),
    `is_authorized` TINYINT(1) DEFAULT 1,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_school_id` (`school_id`),
    INDEX `idx_student_id` (`student_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 14. pruh_core_permission_slip
CREATE TABLE IF NOT EXISTS `pruh_core_permission_slip` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `school_id` BIGINT NOT NULL,
    `title` VARCHAR(255),
    `description` TEXT,
    `event_date` DATE,
    `expiry_date` DATE,
    `is_active` TINYINT(1) DEFAULT 1,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_school_id` (`school_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 15. pruh_core_permission_slip_signature
CREATE TABLE IF NOT EXISTS `pruh_core_permission_slip_signature` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `slip_id` BIGINT NOT NULL,
    `student_id` BIGINT,
    `parent_id` BIGINT,
    `signed_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `signature_hash` VARCHAR(255),
    INDEX `idx_slip_id` (`slip_id`),
    INDEX `idx_student_id` (`student_id`),
    INDEX `idx_parent_id` (`parent_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 16. pruh_core_student_document
CREATE TABLE IF NOT EXISTS `pruh_core_student_document` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `school_id` BIGINT NOT NULL,
    `student_id` BIGINT NOT NULL,
    `title` VARCHAR(255),
    `file_path` VARCHAR(500),
    `file_type` VARCHAR(100),
    `uploaded_by` BIGINT,
    `is_verified` TINYINT(1) DEFAULT 0,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_school_id` (`school_id`),
    INDEX `idx_student_id` (`student_id`),
    INDEX `idx_uploaded_by` (`uploaded_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 17. pruh_core_transcript_request
CREATE TABLE IF NOT EXISTS `pruh_core_transcript_request` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `school_id` BIGINT NOT NULL,
    `student_id` BIGINT NOT NULL,
    `requested_by` BIGINT,
    `status` VARCHAR(50) DEFAULT 'pending',
    `requested_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `completed_at` DATETIME,
    INDEX `idx_school_id` (`school_id`),
    INDEX `idx_student_id` (`student_id`),
    INDEX `idx_requested_by` (`requested_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 18. pruh_core_study_plan
CREATE TABLE IF NOT EXISTS `pruh_core_study_plan` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `school_id` BIGINT NOT NULL,
    `student_id` BIGINT NOT NULL,
    `day_of_week` VARCHAR(20),
    `start_time` VARCHAR(10),
    `end_time` VARCHAR(10),
    `subject` VARCHAR(100),
    `activity` TEXT,
    `is_active` TINYINT(1) DEFAULT 1,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_school_id` (`school_id`),
    INDEX `idx_student_id` (`student_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 19. pruh_core_resource_visit
CREATE TABLE IF NOT EXISTS `pruh_core_resource_visit` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `resource_id` BIGINT NOT NULL,
    `student_id` BIGINT NOT NULL,
    `visited_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_resource_id` (`resource_id`),
    INDEX `idx_student_id` (`student_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 20. pruh_core_donation_campaign
CREATE TABLE IF NOT EXISTS `pruh_core_donation_campaign` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `school_id` BIGINT NOT NULL,
    `title` VARCHAR(255),
    `description` TEXT,
    `target_amount` FLOAT,
    `current_amount` FLOAT DEFAULT 0,
    `start_date` DATE,
    `end_date` DATE,
    `is_active` TINYINT(1) DEFAULT 1,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_school_id` (`school_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 21. pruh_core_donation
CREATE TABLE IF NOT EXISTS `pruh_core_donation` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `campaign_id` BIGINT NOT NULL,
    `donor_id` BIGINT,
    `amount` FLOAT,
    `is_anonymous` TINYINT(1) DEFAULT 0,
    `receipt_hash` VARCHAR(255),
    `paid_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_campaign_id` (`campaign_id`),
    INDEX `idx_donor_id` (`donor_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 22. pruh_core_acknowledgment
CREATE TABLE IF NOT EXISTS `pruh_core_acknowledgment` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `school_id` BIGINT NOT NULL,
    `user_id` BIGINT NOT NULL,
    `record_type` VARCHAR(100),
    `record_id` BIGINT,
    `acknowledged_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_school_id` (`school_id`),
    INDEX `idx_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 23. pruh_core_co_guardian
CREATE TABLE IF NOT EXISTS `pruh_core_co_guardian` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `school_id` BIGINT NOT NULL,
    `student_id` BIGINT NOT NULL,
    `guardian_user_id` BIGINT,
    `relationship` VARCHAR(100),
    `status` VARCHAR(50) DEFAULT 'pending',
    `invited_at` DATETIME,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_school_id` (`school_id`),
    INDEX `idx_student_id` (`student_id`),
    INDEX `idx_guardian_user_id` (`guardian_user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 24. pruh_core_channel_preference
CREATE TABLE IF NOT EXISTS `pruh_core_channel_preference` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `user_id` BIGINT NOT NULL UNIQUE,
    `push` TINYINT(1) DEFAULT 1,
    `email` TINYINT(1) DEFAULT 1,
    `sms` TINYINT(1) DEFAULT 0,
    `in_app` TINYINT(1) DEFAULT 1,
    `whatsapp` TINYINT(1) DEFAULT 0,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 25. pruh_core_modification_request
CREATE TABLE IF NOT EXISTS `pruh_core_modification_request` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `school_id` BIGINT NOT NULL,
    `student_id` BIGINT,
    `subject_id` BIGINT,
    `grade_id` BIGINT,
    `requested_by` BIGINT,
    `request_type` VARCHAR(100),
    `reason` TEXT,
    `current_value` VARCHAR(255),
    `requested_value` VARCHAR(255),
    `status` VARCHAR(50) DEFAULT 'pending',
    `reviewed_by` BIGINT,
    `reviewed_at` DATETIME,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_school_id` (`school_id`),
    INDEX `idx_student_id` (`student_id`),
    INDEX `idx_subject_id` (`subject_id`),
    INDEX `idx_grade_id` (`grade_id`),
    INDEX `idx_requested_by` (`requested_by`),
    INDEX `idx_reviewed_by` (`reviewed_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 26. pruh_core_whistleblower_report
CREATE TABLE IF NOT EXISTS `pruh_core_whistleblower_report` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `school_id` BIGINT NOT NULL,
    `category_id` BIGINT,
    `title` VARCHAR(255),
    `description` TEXT,
    `severity` VARCHAR(50),
    `follow_up_key` VARCHAR(100) UNIQUE,
    `status` VARCHAR(50) DEFAULT 'received',
    `reporter_type` VARCHAR(50),
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_school_id` (`school_id`),
    INDEX `idx_category_id` (`category_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 27. pruh_core_whistleblower_category
CREATE TABLE IF NOT EXISTS `pruh_core_whistleblower_category` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `school_id` BIGINT NOT NULL,
    `name` VARCHAR(255),
    `description` TEXT,
    `is_active` TINYINT(1) DEFAULT 1,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_school_id` (`school_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 28. pruh_core_live_class
CREATE TABLE IF NOT EXISTS `pruh_core_live_class` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `school_id` BIGINT NOT NULL,
    `teacher_id` BIGINT,
    `class_id` BIGINT,
    `subject_id` BIGINT,
    `title` VARCHAR(255),
    `description` TEXT,
    `meeting_url` VARCHAR(500),
    `scheduled_at` DATETIME,
    `duration_minutes` INT,
    `is_active` TINYINT(1) DEFAULT 1,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_school_id` (`school_id`),
    INDEX `idx_teacher_id` (`teacher_id`),
    INDEX `idx_class_id` (`class_id`),
    INDEX `idx_subject_id` (`subject_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 29. pruh_core_peer_review
CREATE TABLE IF NOT EXISTS `pruh_core_peer_review` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `school_id` BIGINT NOT NULL,
    `reviewer_id` BIGINT,
    `reviewee_id` BIGINT,
    `category` VARCHAR(100),
    `rating` INT,
    `comment` TEXT,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_school_id` (`school_id`),
    INDEX `idx_reviewer_id` (`reviewer_id`),
    INDEX `idx_reviewee_id` (`reviewee_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 30. pruh_core_spotlight_student
CREATE TABLE IF NOT EXISTS `pruh_core_spotlight_student` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `school_id` BIGINT NOT NULL,
    `teacher_id` BIGINT,
    `student_id` BIGINT,
    `reason` TEXT,
    `week_start` DATE,
    `week_end` DATE,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_school_id` (`school_id`),
    INDEX `idx_teacher_id` (`teacher_id`),
    INDEX `idx_student_id` (`student_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 31. pruh_system_academicyear
CREATE TABLE IF NOT EXISTS `pruh_system_academicyear` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    `start_date` DATE,
    `end_date` DATE,
    `is_active` TINYINT(1) DEFAULT 0,
    `status` ENUM('draft','active','closed','archived') NOT NULL DEFAULT 'draft',
    `deleted_at` DATETIME NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 34. pruh_system_capacitycategory
CREATE TABLE IF NOT EXISTS `pruh_system_capacitycategory` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    `is_active` TINYINT(1) DEFAULT 0,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 35. pruh_system_schoolcapacity
CREATE TABLE IF NOT EXISTS `pruh_system_schoolcapacity` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `capacity_category_id` BIGINT NOT NULL,
    `capacity_amount` INT NOT NULL,
    `is_active` TINYINT(1) DEFAULT 0,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_schoolcapacity_category` (`capacity_category_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 33. pruh_system_institutiontype
CREATE TABLE IF NOT EXISTS `pruh_system_institutiontype` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    `is_active` TINYINT(1) DEFAULT 0,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 36. pruh_system_country
CREATE TABLE IF NOT EXISTS `pruh_system_country` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    `is_active` TINYINT(1) DEFAULT 0,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 37. pruh_system_region
CREATE TABLE IF NOT EXISTS `pruh_system_region` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `country_id` BIGINT NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `is_active` TINYINT(1) DEFAULT 0,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_region_country` (`country_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 38. pruh_system_city
CREATE TABLE IF NOT EXISTS `pruh_system_city` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `country_id` BIGINT NOT NULL,
    `region_id` BIGINT NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `is_active` TINYINT(1) DEFAULT 0,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_city_country` (`country_id`),
    INDEX `idx_city_region` (`region_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 39. pruh_system_schooltype
CREATE TABLE IF NOT EXISTS `pruh_system_schooltype` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    `is_active` TINYINT(1) DEFAULT 0,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 40. pruh_system_syllabustype
CREATE TABLE IF NOT EXISTS `pruh_system_syllabustype` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    `is_active` TINYINT(1) DEFAULT 0,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 41. pruh_system_classsubtype
CREATE TABLE IF NOT EXISTS `pruh_system_classsubtype` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    `is_active` TINYINT(1) DEFAULT 0,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 42. pruh_system_principal
CREATE TABLE IF NOT EXISTS `pruh_system_principal` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    `is_active` TINYINT(1) DEFAULT 0,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 43. pruh_system_bursar
CREATE TABLE IF NOT EXISTS `pruh_system_bursar` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    `is_active` TINYINT(1) DEFAULT 0,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 44. pruh_system_academicsystem
CREATE TABLE IF NOT EXISTS `pruh_system_academicsystem` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(150) NOT NULL,
    `is_active` TINYINT(1) DEFAULT 1,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 45. pruh_core_parent
CREATE TABLE IF NOT EXISTS `pruh_core_parent` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `user_id` BIGINT NOT NULL UNIQUE,
    `first_name` VARCHAR(100) NOT NULL,
    `last_name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(191) NULL UNIQUE,
    `phone` VARCHAR(20) NULL,
    `passport_photo` VARCHAR(255) NULL,
    `address` TEXT NULL,
    `occupation` VARCHAR(100) NULL,
    `status` VARCHAR(20) DEFAULT 'active',
    `is_active` TINYINT(1) DEFAULT 1,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_parent_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 45. pruh_core_student_parent
CREATE TABLE IF NOT EXISTS `pruh_core_student_parent` (
    `student_id` BIGINT NOT NULL,
    `parent_id` BIGINT NOT NULL,
    `relationship` VARCHAR(50) NULL,
    PRIMARY KEY (`student_id`, `parent_id`),
    INDEX `idx_sp_parent` (`parent_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Update pruh_core_teacher with full registration fields
ALTER TABLE `pruh_core_teacher`
  ADD COLUMN IF NOT EXISTS `date_of_birth` DATE NULL AFTER `employee_id`,
  ADD COLUMN IF NOT EXISTS `gender` VARCHAR(10) NULL AFTER `date_of_birth`,
  ADD COLUMN IF NOT EXISTS `marital_status` VARCHAR(20) NULL AFTER `gender`,
  ADD COLUMN IF NOT EXISTS `nationality` VARCHAR(100) NULL AFTER `marital_status`,
  ADD COLUMN IF NOT EXISTS `state_of_origin` VARCHAR(100) NULL AFTER `nationality`,
  ADD COLUMN IF NOT EXISTS `lga` VARCHAR(100) NULL AFTER `state_of_origin`,
  ADD COLUMN IF NOT EXISTS `religion` VARCHAR(100) NULL AFTER `lga`,
  ADD COLUMN IF NOT EXISTS `address` TEXT NULL AFTER `religion`,
  ADD COLUMN IF NOT EXISTS `city` VARCHAR(100) NULL AFTER `address`,
  ADD COLUMN IF NOT EXISTS `subjects_specialization` TEXT NULL AFTER `years_experience`,
  ADD COLUMN IF NOT EXISTS `contract_type` VARCHAR(50) NULL AFTER `hire_date`,
  ADD COLUMN IF NOT EXISTS `salary_grade` VARCHAR(50) NULL AFTER `contract_type`,
  ADD COLUMN IF NOT EXISTS `national_id_number` VARCHAR(50) NULL AFTER `is_examination_officer`,
  ADD COLUMN IF NOT EXISTS `passport_number` VARCHAR(50) NULL AFTER `national_id_number`,
  ADD COLUMN IF NOT EXISTS `bank_name` VARCHAR(100) NULL AFTER `passport_number`,
  ADD COLUMN IF NOT EXISTS `bank_account_number` VARCHAR(30) NULL AFTER `bank_name`,
  ADD COLUMN IF NOT EXISTS `bank_account_name` VARCHAR(100) NULL AFTER `bank_account_number`,
  ADD COLUMN IF NOT EXISTS `emergency_contact_name` VARCHAR(100) NULL AFTER `bank_account_name`,
  ADD COLUMN IF NOT EXISTS `emergency_contact_phone` VARCHAR(20) NULL AFTER `emergency_contact_name`,
  ADD COLUMN IF NOT EXISTS `emergency_contact_relationship` VARCHAR(50) NULL AFTER `emergency_contact_phone`,
  ADD COLUMN IF NOT EXISTS `next_of_kin_name` VARCHAR(100) NULL AFTER `emergency_contact_relationship`,
  ADD COLUMN IF NOT EXISTS `next_of_kin_phone` VARCHAR(20) NULL AFTER `next_of_kin_name`,
  ADD COLUMN IF NOT EXISTS `next_of_kin_relationship` VARCHAR(50) NULL AFTER `next_of_kin_phone`,
  ADD COLUMN IF NOT EXISTS `next_of_kin_address` TEXT NULL AFTER `next_of_kin_relationship`,
  ADD COLUMN IF NOT EXISTS `status` VARCHAR(20) DEFAULT 'active' AFTER `is_active`;

-- 46. pruh_core_bursar
CREATE TABLE IF NOT EXISTS `pruh_core_bursar` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `school_id` BIGINT NULL,
    `user_id` BIGINT NOT NULL UNIQUE,
    `employee_id` VARCHAR(50) NOT NULL,
    `date_of_birth` DATE NULL,
    `gender` VARCHAR(10) NULL,
    `marital_status` VARCHAR(20) NULL,
    `nationality` VARCHAR(100) NULL,
    `state_of_origin` VARCHAR(100) NULL,
    `lga` VARCHAR(100) NULL,
    `religion` VARCHAR(100) NULL,
    `address` TEXT NULL,
    `city` VARCHAR(100) NULL,
    `phone_number` VARCHAR(20) NULL,
    `qualification` VARCHAR(255) NULL,
    `years_experience` INT DEFAULT 0,
    `hire_date` DATE NULL,
    `contract_type` VARCHAR(50) NULL,
    `salary_grade` VARCHAR(50) NULL,
    `national_id_number` VARCHAR(50) NULL,
    `bank_name` VARCHAR(100) NULL,
    `bank_account_number` VARCHAR(30) NULL,
    `bank_account_name` VARCHAR(100) NULL,
    `emergency_contact_name` VARCHAR(100) NULL,
    `emergency_contact_phone` VARCHAR(20) NULL,
    `emergency_contact_relationship` VARCHAR(50) NULL,
    `profile_picture` VARCHAR(255) NULL,
    `bio` TEXT NULL,
    `must_change_password` TINYINT(1) DEFAULT 0,
    `status` VARCHAR(20) DEFAULT 'active',
    `is_active` TINYINT(1) DEFAULT 1,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_bursar_user` (`user_id`),
    INDEX `idx_bursar_school` (`school_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 47. pruh_core_principal
CREATE TABLE IF NOT EXISTS `pruh_core_principal` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `school_id` BIGINT NULL,
    `user_id` BIGINT NOT NULL UNIQUE,
    `employee_id` VARCHAR(50) NOT NULL,
    `date_of_birth` DATE NULL,
    `gender` VARCHAR(10) NULL,
    `marital_status` VARCHAR(20) NULL,
    `nationality` VARCHAR(100) NULL,
    `state_of_origin` VARCHAR(100) NULL,
    `lga` VARCHAR(100) NULL,
    `religion` VARCHAR(100) NULL,
    `address` TEXT NULL,
    `city` VARCHAR(100) NULL,
    `phone_number` VARCHAR(20) NULL,
    `qualification` VARCHAR(255) NULL,
    `years_experience` INT DEFAULT 0,
    `hire_date` DATE NULL,
    `contract_type` VARCHAR(50) NULL,
    `salary_grade` VARCHAR(50) NULL,
    `national_id_number` VARCHAR(50) NULL,
    `bank_name` VARCHAR(100) NULL,
    `bank_account_number` VARCHAR(30) NULL,
    `bank_account_name` VARCHAR(100) NULL,
    `emergency_contact_name` VARCHAR(100) NULL,
    `emergency_contact_phone` VARCHAR(20) NULL,
    `emergency_contact_relationship` VARCHAR(50) NULL,
    `profile_picture` VARCHAR(255) NULL,
    `bio` TEXT NULL,
    `must_change_password` TINYINT(1) DEFAULT 0,
    `status` VARCHAR(20) DEFAULT 'active',
    `is_active` TINYINT(1) DEFAULT 1,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_principal_user` (`user_id`),
    INDEX `idx_principal_school` (`school_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
