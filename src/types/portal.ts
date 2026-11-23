export type MemberStatus = 'active' | 'at_risk' | 'inactive';

export type WorkoutKey = 'agility' | 'flexibility' | 'core' | 'weightTraining';

export type AppView = 'attendance' | 'directory';

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

export interface Member {
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
  dismissed?: boolean;
}

export interface AuthSession {
  id: string;
  email: string;
  coachName: string;
  roleTitle: string;
}

export interface AuthStatus {
  storageMode: 'mysql' | 'preview';
  needsSetup: boolean;
}

export interface ToastMessage {
  id: string;
  title: string;
  detail?: string;
  tone: 'emerald' | 'crimson' | 'volt';
  undoAction?: () => void;
}

export const WORKOUT_META: { key: WorkoutKey; label: string }[] = [
  { key: 'agility', label: 'Agility' },
  { key: 'flexibility', label: 'Flexibility' },
  { key: 'core', label: 'Core' },
  { key: 'weightTraining', label: 'Weight Training' },
];

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
