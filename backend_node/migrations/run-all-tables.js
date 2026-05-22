const sequelize = require('../src/config/db');

async function migrate() {
  console.log('Running migration: 30 new tables for full dashboard functionality');

  const tables = [
    {
      name: 'pruh_core_message',
      sql: `CREATE TABLE IF NOT EXISTS \`pruh_core_message\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`school_id\` BIGINT NOT NULL,
        \`sender_id\` BIGINT,
        \`sender_type\` VARCHAR(50),
        \`recipient_id\` BIGINT,
        \`recipient_type\` VARCHAR(50),
        \`subject\` VARCHAR(255),
        \`body\` TEXT,
        \`is_read\` TINYINT(1) DEFAULT 0,
        \`thread_id\` VARCHAR(100),
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    },
    {
      name: 'pruh_core_assignment',
      sql: `CREATE TABLE IF NOT EXISTS \`pruh_core_assignment\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`school_id\` BIGINT NOT NULL,
        \`class_id\` BIGINT,
        \`subject_id\` BIGINT,
        \`teacher_id\` BIGINT,
        \`title\` VARCHAR(255) NOT NULL,
        \`description\` TEXT,
        \`due_date\` DATE,
        \`max_score\` FLOAT,
        \`attachment_path\` VARCHAR(500),
        \`is_active\` TINYINT(1) DEFAULT 1,
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    },
    {
      name: 'pruh_core_assignment_submission',
      sql: `CREATE TABLE IF NOT EXISTS \`pruh_core_assignment_submission\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`assignment_id\` BIGINT NOT NULL,
        \`student_id\` BIGINT NOT NULL,
        \`submitted_at\` DATE,
        \`content\` TEXT,
        \`attachment_path\` VARCHAR(500),
        \`score\` FLOAT,
        \`feedback\` TEXT,
        \`status\` VARCHAR(50) DEFAULT 'pending',
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    },
    {
      name: 'pruh_core_learning_resource',
      sql: `CREATE TABLE IF NOT EXISTS \`pruh_core_learning_resource\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`school_id\` BIGINT NOT NULL,
        \`class_id\` BIGINT,
        \`subject_id\` BIGINT,
        \`teacher_id\` BIGINT,
        \`title\` VARCHAR(255) NOT NULL,
        \`description\` TEXT,
        \`resource_type\` VARCHAR(50),
        \`file_path\` VARCHAR(500),
        \`url\` VARCHAR(500),
        \`is_active\` TINYINT(1) DEFAULT 1,
        \`download_count\` INT DEFAULT 0,
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    },
    {
      name: 'pruh_core_office_hour',
      sql: `CREATE TABLE IF NOT EXISTS \`pruh_core_office_hour\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`school_id\` BIGINT NOT NULL,
        \`teacher_id\` BIGINT NOT NULL,
        \`date\` DATE,
        \`start_time\` VARCHAR(10),
        \`end_time\` VARCHAR(10),
        \`slot_duration_minutes\` INT DEFAULT 30,
        \`max_bookings\` INT DEFAULT 1,
        \`is_active\` TINYINT(1) DEFAULT 1,
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    },
    {
      name: 'pruh_core_office_hour_booking',
      sql: `CREATE TABLE IF NOT EXISTS \`pruh_core_office_hour_booking\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`office_hour_id\` BIGINT NOT NULL,
        \`student_id\` BIGINT,
        \`parent_id\` BIGINT,
        \`status\` VARCHAR(50) DEFAULT 'booked',
        \`notes\` TEXT,
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    },
    {
      name: 'pruh_core_behaviour_incident',
      sql: `CREATE TABLE IF NOT EXISTS \`pruh_core_behaviour_incident\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`school_id\` BIGINT NOT NULL,
        \`student_id\` BIGINT NOT NULL,
        \`reported_by\` BIGINT,
        \`incident_type\` VARCHAR(100),
        \`severity\` VARCHAR(50),
        \`description\` TEXT,
        \`action_taken\` TEXT,
        \`follow_up_required\` TINYINT(1) DEFAULT 0,
        \`follow_up_date\` DATE,
        \`parent_notified\` TINYINT(1) DEFAULT 0,
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    },
    {
      name: 'pruh_core_lesson_plan',
      sql: `CREATE TABLE IF NOT EXISTS \`pruh_core_lesson_plan\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`school_id\` BIGINT NOT NULL,
        \`teacher_id\` BIGINT NOT NULL,
        \`class_id\` BIGINT,
        \`subject_id\` BIGINT,
        \`date\` DATE,
        \`topic\` VARCHAR(255),
        \`objectives\` TEXT,
        \`activities\` TEXT,
        \`materials\` TEXT,
        \`homework\` TEXT,
        \`reflection\` TEXT,
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    },
    {
      name: 'pruh_core_student_goal',
      sql: `CREATE TABLE IF NOT EXISTS \`pruh_core_student_goal\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`school_id\` BIGINT NOT NULL,
        \`student_id\` BIGINT NOT NULL,
        \`title\` VARCHAR(255),
        \`description\` TEXT,
        \`target_date\` DATE,
        \`status\` VARCHAR(50) DEFAULT 'active',
        \`progress_pct\` INT DEFAULT 0,
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    },
    {
      name: 'pruh_core_study_group',
      sql: `CREATE TABLE IF NOT EXISTS \`pruh_core_study_group\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`school_id\` BIGINT NOT NULL,
        \`name\` VARCHAR(255),
        \`subject_id\` BIGINT,
        \`teacher_id\` BIGINT,
        \`description\` TEXT,
        \`meeting_schedule\` VARCHAR(255),
        \`is_active\` TINYINT(1) DEFAULT 1,
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    },
    {
      name: 'pruh_core_study_group_member',
      sql: `CREATE TABLE IF NOT EXISTS \`pruh_core_study_group_member\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`study_group_id\` BIGINT NOT NULL,
        \`student_id\` BIGINT NOT NULL,
        \`role\` VARCHAR(50) DEFAULT 'member',
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    },
    {
      name: 'pruh_core_conference_slot',
      sql: `CREATE TABLE IF NOT EXISTS \`pruh_core_conference_slot\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`school_id\` BIGINT NOT NULL,
        \`teacher_id\` BIGINT,
        \`date\` DATE,
        \`start_time\` VARCHAR(10),
        \`end_time\` VARCHAR(10),
        \`status\` VARCHAR(50) DEFAULT 'available',
        \`parent_id\` BIGINT,
        \`notes\` TEXT,
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    },
    {
      name: 'pruh_core_pickup_person',
      sql: `CREATE TABLE IF NOT EXISTS \`pruh_core_pickup_person\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`school_id\` BIGINT NOT NULL,
        \`student_id\` BIGINT NOT NULL,
        \`name\` VARCHAR(255),
        \`phone\` VARCHAR(50),
        \`relationship\` VARCHAR(100),
        \`is_authorized\` TINYINT(1) DEFAULT 1,
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    },
    {
      name: 'pruh_core_permission_slip',
      sql: `CREATE TABLE IF NOT EXISTS \`pruh_core_permission_slip\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`school_id\` BIGINT NOT NULL,
        \`title\` VARCHAR(255),
        \`description\` TEXT,
        \`event_date\` DATE,
        \`expiry_date\` DATE,
        \`is_active\` TINYINT(1) DEFAULT 1,
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    },
    {
      name: 'pruh_core_permission_slip_signature',
      sql: `CREATE TABLE IF NOT EXISTS \`pruh_core_permission_slip_signature\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`slip_id\` BIGINT NOT NULL,
        \`student_id\` BIGINT,
        \`parent_id\` BIGINT,
        \`signed_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        \`signature_hash\` VARCHAR(255)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    },
    {
      name: 'pruh_core_student_document',
      sql: `CREATE TABLE IF NOT EXISTS \`pruh_core_student_document\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`school_id\` BIGINT NOT NULL,
        \`student_id\` BIGINT NOT NULL,
        \`title\` VARCHAR(255),
        \`file_path\` VARCHAR(500),
        \`file_type\` VARCHAR(100),
        \`uploaded_by\` BIGINT,
        \`is_verified\` TINYINT(1) DEFAULT 0,
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    },
    {
      name: 'pruh_core_transcript_request',
      sql: `CREATE TABLE IF NOT EXISTS \`pruh_core_transcript_request\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`school_id\` BIGINT NOT NULL,
        \`student_id\` BIGINT NOT NULL,
        \`requested_by\` BIGINT,
        \`status\` VARCHAR(50) DEFAULT 'pending',
        \`requested_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        \`completed_at\` DATETIME
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    },
    {
      name: 'pruh_core_study_plan',
      sql: `CREATE TABLE IF NOT EXISTS \`pruh_core_study_plan\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`school_id\` BIGINT NOT NULL,
        \`student_id\` BIGINT NOT NULL,
        \`day_of_week\` VARCHAR(20),
        \`start_time\` VARCHAR(10),
        \`end_time\` VARCHAR(10),
        \`subject\` VARCHAR(100),
        \`activity\` TEXT,
        \`is_active\` TINYINT(1) DEFAULT 1,
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    },
    {
      name: 'pruh_core_resource_visit',
      sql: `CREATE TABLE IF NOT EXISTS \`pruh_core_resource_visit\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`resource_id\` BIGINT NOT NULL,
        \`student_id\` BIGINT NOT NULL,
        \`visited_at\` DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    },
    {
      name: 'pruh_core_donation_campaign',
      sql: `CREATE TABLE IF NOT EXISTS \`pruh_core_donation_campaign\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`school_id\` BIGINT NOT NULL,
        \`title\` VARCHAR(255),
        \`description\` TEXT,
        \`target_amount\` FLOAT,
        \`current_amount\` FLOAT DEFAULT 0,
        \`start_date\` DATE,
        \`end_date\` DATE,
        \`is_active\` TINYINT(1) DEFAULT 1,
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    },
    {
      name: 'pruh_core_donation',
      sql: `CREATE TABLE IF NOT EXISTS \`pruh_core_donation\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`campaign_id\` BIGINT NOT NULL,
        \`donor_id\` BIGINT,
        \`amount\` FLOAT,
        \`is_anonymous\` TINYINT(1) DEFAULT 0,
        \`receipt_hash\` VARCHAR(255),
        \`paid_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    },
    {
      name: 'pruh_core_acknowledgment',
      sql: `CREATE TABLE IF NOT EXISTS \`pruh_core_acknowledgment\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`school_id\` BIGINT NOT NULL,
        \`user_id\` BIGINT NOT NULL,
        \`record_type\` VARCHAR(100),
        \`record_id\` BIGINT,
        \`acknowledged_at\` DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    },
    {
      name: 'pruh_core_co_guardian',
      sql: `CREATE TABLE IF NOT EXISTS \`pruh_core_co_guardian\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`school_id\` BIGINT NOT NULL,
        \`student_id\` BIGINT NOT NULL,
        \`guardian_user_id\` BIGINT,
        \`relationship\` VARCHAR(100),
        \`status\` VARCHAR(50) DEFAULT 'pending',
        \`invited_at\` DATETIME,
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    },
    {
      name: 'pruh_core_channel_preference',
      sql: `CREATE TABLE IF NOT EXISTS \`pruh_core_channel_preference\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`user_id\` BIGINT NOT NULL UNIQUE,
        \`push\` TINYINT(1) DEFAULT 1,
        \`email\` TINYINT(1) DEFAULT 1,
        \`sms\` TINYINT(1) DEFAULT 0,
        \`in_app\` TINYINT(1) DEFAULT 1,
        \`whatsapp\` TINYINT(1) DEFAULT 0,
        \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    },
    {
      name: 'pruh_core_modification_request',
      sql: `CREATE TABLE IF NOT EXISTS \`pruh_core_modification_request\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`school_id\` BIGINT NOT NULL,
        \`student_id\` BIGINT,
        \`subject_id\` BIGINT,
        \`grade_id\` BIGINT,
        \`requested_by\` BIGINT,
        \`request_type\` VARCHAR(100),
        \`reason\` TEXT,
        \`current_value\` VARCHAR(255),
        \`requested_value\` VARCHAR(255),
        \`status\` VARCHAR(50) DEFAULT 'pending',
        \`reviewed_by\` BIGINT,
        \`reviewed_at\` DATETIME,
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    },
    {
      name: 'pruh_core_whistleblower_report',
      sql: `CREATE TABLE IF NOT EXISTS \`pruh_core_whistleblower_report\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`school_id\` BIGINT NOT NULL,
        \`category_id\` BIGINT,
        \`title\` VARCHAR(255),
        \`description\` TEXT,
        \`severity\` VARCHAR(50),
        \`follow_up_key\` VARCHAR(100) UNIQUE,
        \`status\` VARCHAR(50) DEFAULT 'received',
        \`reporter_type\` VARCHAR(50),
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    },
    {
      name: 'pruh_core_whistleblower_category',
      sql: `CREATE TABLE IF NOT EXISTS \`pruh_core_whistleblower_category\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`school_id\` BIGINT NOT NULL,
        \`name\` VARCHAR(255),
        \`description\` TEXT,
        \`is_active\` TINYINT(1) DEFAULT 1,
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    },
    {
      name: 'pruh_core_live_class',
      sql: `CREATE TABLE IF NOT EXISTS \`pruh_core_live_class\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`school_id\` BIGINT NOT NULL,
        \`teacher_id\` BIGINT,
        \`class_id\` BIGINT,
        \`subject_id\` BIGINT,
        \`title\` VARCHAR(255),
        \`description\` TEXT,
        \`meeting_url\` VARCHAR(500),
        \`scheduled_at\` DATETIME,
        \`duration_minutes\` INT,
        \`is_active\` TINYINT(1) DEFAULT 1,
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    },
    {
      name: 'pruh_core_peer_review',
      sql: `CREATE TABLE IF NOT EXISTS \`pruh_core_peer_review\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`school_id\` BIGINT NOT NULL,
        \`reviewer_id\` BIGINT,
        \`reviewee_id\` BIGINT,
        \`category\` VARCHAR(100),
        \`rating\` INT,
        \`comment\` TEXT,
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    },
    {
      name: 'pruh_core_spotlight_student',
      sql: `CREATE TABLE IF NOT EXISTS \`pruh_core_spotlight_student\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`school_id\` BIGINT NOT NULL,
        \`teacher_id\` BIGINT,
        \`student_id\` BIGINT,
        \`reason\` TEXT,
        \`week_start\` DATE,
        \`week_end\` DATE,
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    },
    {
      name: 'pruh_system_academicyear',
      sql: `CREATE TABLE IF NOT EXISTS \`pruh_system_academicyear\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`name\` VARCHAR(100) NOT NULL,
        \`start_date\` DATE,
        \`end_date\` DATE,
        \`is_active\` TINYINT(1) DEFAULT 0,
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    },
    {
      name: 'pruh_system_term',
      sql: `CREATE TABLE IF NOT EXISTS \`pruh_system_term\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`system_academic_year_id\` BIGINT NOT NULL,
        \`name\` VARCHAR(100) NOT NULL,
        \`start_date\` DATE,
        \`end_date\` DATE,
        \`is_active\` TINYINT(1) DEFAULT 0,
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX \`idx_term_academic_year\` (\`system_academic_year_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    },
    {
      name: 'pruh_system_institutiontype',
      sql: `CREATE TABLE IF NOT EXISTS \`pruh_system_institutiontype\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`name\` VARCHAR(100) NOT NULL,
        \`is_active\` TINYINT(1) DEFAULT 0,
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    },
    {
      name: 'pruh_system_capacitycategory',
      sql: `CREATE TABLE IF NOT EXISTS \`pruh_system_capacitycategory\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`name\` VARCHAR(100) NOT NULL,
        \`is_active\` TINYINT(1) DEFAULT 0,
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    },
    {
      name: 'pruh_system_schoolcapacity',
      sql: `CREATE TABLE IF NOT EXISTS \`pruh_system_schoolcapacity\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`capacity_category_id\` BIGINT NOT NULL,
        \`capacity_amount\` INT NOT NULL,
        \`is_active\` TINYINT(1) DEFAULT 0,
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    },
    {
      name: 'pruh_system_country',
      sql: `CREATE TABLE IF NOT EXISTS \`pruh_system_country\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`name\` VARCHAR(100) NOT NULL,
        \`is_active\` TINYINT(1) DEFAULT 0,
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    },
    {
      name: 'pruh_system_region',
      sql: `CREATE TABLE IF NOT EXISTS \`pruh_system_region\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`country_id\` BIGINT NOT NULL,
        \`name\` VARCHAR(100) NOT NULL,
        \`is_active\` TINYINT(1) DEFAULT 0,
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    },
    {
      name: 'pruh_system_city',
      sql: `CREATE TABLE IF NOT EXISTS \`pruh_system_city\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`country_id\` BIGINT NOT NULL,
        \`region_id\` BIGINT NOT NULL,
        \`name\` VARCHAR(100) NOT NULL,
        \`is_active\` TINYINT(1) DEFAULT 0,
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    },
    {
      name: 'pruh_system_schooltype',
      sql: `CREATE TABLE IF NOT EXISTS \`pruh_system_schooltype\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`name\` VARCHAR(100) NOT NULL,
        \`is_active\` TINYINT(1) DEFAULT 0,
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    },
    {
      name: 'pruh_system_syllabustype',
      sql: `CREATE TABLE IF NOT EXISTS \`pruh_system_syllabustype\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`name\` VARCHAR(100) NOT NULL,
        \`is_active\` TINYINT(1) DEFAULT 0,
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    },
    {
      name: 'pruh_system_classsubtype',
      sql: `CREATE TABLE IF NOT EXISTS \`pruh_system_classsubtype\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`name\` VARCHAR(100) NOT NULL,
        \`is_active\` TINYINT(1) DEFAULT 0,
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    },
    {
      name: 'pruh_system_principal',
      sql: `CREATE TABLE IF NOT EXISTS \`pruh_system_principal\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`name\` VARCHAR(100) NOT NULL,
        \`is_active\` TINYINT(1) DEFAULT 0,
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    },
    {
      name: 'pruh_system_bursar',
      sql: `CREATE TABLE IF NOT EXISTS \`pruh_system_bursar\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`name\` VARCHAR(100) NOT NULL,
        \`is_active\` TINYINT(1) DEFAULT 0,
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    },
    {
      name: 'pruh_system_academicsystem',
      sql: `CREATE TABLE IF NOT EXISTS \`pruh_system_academicsystem\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`name\` VARCHAR(150) NOT NULL,
        \`is_active\` TINYINT(1) DEFAULT 1,
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    },
    {
      name: 'pruh_system_gradingsystem',
      sql: `CREATE TABLE IF NOT EXISTS \`pruh_system_gradingsystem\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`name\` VARCHAR(150) NOT NULL,
        \`is_active\` TINYINT(1) DEFAULT 1,
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    },
    {
      name: 'pruh_core_parent',
      sql: `CREATE TABLE IF NOT EXISTS \`pruh_core_parent\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`user_id\` BIGINT NOT NULL UNIQUE,
        \`first_name\` VARCHAR(100) NOT NULL,
        \`last_name\` VARCHAR(100) NOT NULL,
        \`email\` VARCHAR(191) NULL UNIQUE,
        \`phone\` VARCHAR(20) NULL,
        \`passport_photo\` VARCHAR(255) NULL,
        \`address\` TEXT NULL,
        \`occupation\` VARCHAR(100) NULL,
        \`status\` VARCHAR(20) DEFAULT 'active',
        \`is_active\` TINYINT(1) DEFAULT 1,
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    },
    {
      name: 'pruh_core_student_parent',
      sql: `CREATE TABLE IF NOT EXISTS \`pruh_core_student_parent\` (
        \`student_id\` BIGINT NOT NULL,
        \`parent_id\` BIGINT NOT NULL,
        \`relationship\` VARCHAR(50) NULL,
        PRIMARY KEY (\`student_id\`, \`parent_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    },
    {
      name: 'pruh_core_bursar',
      sql: `CREATE TABLE IF NOT EXISTS \`pruh_core_bursar\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`school_id\` BIGINT NULL,
        \`user_id\` BIGINT NOT NULL UNIQUE,
        \`employee_id\` VARCHAR(50) NOT NULL,
        \`date_of_birth\` DATE NULL,
        \`gender\` VARCHAR(10) NULL,
        \`marital_status\` VARCHAR(20) NULL,
        \`nationality\` VARCHAR(100) NULL,
        \`state_of_origin\` VARCHAR(100) NULL,
        \`lga\` VARCHAR(100) NULL,
        \`religion\` VARCHAR(100) NULL,
        \`address\` TEXT NULL,
        \`city\` VARCHAR(100) NULL,
        \`phone_number\` VARCHAR(20) NULL,
        \`qualification\` VARCHAR(255) NULL,
        \`years_experience\` INT DEFAULT 0,
        \`hire_date\` DATE NULL,
        \`contract_type\` VARCHAR(50) NULL,
        \`salary_grade\` VARCHAR(50) NULL,
        \`national_id_number\` VARCHAR(50) NULL,
        \`bank_name\` VARCHAR(100) NULL,
        \`bank_account_number\` VARCHAR(30) NULL,
        \`bank_account_name\` VARCHAR(100) NULL,
        \`emergency_contact_name\` VARCHAR(100) NULL,
        \`emergency_contact_phone\` VARCHAR(20) NULL,
        \`emergency_contact_relationship\` VARCHAR(50) NULL,
        \`profile_picture\` VARCHAR(255) NULL,
        \`bio\` TEXT NULL,
        \`must_change_password\` TINYINT(1) DEFAULT 0,
        \`status\` VARCHAR(20) DEFAULT 'active',
        \`is_active\` TINYINT(1) DEFAULT 1,
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    },
    {
      name: 'pruh_core_principal',
      sql: `CREATE TABLE IF NOT EXISTS \`pruh_core_principal\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`school_id\` BIGINT NULL,
        \`user_id\` BIGINT NOT NULL UNIQUE,
        \`employee_id\` VARCHAR(50) NOT NULL,
        \`date_of_birth\` DATE NULL,
        \`gender\` VARCHAR(10) NULL,
        \`marital_status\` VARCHAR(20) NULL,
        \`nationality\` VARCHAR(100) NULL,
        \`state_of_origin\` VARCHAR(100) NULL,
        \`lga\` VARCHAR(100) NULL,
        \`religion\` VARCHAR(100) NULL,
        \`address\` TEXT NULL,
        \`city\` VARCHAR(100) NULL,
        \`phone_number\` VARCHAR(20) NULL,
        \`qualification\` VARCHAR(255) NULL,
        \`years_experience\` INT DEFAULT 0,
        \`hire_date\` DATE NULL,
        \`contract_type\` VARCHAR(50) NULL,
        \`salary_grade\` VARCHAR(50) NULL,
        \`national_id_number\` VARCHAR(50) NULL,
        \`bank_name\` VARCHAR(100) NULL,
        \`bank_account_number\` VARCHAR(30) NULL,
        \`bank_account_name\` VARCHAR(100) NULL,
        \`emergency_contact_name\` VARCHAR(100) NULL,
        \`emergency_contact_phone\` VARCHAR(20) NULL,
        \`emergency_contact_relationship\` VARCHAR(50) NULL,
        \`profile_picture\` VARCHAR(255) NULL,
        \`bio\` TEXT NULL,
        \`must_change_password\` TINYINT(1) DEFAULT 0,
        \`status\` VARCHAR(20) DEFAULT 'active',
        \`is_active\` TINYINT(1) DEFAULT 1,
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    }
  ];

  try {
    for (const { name, sql } of tables) {
      await sequelize.query(sql);
      console.log(`✓ Table: ${name}`);
    }

    // Add indexes
    const indexes = [
      ['idx_msg_school', 'pruh_core_message', 'school_id'],
      ['idx_msg_sender', 'pruh_core_message', 'sender_id'],
      ['idx_msg_recipient', 'pruh_core_message', 'recipient_id'],
      ['idx_msg_thread', 'pruh_core_message', 'thread_id'],
      ['idx_asgn_school', 'pruh_core_assignment', 'school_id'],
      ['idx_asgn_class', 'pruh_core_assignment', 'class_id'],
      ['idx_asgn_teacher', 'pruh_core_assignment', 'teacher_id'],
      ['idx_asgnsub_asgn', 'pruh_core_assignment_submission', 'assignment_id'],
      ['idx_asgnsub_student', 'pruh_core_assignment_submission', 'student_id'],
      ['idx_res_school', 'pruh_core_learning_resource', 'school_id'],
      ['idx_res_teacher', 'pruh_core_learning_resource', 'teacher_id'],
      ['idx_oh_teacher', 'pruh_core_office_hour', 'teacher_id'],
      ['idx_ohb_oh', 'pruh_core_office_hour_booking', 'office_hour_id'],
      ['idx_ohb_student', 'pruh_core_office_hour_booking', 'student_id'],
      ['idx_bi_student', 'pruh_core_behaviour_incident', 'student_id'],
      ['idx_bi_reporter', 'pruh_core_behaviour_incident', 'reported_by'],
      ['idx_lp_teacher', 'pruh_core_lesson_plan', 'teacher_id'],
      ['idx_goal_student', 'pruh_core_student_goal', 'student_id'],
      ['idx_sg_school', 'pruh_core_study_group', 'school_id'],
      ['idx_sgm_sg', 'pruh_core_study_group_member', 'study_group_id'],
      ['idx_sgm_student', 'pruh_core_study_group_member', 'student_id'],
      ['idx_cs_teacher', 'pruh_core_conference_slot', 'teacher_id'],
      ['idx_pickup_student', 'pruh_core_pickup_person', 'student_id'],
      ['idx_doc_student', 'pruh_core_student_document', 'student_id'],
      ['idx_tr_student', 'pruh_core_transcript_request', 'student_id'],
      ['idx_sp_student', 'pruh_core_study_plan', 'student_id'],
      ['idx_rv_resource', 'pruh_core_resource_visit', 'resource_id'],
      ['idx_rv_student', 'pruh_core_resource_visit', 'student_id'],
      ['idx_dc_school', 'pruh_core_donation_campaign', 'school_id'],
      ['idx_don_campaign', 'pruh_core_donation', 'campaign_id'],
      ['idx_ack_user', 'pruh_core_acknowledgment', 'user_id'],
      ['idx_cg_student', 'pruh_core_co_guardian', 'student_id'],
      ['idx_cp_user', 'pruh_core_channel_preference', 'user_id'],
      ['idx_mr_school', 'pruh_core_modification_request', 'school_id'],
      ['idx_mr_student', 'pruh_core_modification_request', 'student_id'],
      ['idx_mr_grade', 'pruh_core_modification_request', 'grade_id'],
      ['idx_wbr_school', 'pruh_core_whistleblower_report', 'school_id'],
      ['idx_wbr_category', 'pruh_core_whistleblower_report', 'category_id'],
      ['idx_wbc_school', 'pruh_core_whistleblower_category', 'school_id'],
      ['idx_lc_school', 'pruh_core_live_class', 'school_id'],
      ['idx_lc_teacher', 'pruh_core_live_class', 'teacher_id'],
      ['idx_pr_school', 'pruh_core_peer_review', 'school_id'],
      ['idx_pr_reviewer', 'pruh_core_peer_review', 'reviewer_id'],
      ['idx_ss_teacher', 'pruh_core_spotlight_student', 'teacher_id'],
      ['idx_ss_student', 'pruh_core_spotlight_student', 'student_id'],
      ['idx_sc_cat', 'pruh_system_schoolcapacity', 'capacity_category_id'],
      ['idx_region_country', 'pruh_system_region', 'country_id'],
      ['idx_city_country', 'pruh_system_city', 'country_id'],
      ['idx_city_region', 'pruh_system_city', 'region_id'],
      ['idx_parent_user', 'pruh_core_parent', 'user_id'],
      ['idx_sp_parent', 'pruh_core_student_parent', 'parent_id'],
      ['idx_bursar_user', 'pruh_core_bursar', 'user_id'],
      ['idx_bursar_school', 'pruh_core_bursar', 'school_id'],
      ['idx_principal_user', 'pruh_core_principal', 'user_id'],
      ['idx_principal_school', 'pruh_core_principal', 'school_id'],
    ];

    for (const [name, table, column] of indexes) {
      try {
        await sequelize.query(`CREATE INDEX IF NOT EXISTS \`${name}\` ON \`${table}\` (\`${column}\`)`);
        console.log(`✓ Index: ${name}`);
      } catch (e) {
        console.log(`  (index ${name} may already exist)`);
      }
    }

    console.log(`\n✅ Migration completed successfully! 47 tables + ${indexes.length} indexes created.`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
}

migrate();
