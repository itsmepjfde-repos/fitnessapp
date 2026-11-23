-- Adds daily attendance for members 17, 18, and 19 over the seven complete
-- calendar days before today. Existing check-ins and credit balances are kept.
START TRANSACTION;

INSERT IGNORE INTO attendance_checkins
  (member_id, session_date, checked_in_at, ingress_gate, workout_class_name, credit_deducted)
SELECT
  m.id,
  DATE_SUB(CURDATE(), INTERVAL days.days_ago DAY),
  CONCAT(
    DATE_SUB(CURDATE(), INTERVAL days.days_ago DAY),
    ' ',
    CASE MOD(days.days_ago + m.id, 3)
      WHEN 0 THEN '06:30:00'
      WHEN 1 THEN '07:15:00'
      ELSE '17:45:00'
    END
  ),
  CASE MOD(days.days_ago + m.id, 4)
    WHEN 0 THEN 'TURNSTILE A'
    WHEN 1 THEN 'GATE 01 NFC'
    WHEN 2 THEN 'TERMINAL 3'
    ELSE 'DESK FAST-CHECK'
  END,
  'Strength & Conditioning',
  0
FROM members AS m
CROSS JOIN (
  SELECT 1 AS days_ago UNION ALL SELECT 2 UNION ALL SELECT 3
  UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7
) AS days
WHERE m.id IN (17, 18, 19);

INSERT IGNORE INTO checkin_workouts (checkin_id, workout_key, completed_at)
SELECT
  c.id,
  CASE MOD(days.days_ago + m.id - 17 + tag_offsets.tag_offset, 4)
    WHEN 0 THEN 'agility'
    WHEN 1 THEN 'flexibility'
    WHEN 2 THEN 'core'
    ELSE 'weight_training'
  END,
  c.checked_in_at
FROM attendance_checkins AS c
JOIN members AS m ON m.id = c.member_id
CROSS JOIN (
  SELECT 1 AS days_ago UNION ALL SELECT 2 UNION ALL SELECT 3
  UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7
) AS days
CROSS JOIN (
  SELECT 0 AS tag_offset UNION ALL SELECT 1
) AS tag_offsets
WHERE m.id IN (17, 18, 19)
  AND c.session_date = DATE_SUB(CURDATE(), INTERVAL days.days_ago DAY);

COMMIT;

SELECT
  m.id AS member_id,
  m.full_name,
  c.session_date,
  c.checked_in_at,
  GROUP_CONCAT(w.workout_key ORDER BY w.workout_key SEPARATOR ', ') AS workouts
FROM members AS m
JOIN attendance_checkins AS c ON c.member_id = m.id
LEFT JOIN checkin_workouts AS w ON w.checkin_id = c.id
WHERE m.id IN (17, 18, 19)
  AND c.session_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
  AND c.session_date < CURDATE()
GROUP BY m.id, m.full_name, c.id, c.session_date, c.checked_in_at
ORDER BY m.id, c.session_date;
