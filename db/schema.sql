-- DANNY'STHENICS Coach Pro — MySQL 8.x Relational Schema
-- Scope: Coach Auth, Member Directory & Outreach, Date-Wise Attendance & Workout Tags
-- Import: mysql -u root -p < db/schema.sql

CREATE DATABASE IF NOT EXISTS dannysthenics
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE dannysthenics;

-- 1. Coaches (Workstation Auth)
CREATE TABLE IF NOT EXISTS coaches (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email VARCHAR(190) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(120) NOT NULL,
  role ENUM('admin', 'coach', 'front_desk') NOT NULL DEFAULT 'coach',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_coaches_email (email)
) ENGINE=InnoDB;

-- 2. Members (Athlete Directory)
CREATE TABLE IF NOT EXISTS members (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  pf_id VARCHAR(20) NOT NULL,
  full_name VARCHAR(120) NOT NULL,
  initials VARCHAR(4) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  tier VARCHAR(60) NOT NULL DEFAULT 'Standard Club',
  credits_remaining INT UNSIGNED NOT NULL DEFAULT 0,
  is_morning_batch TINYINT(1) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_members_pf_id (pf_id),
  KEY idx_members_name (full_name),
  KEY idx_members_phone (phone),
  KEY idx_members_morning_batch (is_morning_batch)
) ENGINE=InnoDB;

-- 3. Attendance Check-Ins (Member × Date Ledger)
CREATE TABLE IF NOT EXISTS attendance_checkins (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  member_id BIGINT UNSIGNED NOT NULL,
  session_date DATE NOT NULL,
  checked_in_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ingress_gate VARCHAR(40) NOT NULL DEFAULT 'Manual',
  workout_class_name VARCHAR(120) NULL,
  credit_deducted TINYINT(1) NOT NULL DEFAULT 1,
  checked_in_by_coach_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_member_session_date (member_id, session_date),
  KEY idx_checkins_session_date (session_date),
  KEY idx_checkins_member_date (member_id, session_date DESC),
  CONSTRAINT fk_checkins_member
    FOREIGN KEY (member_id) REFERENCES members (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_checkins_coach
    FOREIGN KEY (checked_in_by_coach_id) REFERENCES coaches (id)
    ON DELETE SET NULL
) ENGINE=InnoDB;

-- 4. Check-In Workout Tags (Member × Date × Workout Tag Completion)
CREATE TABLE IF NOT EXISTS checkin_workouts (
  checkin_id BIGINT UNSIGNED NOT NULL,
  workout_key ENUM('agility', 'flexibility', 'core', 'weight_training') NOT NULL,
  completed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (checkin_id, workout_key),
  KEY idx_checkin_workouts_key (workout_key),
  CONSTRAINT fk_checkin_workouts_checkin
    FOREIGN KEY (checkin_id) REFERENCES attendance_checkins (id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

-- 5. Member Longitudinal Progress Logs (Strength Index & Weekly Volume)
CREATE TABLE IF NOT EXISTS member_progress_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  member_id BIGINT UNSIGNED NOT NULL,
  week_label VARCHAR(16) NOT NULL,
  sessions_count TINYINT UNSIGNED NOT NULL DEFAULT 0,
  strength_index SMALLINT UNSIGNED NOT NULL,
  recorded_by_coach_id BIGINT UNSIGNED NULL,
  recorded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_progress_member_recorded (member_id, recorded_at DESC),
  CONSTRAINT fk_progress_member
    FOREIGN KEY (member_id) REFERENCES members (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_progress_coach
    FOREIGN KEY (recorded_by_coach_id) REFERENCES coaches (id)
    ON DELETE SET NULL
) ENGINE=InnoDB;

-- 6. Outreach Logs (WhatsApp / SMS Retention Dispatches)
CREATE TABLE IF NOT EXISTS outreach_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  member_id BIGINT UNSIGNED NOT NULL,
  coach_id BIGINT UNSIGNED NULL,
  channel ENUM('WhatsApp', 'SMS') NOT NULL,
  message_body TEXT NOT NULL,
  delivery_status ENUM('queued', 'delivered', 'failed') NOT NULL DEFAULT 'delivered',
  sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_outreach_member_sent (member_id, sent_at DESC),
  KEY idx_outreach_sent (sent_at DESC),
  CONSTRAINT fk_outreach_member
    FOREIGN KEY (member_id) REFERENCES members (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_outreach_coach
    FOREIGN KEY (coach_id) REFERENCES coaches (id)
    ON DELETE SET NULL
) ENGINE=InnoDB;

-- 7. Studio Settings (Persisted Outreach Template & Preferences)
CREATE TABLE IF NOT EXISTS studio_settings (
  setting_key VARCHAR(64) NOT NULL,
  setting_value TEXT NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (setting_key)
) ENGINE=InnoDB;
