-- DANNY'STHENICS Coach Pro — MySQL 8.x Seed Data
-- Run after db/schema.sql:
--   mysql -u root -p dannysthenics < db/seed.sql
--
-- Note on Coach Login:
--   No plaintext password is stored here. Launch the app and use the
--   First-Run Coach Setup screen to create your first bcrypt-hashed coach account
--   (or set COACH_ADMIN_PASSWORD in your server .env).

USE dannysthenics;

-- Default Retention Outreach Template
INSERT INTO studio_settings (setting_key, setting_value)
VALUES (
  'outreach_template',
  'Hey [First Name]! Coach Danny noticed you missed this week at DANNY''STHENICS. We have a new agility session ready for you tomorrow! Tap to reserve your spot: dannysthenics.co/book'
)
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);

-- Seed Members
INSERT IGNORE INTO members
  (pf_id, full_name, initials, phone)
VALUES
  ('#89201', 'Sophia Chen', 'SC', '+1 (555) 382-9102'),
  ('#89145', 'David Miller', 'DM', '+1 (555) 749-2311'),
  ('#87992', 'Liam O''Connor', 'LO', '+1 (555) 604-1189'),
  ('#1042', 'Devon Ray', 'DR', '+1 (555) 412-8840'),
  ('#883', 'Elena Rostova', 'ER', '+1 (555) 298-4410'),
  ('#670', 'Carlos Mendoza', 'CM', '+1 (555) 893-1725'),
  ('#914', 'Tariq Khan', 'TK', '+1 (555) 531-6648'),
  ('#849', 'K. Henderson', 'KH', '+1 (555) 204-8391'),
  ('#112', 'J. Morales', 'JM', '+1 (555) 774-1029'),
  ('#902', 'A. Chen', 'AC', '+1 (555) 689-3304'),
  ('#89310', 'Maya Patel', 'MP', '+1 (555) 912-4402'),
  ('#89188', 'Marcus Vance', 'MV', '+1 (555) 443-9275'),
  ('#89402', 'Zoe Alvarez', 'ZA', '+1 (555) 318-7741'),
  ('#87640', 'Noah Takahashi', 'NT', '+1 (555) 650-2198'),
  ('#89055', 'Chloe Bennett', 'CB', '+1 (555) 822-5190'),
  ('#88119', 'Jordan Brooks', 'JB', '+1 (555) 971-6034');

-- Seed Date-Wise Attendance Check-Ins (Today + Prior Days)
INSERT IGNORE INTO attendance_checkins
  (member_id, session_date, checked_in_at, ingress_gate, workout_class_name, credit_deducted)
SELECT id, CURDATE(), CONCAT(CURDATE(), ' 07:02:00'), 'GATE 01 NFC', 'Agility & Weight Training', 1
FROM members WHERE pf_id = '#1042';

INSERT IGNORE INTO attendance_checkins
  (member_id, session_date, checked_in_at, ingress_gate, workout_class_name, credit_deducted)
SELECT id, CURDATE(), CONCAT(CURDATE(), ' 07:05:00'), 'TURNSTILE A', 'Mobility & Plyometric Flow', 1
FROM members WHERE pf_id = '#883';

INSERT IGNORE INTO attendance_checkins
  (member_id, session_date, checked_in_at, ingress_gate, workout_class_name, credit_deducted)
SELECT id, CURDATE(), CONCAT(CURDATE(), ' 06:58:00'), 'TERMINAL 3', 'Full Calisthenics Circuit', 1
FROM members WHERE pf_id = '#670';

INSERT IGNORE INTO attendance_checkins
  (member_id, session_date, checked_in_at, ingress_gate, workout_class_name, credit_deducted)
SELECT id, CURDATE(), CONCAT(CURDATE(), ' 07:11:00'), 'DESK FAST-CHECK', 'Core & Rings Foundation', 1
FROM members WHERE pf_id = '#914';

-- Historical date-wise visits (drives real dynamic Active / At-Risk / Inactive calculations)
INSERT IGNORE INTO attendance_checkins
  (member_id, session_date, checked_in_at, ingress_gate, workout_class_name, credit_deducted)
SELECT id, DATE_SUB(CURDATE(), INTERVAL 1 DAY), CONCAT(DATE_SUB(CURDATE(), INTERVAL 1 DAY), ' 18:30:00'), 'TURNSTILE A', 'Core Power & Conditioning', 1
FROM members WHERE pf_id = '#89145';

INSERT IGNORE INTO attendance_checkins
  (member_id, session_date, checked_in_at, ingress_gate, workout_class_name, credit_deducted)
SELECT id, DATE_SUB(CURDATE(), INTERVAL 1 DAY), CONCAT(DATE_SUB(CURDATE(), INTERVAL 1 DAY), ' 07:00:00'), 'GATE 01 NFC', 'Explosive Sprint Conditioning', 1
FROM members WHERE pf_id = '#112';

INSERT IGNORE INTO attendance_checkins
  (member_id, session_date, checked_in_at, ingress_gate, workout_class_name, credit_deducted)
SELECT id, DATE_SUB(CURDATE(), INTERVAL 1 DAY), CONCAT(DATE_SUB(CURDATE(), INTERVAL 1 DAY), ' 07:30:00'), 'TURNSTILE A', 'Agile Shred Conditioning', 1
FROM members WHERE pf_id = '#89055';

INSERT IGNORE INTO attendance_checkins
  (member_id, session_date, checked_in_at, ingress_gate, workout_class_name, credit_deducted)
SELECT id, DATE_SUB(CURDATE(), INTERVAL 2 DAY), CONCAT(DATE_SUB(CURDATE(), INTERVAL 2 DAY), ' 06:30:00'), 'TURNSTILE A', 'Strict Pull-Up Progression', 1
FROM members WHERE pf_id = '#849';

INSERT IGNORE INTO attendance_checkins
  (member_id, session_date, checked_in_at, ingress_gate, workout_class_name, credit_deducted)
SELECT id, DATE_SUB(CURDATE(), INTERVAL 2 DAY), CONCAT(DATE_SUB(CURDATE(), INTERVAL 2 DAY), ' 07:15:00'), 'GATE 01 NFC', 'Gymnastic Rings & Core', 1
FROM members WHERE pf_id = '#902';

INSERT IGNORE INTO attendance_checkins
  (member_id, session_date, checked_in_at, ingress_gate, workout_class_name, credit_deducted)
SELECT id, DATE_SUB(CURDATE(), INTERVAL 2 DAY), CONCAT(DATE_SUB(CURDATE(), INTERVAL 2 DAY), ' 07:05:00'), 'GATE 01 NFC', 'Lower Body Power Block', 1
FROM members WHERE pf_id = '#1042';

INSERT IGNORE INTO attendance_checkins
  (member_id, session_date, checked_in_at, ingress_gate, workout_class_name, credit_deducted)
SELECT id, DATE_SUB(CURDATE(), INTERVAL 9 DAY), CONCAT(DATE_SUB(CURDATE(), INTERVAL 9 DAY), ' 07:00:00'), 'TURNSTILE A', 'HIIT Kettlebell Shred', 1
FROM members WHERE pf_id = '#89201';

INSERT IGNORE INTO attendance_checkins
  (member_id, session_date, checked_in_at, ingress_gate, workout_class_name, credit_deducted)
SELECT id, DATE_SUB(CURDATE(), INTERVAL 11 DAY), CONCAT(DATE_SUB(CURDATE(), INTERVAL 11 DAY), ' 18:00:00'), 'TURNSTILE A', 'Calisthenics Skill Lab', 1
FROM members WHERE pf_id = '#89310';

INSERT IGNORE INTO attendance_checkins
  (member_id, session_date, checked_in_at, ingress_gate, workout_class_name, credit_deducted)
SELECT id, DATE_SUB(CURDATE(), INTERVAL 8 DAY), CONCAT(DATE_SUB(CURDATE(), INTERVAL 8 DAY), ' 17:30:00'), 'DESK FAST-CHECK', 'Weighted Dip & Pull Block', 1
FROM members WHERE pf_id = '#89188';

INSERT IGNORE INTO attendance_checkins
  (member_id, session_date, checked_in_at, ingress_gate, workout_class_name, credit_deducted)
SELECT id, DATE_SUB(CURDATE(), INTERVAL 13 DAY), CONCAT(DATE_SUB(CURDATE(), INTERVAL 13 DAY), ' 07:30:00'), 'GATE 01 NFC', 'Handstand & Shoulder Prep', 1
FROM members WHERE pf_id = '#89402';

INSERT IGNORE INTO attendance_checkins
  (member_id, session_date, checked_in_at, ingress_gate, workout_class_name, credit_deducted)
SELECT id, DATE_SUB(CURDATE(), INTERVAL 34 DAY), CONCAT(DATE_SUB(CURDATE(), INTERVAL 34 DAY), ' 08:00:00'), 'TERMINAL 3', 'Heavy Barbell Strength', 1
FROM members WHERE pf_id = '#87992';

INSERT IGNORE INTO attendance_checkins
  (member_id, session_date, checked_in_at, ingress_gate, workout_class_name, credit_deducted)
SELECT id, DATE_SUB(CURDATE(), INTERVAL 41 DAY), CONCAT(DATE_SUB(CURDATE(), INTERVAL 41 DAY), ' 18:00:00'), 'TURNSTILE A', 'Kettlebell Metcon', 1
FROM members WHERE pf_id = '#87640';

INSERT IGNORE INTO attendance_checkins
  (member_id, session_date, checked_in_at, ingress_gate, workout_class_name, credit_deducted)
SELECT id, DATE_SUB(CURDATE(), INTERVAL 37 DAY), CONCAT(DATE_SUB(CURDATE(), INTERVAL 37 DAY), ' 07:00:00'), 'DESK FAST-CHECK', 'Strength & Mobility Base', 1
FROM members WHERE pf_id = '#88119';

-- Seed Workout Tags per Check-In
INSERT IGNORE INTO checkin_workouts (checkin_id, workout_key)
SELECT c.id, w.workout_key
FROM attendance_checkins c
JOIN members m ON m.id = c.member_id
JOIN (
  SELECT '#1042' AS pf_id, 'agility' AS workout_key UNION ALL
  SELECT '#1042', 'weight_training' UNION ALL
  SELECT '#883', 'agility' UNION ALL
  SELECT '#883', 'flexibility' UNION ALL
  SELECT '#670', 'agility' UNION ALL
  SELECT '#670', 'flexibility' UNION ALL
  SELECT '#670', 'core' UNION ALL
  SELECT '#670', 'weight_training' UNION ALL
  SELECT '#914', 'core'
) w ON w.pf_id = m.pf_id
WHERE c.session_date = CURDATE();

INSERT IGNORE INTO checkin_workouts (checkin_id, workout_key)
SELECT c.id, 'agility'
FROM attendance_checkins c
WHERE c.session_date < CURDATE();

INSERT IGNORE INTO checkin_workouts (checkin_id, workout_key)
SELECT c.id, 'core'
FROM attendance_checkins c
JOIN members m ON m.id = c.member_id
WHERE c.session_date < CURDATE()
  AND m.pf_id IN ('#89145', '#1042', '#902', '#89201');
