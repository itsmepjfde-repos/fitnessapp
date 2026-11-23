export type MemberStatus = 'active' | 'at_risk' | 'inactive';
export type WorkoutKey = 'agility' | 'flexibility' | 'core' | 'weightTraining';
export type DbWorkoutKey = 'agility' | 'flexibility' | 'core' | 'weight_training';

export interface CoachAccount {
  id: string;
  email: string;
  coachName: string;
  roleTitle: string;
}

export interface AuthStatusResponse {
  storageMode: 'mysql' | 'preview';
  needsSetup: boolean;
}

export interface WeeklyProgressPoint {
  weekLabel: string;
  sessions: number;
  strengthIndex: number;
}

export interface MemberOutreachLog {
  id: string;
  channel: 'WhatsApp' | 'SMS';
  timestamp: string;
  message: string;
}

export interface MemberDateWorkoutEntry {
  checkInId: string;
  sessionDate: string; // YYYY-MM-DD
  checkInTime: string;
  workoutClassName: string;
  workouts: Record<WorkoutKey, boolean>;
}

export interface MemberRecord {
  id: string;
  pfId: string;
  name: string;
  initials: string;
  phone: string;
  status: MemberStatus;
  daysSinceLastVisit: number;
  lastAttendedLabel: string;
  lastWorkoutClass: string;
  cadencePerWeek: number;
  progressSeries: WeeklyProgressPoint[];
  outreachHistory: MemberOutreachLog[];
  attendanceHistory: MemberDateWorkoutEntry[];
}

export interface CheckInEntry {
  id: string;
  memberId: string;
  sessionDate: string; // YYYY-MM-DD
  checkInTime: string;
  ingressGate: string;
  workouts: Record<WorkoutKey, boolean>;
}

export interface OutreachDispatchBanner {
  id: string;
  recipientSummary: string;
  channel: 'WhatsApp' | 'SMS';
  timestamp: string;
  messagePreview: string;
}

export interface PortalRepository {
  readonly storageMode: 'mysql' | 'preview';
  getAuthStatus(): Promise<AuthStatusResponse>;
  setupFirstCoach(input: {
    email: string;
    password: string;
    fullName?: string;
  }): Promise<CoachAccount>;
  authenticateCoach(email: string, password: string): Promise<CoachAccount | null>;
  listMembers(): Promise<MemberRecord[]>;
  getMemberHistory(memberId: string): Promise<MemberRecord | null>;
  createMember(input: {
    name: string;
    phone: string;
  }): Promise<MemberRecord>;
  logMemberProgress(
    memberId: string,
    strengthIndex: number,
    sessions: number,
    coachId: string,
  ): Promise<MemberRecord | null>;
  getAttendanceByDate(sessionDate: string): Promise<CheckInEntry[]>;
  batchCheckIn(input: {
    sessionDate: string;
    memberIds: string[];
    checkInTime: string;
    coachId: string;
  }): Promise<{ addedCount: number; checkIns: CheckInEntry[] }>;
  toggleCheckInWorkout(input: {
    checkInId: string;
    workoutKey?: WorkoutKey;
    allDone?: boolean;
  }): Promise<CheckInEntry | null>;
  deleteCheckIn(checkInId: string): Promise<{ deleted: CheckInEntry } | null>;
  getOutreachMeta(): Promise<{
    template: string;
    latestDispatch: OutreachDispatchBanner | null;
  }>;
  updateOutreachTemplate(template: string): Promise<string>;
  sendOutreach(input: {
    memberIds: string[];
    channel: 'WhatsApp' | 'SMS';
    coachId: string;
  }): Promise<{ dispatch: OutreachDispatchBanner; count: number }>;
  resetDemoData?(): Promise<void>;
}

export const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const ALLOWED_WORKOUT_KEYS: WorkoutKey[] = [
  'agility',
  'flexibility',
  'core',
  'weightTraining',
];


export function toDbWorkoutKey(key: WorkoutKey): DbWorkoutKey {
  return key === 'weightTraining' ? 'weight_training' : key;
}

export function fromDbWorkoutKey(key: string): WorkoutKey | null {
  switch (key) {
    case 'agility':
      return 'agility';
    case 'flexibility':
      return 'flexibility';
    case 'core':
      return 'core';
    case 'weight_training':
      return 'weightTraining';
    default:
      return null;
  }
}

export function getTodayIsoDate(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function shiftIsoDate(baseIso: string, deltaDays: number): string {
  const [y, m, d] = baseIso.split('-').map(Number);
  const dt = new Date(y, m - 1, d + deltaDays);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

export function formatTimeNow(): string {
  return new Date().toLocaleTimeString('en-US', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function computeStatusFromDays(days: number): MemberStatus {
  if (days <= 7) return 'active';
  if (days <= 30) return 'at_risk';
  return 'inactive';
}

export function formatLastAttendedLabel(
  sessionDate: string | null,
  timeLabel: string | null,
  daysDiff: number,
): string {
  if (!sessionDate) return 'No visits recorded';
  const timePart = timeLabel || '07:00 AM';
  if (daysDiff <= 0) return `Today · ${timePart}`;
  if (daysDiff === 1) return `Yesterday · ${timePart}`;
  return `${daysDiff} days ago · ${timePart}`;
}
