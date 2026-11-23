import mysql, { Pool, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { hashPassword, safeEqualSecret, verifyPassword } from './auth.ts';
import {
  ALLOWED_WORKOUT_KEYS,
  AuthStatusResponse,
  CheckInEntry,
  CoachAccount,
  MemberDateWorkoutEntry,
  MemberOutreachLog,
  MemberRecord,
  OutreachDispatchBanner,
  PortalRepository,
  WeeklyProgressPoint,
  WorkoutKey,
  computeStatusFromDays,
  formatLastAttendedLabel,
  formatTimeNow,
  fromDbWorkoutKey,
  toDbWorkoutKey,
} from './types.ts';

const DEFAULT_TEMPLATE =
  "Hey [First Name]! Coach Danny noticed you missed this week at DANNY'STHENICS. Please let me know if you have any questions or concerns. We hope to see you back in the studio soon!";

function emptyWorkouts(): Record<WorkoutKey, boolean> {
  return {
    agility: false,
    flexibility: false,
    core: false,
    weightTraining: false,
  };
}

function formatDbDate(val: Date | string | null): string {
  if (!val) return '';
  if (typeof val === 'string') return val.slice(0, 10);
  const y = val.getFullYear();
  const m = String(val.getMonth() + 1).padStart(2, '0');
  const d = String(val.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDbTime(val: Date | string | null): string {
  if (!val) return '07:00 AM';
  if (typeof val === 'string') {
    const match = val.match(/(?:T|\s)(\d{2}):(\d{2})/);
    if (match) {
      const hours = Number(match[1]);
      const minutes = match[2];
      const suffix = hours >= 12 ? 'PM' : 'AM';
      const hour12 = hours % 12 || 12;
      return `${String(hour12).padStart(2, '0')}:${minutes} ${suffix}`;
    }
  }
  return val instanceof Date
    ? val.toLocaleTimeString('en-US', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
    : '07:00 AM';
}

function formatCoachNameFromEmail(email: string, fullName?: string): string {
  if (fullName && fullName.trim().length > 0) return fullName.trim();
  const localPart = email.split('@')[0] || 'Coach';
  const pretty = localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');
  return pretty.toLowerCase().startsWith('coach') ? pretty : `Coach ${pretty}`;
}

export class MySqlPortalRepository implements PortalRepository {
  readonly storageMode = 'mysql' as const;
  private pool: Pool;

  constructor() {
    const host = process.env.MYSQL_HOST?.trim();
    const sslEnabled =
      process.env.MYSQL_SSL?.trim().toLowerCase() === 'true' ||
      Boolean(host?.toLowerCase().includes('tidbcloud.com'));
    this.pool = mysql.createPool({
      host,
      port: Number(process.env.MYSQL_PORT) || 3306,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE || 'dannysthenics',
      dateStrings: true,
      ...(sslEnabled ? { ssl: { rejectUnauthorized: true } } : {}),
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  }

  async getAuthStatus(): Promise<AuthStatusResponse> {
    const envPass = process.env.COACH_ADMIN_PASSWORD?.trim();
    if (envPass) {
      return { storageMode: 'mysql', needsSetup: false };
    }
    const [rows] = await this.pool.execute<RowDataPacket[]>(
      'SELECT COUNT(*) AS cnt FROM coaches WHERE is_active = 1',
    );
    const count = Number(rows[0]?.cnt ?? 0);
    return { storageMode: 'mysql', needsSetup: count === 0 };
  }

  async setupFirstCoach(input: {
    email: string;
    password: string;
    fullName?: string;
  }): Promise<CoachAccount> {
    const status = await this.getAuthStatus();
    if (!status.needsSetup) {
      throw new Error('SETUP_LOCKED');
    }
    const email = input.email.trim().toLowerCase();
    const coachName = formatCoachNameFromEmail(email, input.fullName);
    const passwordHash = await hashPassword(input.password);
    const [res] = await this.pool.execute<ResultSetHeader>(
      'INSERT INTO coaches (email, password_hash, full_name, role) VALUES (?, ?, ?, ?)',
      [email, passwordHash, coachName, 'admin'],
    );
    return {
      id: String(res.insertId),
      email,
      coachName,
      roleTitle: 'Head Conditioning Coach',
    };
  }

  async authenticateCoach(
    email: string,
    password: string,
  ): Promise<CoachAccount | null> {
    const cleanEmail = email.trim().toLowerCase();
    const envPass = process.env.COACH_ADMIN_PASSWORD?.trim();
    if (envPass) {
      if (!safeEqualSecret(password, envPass)) return null;
      return {
        id: 'env-admin',
        email: cleanEmail,
        coachName: formatCoachNameFromEmail(cleanEmail),
        roleTitle: 'Head Conditioning Coach',
      };
    }

    const [rows] = await this.pool.execute<RowDataPacket[]>(
      'SELECT id, email, password_hash, full_name, role FROM coaches WHERE email = ? AND is_active = 1 LIMIT 1',
      [cleanEmail],
    );
    const row = rows[0];
    if (!row) return null;
    const valid = await verifyPassword(password, String(row.password_hash));
    if (!valid) return null;

    return {
      id: String(row.id),
      email: String(row.email),
      coachName: String(row.full_name),
      roleTitle:
        row.role === 'admin'
          ? 'Head Conditioning Coach'
          : row.role === 'front_desk'
            ? 'Front Desk Trainer'
            : 'Strength Coach',
    };
  }

  async listMembers(): Promise<MemberRecord[]> {
    const [memberRows] = await this.pool.execute<RowDataPacket[]>(`
      SELECT
        m.id,
        m.pf_id,
        m.full_name,
        m.initials,
        m.phone,
        m.tier,
        m.credits_remaining,
        m.is_morning_batch,
        latest.session_date AS last_session_date,
        latest.checked_in_at AS last_checked_in_at,
        latest.workout_class_name AS last_workout_class,
        COALESCE(DATEDIFF(CURDATE(), latest.session_date), 99) AS days_since_visit,
        COALESCE(cadence.visits_28d, 0) AS visits_28d
      FROM members m
      LEFT JOIN (
        SELECT c1.member_id, c1.session_date, c1.checked_in_at, c1.workout_class_name
        FROM attendance_checkins c1
        INNER JOIN (
          SELECT member_id, MAX(session_date) AS max_date
          FROM attendance_checkins
          GROUP BY member_id
        ) c2 ON c1.member_id = c2.member_id AND c1.session_date = c2.max_date
      ) latest ON latest.member_id = m.id
      LEFT JOIN (
        SELECT member_id, COUNT(*) AS visits_28d
        FROM attendance_checkins
        WHERE session_date >= DATE_SUB(CURDATE(), INTERVAL 28 DAY)
        GROUP BY member_id
      ) cadence ON cadence.member_id = m.id
      WHERE m.is_active = 1
      ORDER BY m.id ASC
    `);

    const [progressRows] = await this.pool.execute<RowDataPacket[]>(
      'SELECT member_id, week_label, sessions_count, strength_index FROM member_progress_logs ORDER BY recorded_at ASC',
    );
    const [outreachRows] = await this.pool.execute<RowDataPacket[]>(
      'SELECT id, member_id, channel, message_body, sent_at FROM outreach_logs ORDER BY sent_at DESC',
    );
    const [checkinRows] = await this.pool.execute<RowDataPacket[]>(`
      SELECT
        c.id AS checkin_id,
        c.member_id,
        c.session_date,
        c.checked_in_at,
        c.ingress_gate,
        c.workout_class_name,
        w.workout_key
      FROM attendance_checkins c
      LEFT JOIN checkin_workouts w ON w.checkin_id = c.id
      ORDER BY c.session_date DESC, c.checked_in_at DESC
    `);

    const progressMap = new Map<string, WeeklyProgressPoint[]>();
    for (const r of progressRows) {
      const mId = String(r.member_id);
      const list = progressMap.get(mId) ?? [];
      list.push({
        weekLabel: String(r.week_label),
        sessions: Number(r.sessions_count),
        strengthIndex: Number(r.strength_index),
      });
      progressMap.set(mId, list);
    }

    const outreachMap = new Map<string, MemberOutreachLog[]>();
    for (const r of outreachRows) {
      const mId = String(r.member_id);
      const list = outreachMap.get(mId) ?? [];
      list.push({
        id: String(r.id),
        channel: r.channel === 'SMS' ? 'SMS' : 'WhatsApp',
        timestamp: `${formatDbDate(r.sent_at)} · ${formatDbTime(r.sent_at)}`,
        message: String(r.message_body),
      });
      outreachMap.set(mId, list);
    }

    const historyByMember = new Map<string, Map<string, MemberDateWorkoutEntry>>();
    for (const r of checkinRows) {
      const mId = String(r.member_id);
      const cId = String(r.checkin_id);
      let memberCheckins = historyByMember.get(mId);
      if (!memberCheckins) {
        memberCheckins = new Map();
        historyByMember.set(mId, memberCheckins);
      }
      let entry = memberCheckins.get(cId);
      if (!entry) {
        entry = {
          checkInId: cId,
          sessionDate: formatDbDate(r.session_date),
          checkInTime: formatDbTime(r.checked_in_at),
          workoutClassName: String(r.workout_class_name || 'Studio Session'),
          workouts: emptyWorkouts(),
        };
        memberCheckins.set(cId, entry);
      }
      if (r.workout_key) {
        const mapped = fromDbWorkoutKey(String(r.workout_key));
        if (mapped) entry.workouts[mapped] = true;
      }
    }

    return memberRows.map((row) => {
      const id = String(row.id);
      const days = Number(row.days_since_visit ?? 99);
      const lastDate = row.last_session_date ? formatDbDate(row.last_session_date) : null;
      const lastTime = row.last_checked_in_at ? formatDbTime(row.last_checked_in_at) : null;
      const cadence = Number((Number(row.visits_28d ?? 0) / 4).toFixed(1));
      const historyMap = historyByMember.get(id);

      return {
        id,
        pfId: String(row.pf_id),
        name: String(row.full_name),
        initials: String(row.initials),
        phone: String(row.phone),
        status: computeStatusFromDays(days),
        daysSinceLastVisit: lastDate ? Math.max(0, days) : 99,
        lastAttendedLabel: formatLastAttendedLabel(lastDate, lastTime, days),
        lastWorkoutClass: String(row.last_workout_class || 'Calisthenics Conditioning'),
        cadencePerWeek: cadence,
        progressSeries: progressMap.get(id) ?? [
          { weekLabel: 'W1', sessions: 2, strengthIndex: 76 },
          { weekLabel: 'W2', sessions: 3, strengthIndex: 79 },
          { weekLabel: 'W3', sessions: 3, strengthIndex: 82 },
        ],
        outreachHistory: outreachMap.get(id) ?? [],
        attendanceHistory: historyMap ? Array.from(historyMap.values()) : [],
      };
    });
  }

  async getMemberHistory(memberId: string): Promise<MemberRecord | null> {
    const all = await this.listMembers();
    return all.find((m) => m.id === memberId) ?? null;
  }

  async createMember(input: {
    name: string;
    phone: string;
  }): Promise<MemberRecord> {
    const trimmed = input.name.trim();
    const parts = trimmed.split(/\s+/).filter(Boolean);
    const initials =
      parts.length >= 2
        ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
        : trimmed.slice(0, 2).toUpperCase();
    const num = Math.floor(89500 + Math.random() * 499);
    const pfId = `#${num}`;

    const [res] = await this.pool.execute<ResultSetHeader>(
      `INSERT INTO members (pf_id, full_name, initials, phone)
       VALUES (?, ?, ?, ?)`,
      [
        pfId,
        trimmed,
        initials,
        input.phone.trim(),
      ],
    );

    const created = await this.getMemberHistory(String(res.insertId));
    if (!created) {
      throw new Error('Failed to load newly created member.');
    }
    return created;
  }

  async logMemberProgress(
    memberId: string,
    strengthIndex: number,
    sessions: number,
    coachId: string,
  ): Promise<MemberRecord | null> {
    const numericMemberId = Number(memberId);
    if (!Number.isInteger(numericMemberId) || numericMemberId <= 0) return null;

    const [countRows] = await this.pool.execute<RowDataPacket[]>(
      'SELECT COUNT(*) AS cnt FROM member_progress_logs WHERE member_id = ?',
      [numericMemberId],
    );
    const nextWeek = Number(countRows[0]?.cnt ?? 0) + 1;
    const numericCoachId = Number(coachId);

    await this.pool.execute(
      `INSERT INTO member_progress_logs (member_id, week_label, sessions_count, strength_index, recorded_by_coach_id)
       VALUES (?, ?, ?, ?, ?)`,
      [
        numericMemberId,
        `W${nextWeek}`,
        sessions,
        strengthIndex,
        Number.isInteger(numericCoachId) && numericCoachId > 0 ? numericCoachId : null,
      ],
    );

    return this.getMemberHistory(memberId);
  }

  async getAttendanceByDate(sessionDate: string): Promise<CheckInEntry[]> {
    const [rows] = await this.pool.execute<RowDataPacket[]>(
      `SELECT
        c.id,
        c.member_id,
        c.session_date,
        c.checked_in_at,
        c.ingress_gate,
        w.workout_key
      FROM attendance_checkins c
      LEFT JOIN checkin_workouts w ON w.checkin_id = c.id
      WHERE c.session_date = ?
      ORDER BY c.checked_in_at DESC`,
      [sessionDate],
    );

    const byId = new Map<string, CheckInEntry>();
    for (const r of rows) {
      const id = String(r.id);
      let entry = byId.get(id);
      if (!entry) {
        entry = {
          id,
          memberId: String(r.member_id),
          sessionDate: formatDbDate(r.session_date),
          checkInTime: formatDbTime(r.checked_in_at),
          ingressGate: 'Manual',
          workouts: emptyWorkouts(),
        };
        byId.set(id, entry);
      }
      if (r.workout_key) {
        const key = fromDbWorkoutKey(String(r.workout_key));
        if (key) entry.workouts[key] = true;
      }
    }
    return Array.from(byId.values());
  }

  async batchCheckIn(input: {
    sessionDate: string;
    memberIds: string[];
    checkInTime: string;
    coachId: string;
  }): Promise<{ addedCount: number; checkIns: CheckInEntry[] }> {
    const conn = await this.pool.getConnection();
    let addedCount = 0;
    try {
      await conn.beginTransaction();
      const numericCoachId = Number(input.coachId);
      const validCoachId =
        Number.isInteger(numericCoachId) && numericCoachId > 0 ? numericCoachId : null;

      for (const rawMemberId of input.memberIds) {
        const numericMemberId = Number(rawMemberId);
        if (!Number.isInteger(numericMemberId) || numericMemberId <= 0) continue;

        const [insertRes] = await conn.execute<ResultSetHeader>(
          `INSERT IGNORE INTO attendance_checkins
            (member_id, session_date, checked_in_at, ingress_gate, workout_class_name, credit_deducted, checked_in_by_coach_id)
           VALUES (?, ?, CONCAT(?, ' ', ?, ':00'), 'Manual', ?, ?, ?)`,
          [
            numericMemberId,
            input.sessionDate,
            input.sessionDate,
            input.checkInTime,
            'Batch Studio Session',
            0,
            validCoachId,
          ],
        );

        if (insertRes.affectedRows > 0) {
          addedCount += 1;
        }
      }

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    const checkIns = await this.getAttendanceByDate(input.sessionDate);
    return { addedCount, checkIns };
  }

  async toggleCheckInWorkout(input: {
    checkInId: string;
    workoutKey?: WorkoutKey;
    allDone?: boolean;
    workouts?: Record<WorkoutKey, boolean>;
  }): Promise<CheckInEntry | null> {
    const numericId = Number(input.checkInId);
    if (!Number.isInteger(numericId) || numericId <= 0) return null;

    const conn = await this.pool.getConnection();
    try {
      await conn.beginTransaction();

      const [existsRows] = await conn.execute<RowDataPacket[]>(
        'SELECT id, member_id, session_date, checked_in_at, ingress_gate FROM attendance_checkins WHERE id = ? LIMIT 1',
        [numericId],
      );
      if (existsRows.length === 0) {
        await conn.rollback();
        return null;
      }

      if (input.workouts) {
        await conn.execute(
          'DELETE FROM checkin_workouts WHERE checkin_id = ?',
          [numericId],
        );
        for (const key of ALLOWED_WORKOUT_KEYS) {
          if (!input.workouts[key]) continue;
          await conn.execute(
            'INSERT INTO checkin_workouts (checkin_id, workout_key) VALUES (?, ?)',
            [numericId, toDbWorkoutKey(key)],
          );
        }
      } else if (typeof input.allDone === 'boolean') {
        if (input.allDone) {
          for (const key of ALLOWED_WORKOUT_KEYS) {
            await conn.execute(
              'INSERT IGNORE INTO checkin_workouts (checkin_id, workout_key) VALUES (?, ?)',
              [numericId, toDbWorkoutKey(key)],
            );
          }
        } else {
          await conn.execute(
            'DELETE FROM checkin_workouts WHERE checkin_id = ?',
            [numericId],
          );
        }
      } else if (input.workoutKey) {
        const dbKey = toDbWorkoutKey(input.workoutKey);
        const [existingTag] = await conn.execute<RowDataPacket[]>(
          'SELECT 1 FROM checkin_workouts WHERE checkin_id = ? AND workout_key = ? LIMIT 1',
          [numericId, dbKey],
        );
        if (existingTag.length > 0) {
          await conn.execute(
            'DELETE FROM checkin_workouts WHERE checkin_id = ? AND workout_key = ?',
            [numericId, dbKey],
          );
        } else {
          await conn.execute(
            'INSERT INTO checkin_workouts (checkin_id, workout_key) VALUES (?, ?)',
            [numericId, dbKey],
          );
        }
      }

      const [tagRows] = await conn.execute<RowDataPacket[]>(
        'SELECT workout_key FROM checkin_workouts WHERE checkin_id = ?',
        [numericId],
      );
      await conn.commit();

      const workouts = emptyWorkouts();
      for (const t of tagRows) {
        const mapped = fromDbWorkoutKey(String(t.workout_key));
        if (mapped) workouts[mapped] = true;
      }
      const base = existsRows[0];
      return {
        id: String(base.id),
        memberId: String(base.member_id),
        sessionDate: formatDbDate(base.session_date),
        checkInTime: formatDbTime(base.checked_in_at),
        ingressGate: 'Manual',
        workouts,
      };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  async deleteCheckIn(
    checkInId: string,
  ): Promise<{ deleted: CheckInEntry } | null> {
    const numericId = Number(checkInId);
    if (!Number.isInteger(numericId) || numericId <= 0) return null;

    const conn = await this.pool.getConnection();
    try {
      await conn.beginTransaction();
      const [rows] = await conn.execute<RowDataPacket[]>(
        'SELECT id, member_id, session_date, checked_in_at, ingress_gate, credit_deducted FROM attendance_checkins WHERE id = ? LIMIT 1',
        [numericId],
      );
      if (rows.length === 0) {
        await conn.rollback();
        return null;
      }
      const base = rows[0];
      const [tagRows] = await conn.execute<RowDataPacket[]>(
        'SELECT workout_key FROM checkin_workouts WHERE checkin_id = ?',
        [numericId],
      );
      await conn.execute('DELETE FROM attendance_checkins WHERE id = ?', [numericId]);
      await conn.commit();

      const workouts = emptyWorkouts();
      for (const t of tagRows) {
        const mapped = fromDbWorkoutKey(String(t.workout_key));
        if (mapped) workouts[mapped] = true;
      }
      return {
        deleted: {
          id: String(base.id),
          memberId: String(base.member_id),
          sessionDate: formatDbDate(base.session_date),
          checkInTime: formatDbTime(base.checked_in_at),
          ingressGate: 'Manual',
          workouts,
        },
      };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  async getOutreachMeta(): Promise<{
    template: string;
    latestDispatch: OutreachDispatchBanner | null;
  }> {
    const [settingRows] = await this.pool.execute<RowDataPacket[]>(
      "SELECT setting_value FROM studio_settings WHERE setting_key = 'outreach_template' LIMIT 1",
    );
    const template = settingRows[0]?.setting_value
      ? String(settingRows[0].setting_value)
      : DEFAULT_TEMPLATE;

    const [dispatchRows] = await this.pool.execute<RowDataPacket[]>(`
      SELECT o.id, m.full_name, o.channel, o.message_body, o.sent_at
      FROM outreach_logs o
      JOIN members m ON m.id = o.member_id
      ORDER BY o.sent_at DESC
      LIMIT 1
    `);

    const latest = dispatchRows[0]
      ? {
          id: String(dispatchRows[0].id),
          recipientSummary: String(dispatchRows[0].full_name),
          channel: (dispatchRows[0].channel === 'SMS' ? 'SMS' : 'WhatsApp') as
            | 'WhatsApp'
            | 'SMS',
          timestamp: formatDbTime(dispatchRows[0].sent_at),
          messagePreview: String(dispatchRows[0].message_body),
        }
      : null;

    return { template, latestDispatch: latest };
  }

  async updateOutreachTemplate(template: string): Promise<string> {
    await this.pool.execute(
      `INSERT INTO studio_settings (setting_key, setting_value)
       VALUES ('outreach_template', ?)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
      [template],
    );
    return template;
  }

  async sendOutreach(input: {
    memberIds: string[];
    channel: 'WhatsApp' | 'SMS';
    coachId: string;
  }): Promise<{ dispatch: OutreachDispatchBanner; count: number }> {
    const { template } = await this.getOutreachMeta();
    const numericIds = input.memberIds
      .map(Number)
      .filter((n) => Number.isInteger(n) && n > 0);
    if (numericIds.length === 0) {
      throw new Error('No valid members selected for outreach.');
    }

    const placeholders = numericIds.map(() => '?').join(',');
    const [memberRows] = await this.pool.execute<RowDataPacket[]>(
      `SELECT id, full_name FROM members WHERE id IN (${placeholders})`,
      numericIds,
    );
    if (memberRows.length === 0) {
      throw new Error('Selected members not found.');
    }

    const numericCoachId = Number(input.coachId);
    const validCoachId =
      Number.isInteger(numericCoachId) && numericCoachId > 0 ? numericCoachId : null;

    let firstMessage = '';
    for (const row of memberRows) {
      const fullName = String(row.full_name);
      const firstName = fullName.split(' ')[0];
      const body = template.replaceAll('[First Name]', firstName);
      if (!firstMessage) firstMessage = body;
      await this.pool.execute(
        `INSERT INTO outreach_logs (member_id, coach_id, channel, message_body, delivery_status)
         VALUES (?, ?, ?, ?, 'delivered')`,
        [row.id, validCoachId, input.channel, body],
      );
    }

    const firstFullName = String(memberRows[0].full_name);
    const recipientSummary =
      memberRows.length === 1
        ? firstFullName
        : `${memberRows.length} athletes (incl. ${firstFullName})`;

    return {
      count: memberRows.length,
      dispatch: {
        id: `disp-${Date.now()}`,
        recipientSummary,
        channel: input.channel,
        timestamp: formatTimeNow(),
        messagePreview: firstMessage,
      },
    };
  }
}
