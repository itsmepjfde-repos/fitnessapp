import { hashPassword, safeEqualSecret, verifyPassword } from './auth.ts';
import {
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
  getTodayIsoDate,
  shiftIsoDate,
} from './types.ts';

interface PreviewCoachRecord extends CoachAccount {
  passwordHash: string;
}

interface PreviewMemberBase {
  id: string;
  pfId: string;
  name: string;
  initials: string;
  phone: string;
  tier?: string;
  creditsRemaining?: number;
  morningBatch?: boolean;
  progressSeries: WeeklyProgressPoint[];
  outreachHistory: MemberOutreachLog[];
}

interface PreviewCheckIn extends CheckInEntry {
  workoutClassName: string;
  creditDeducted: boolean;
}

const DEFAULT_TEMPLATE =
  "Hey [First Name]! Coach Danny noticed you missed this week at DANNY'STHENICS. We have a new agility session ready for you tomorrow! Tap to reserve your spot: dannysthenics.co/book";

function daysBetween(olderIso: string, newerIso: string): number {
  const [y1, m1, d1] = olderIso.split('-').map(Number);
  const [y2, m2, d2] = newerIso.split('-').map(Number);
  const t1 = Date.UTC(y1, m1 - 1, d1);
  const t2 = Date.UTC(y2, m2 - 1, d2);
  return Math.max(0, Math.round((t2 - t1) / 86400000));
}

function formatCoachName(email: string, fullName?: string): string {
  if (fullName && fullName.trim().length > 0) return fullName.trim();
  const localPart = email.split('@')[0] || 'Coach';
  const formatted = localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');
  return formatted.toLowerCase().startsWith('coach')
    ? formatted
    : `Coach ${formatted}`;
}

function createInitialData() {
  const today = getTodayIsoDate();
  const d = (offset: number) => shiftIsoDate(today, -offset);

  const members: PreviewMemberBase[] = [
    {
      id: '1',
      pfId: '#89201',
      name: 'Sophia Chen',
      initials: 'SC',
      tier: 'Elite Athlete',
      phone: '+1 (555) 382-9102',
      creditsRemaining: 11,
      morningBatch: false,
      progressSeries: [
        { weekLabel: 'W1', sessions: 4, strengthIndex: 78 },
        { weekLabel: 'W2', sessions: 4, strengthIndex: 82 },
        { weekLabel: 'W3', sessions: 3, strengthIndex: 84 },
        { weekLabel: 'W4', sessions: 2, strengthIndex: 83 },
        { weekLabel: 'W5', sessions: 1, strengthIndex: 80 },
        { weekLabel: 'W6', sessions: 0, strengthIndex: 77 },
      ],
      outreachHistory: [
        {
          id: 'out-1',
          channel: 'WhatsApp',
          timestamp: `${today} · 9:15 AM`,
          message:
            "We miss you at DANNY'STHENICS! Agile Shred tomorrow at 7:00 AM",
        },
      ],
    },
    {
      id: '2',
      pfId: '#89145',
      name: 'David Miller',
      initials: 'DM',
      tier: 'Unlimited Pro',
      phone: '+1 (555) 749-2311',
      creditsRemaining: 24,
      morningBatch: false,
      progressSeries: [
        { weekLabel: 'W1', sessions: 4, strengthIndex: 84 },
        { weekLabel: 'W2', sessions: 5, strengthIndex: 86 },
        { weekLabel: 'W3', sessions: 5, strengthIndex: 89 },
        { weekLabel: 'W4', sessions: 4, strengthIndex: 90 },
        { weekLabel: 'W5', sessions: 5, strengthIndex: 93 },
        { weekLabel: 'W6', sessions: 5, strengthIndex: 95 },
      ],
      outreachHistory: [],
    },
    {
      id: '3',
      pfId: '#87992',
      name: "Liam O'Connor",
      initials: 'LO',
      tier: 'Standard Club',
      phone: '+1 (555) 604-1189',
      creditsRemaining: 6,
      morningBatch: false,
      progressSeries: [
        { weekLabel: 'W1', sessions: 2, strengthIndex: 74 },
        { weekLabel: 'W2', sessions: 1, strengthIndex: 72 },
        { weekLabel: 'W3', sessions: 0, strengthIndex: 70 },
        { weekLabel: 'W4', sessions: 0, strengthIndex: 68 },
        { weekLabel: 'W5', sessions: 0, strengthIndex: 66 },
        { weekLabel: 'W6', sessions: 0, strengthIndex: 64 },
      ],
      outreachHistory: [
        {
          id: 'out-2',
          channel: 'SMS',
          timestamp: `${d(12)} · 10:40 AM`,
          message:
            "Hey Liam! Your 6 remaining credits are ready whenever you're back on the floor.",
        },
      ],
    },
    {
      id: '4',
      pfId: '#1042',
      name: 'Devon Ray',
      initials: 'DR',
      tier: 'Tier 1 Pro Athlete',
      phone: '+1 (555) 412-8840',
      creditsRemaining: 19,
      morningBatch: true,
      progressSeries: [
        { weekLabel: 'W1', sessions: 5, strengthIndex: 88 },
        { weekLabel: 'W2', sessions: 5, strengthIndex: 90 },
        { weekLabel: 'W3', sessions: 6, strengthIndex: 92 },
        { weekLabel: 'W4', sessions: 5, strengthIndex: 93 },
        { weekLabel: 'W5', sessions: 5, strengthIndex: 96 },
        { weekLabel: 'W6', sessions: 6, strengthIndex: 98 },
      ],
      outreachHistory: [],
    },
    {
      id: '5',
      pfId: '#883',
      name: 'Elena Rostova',
      initials: 'ER',
      tier: 'Olympic Lifting Sub',
      phone: '+1 (555) 298-4410',
      creditsRemaining: 16,
      morningBatch: true,
      progressSeries: [
        { weekLabel: 'W1', sessions: 4, strengthIndex: 82 },
        { weekLabel: 'W2', sessions: 4, strengthIndex: 84 },
        { weekLabel: 'W3', sessions: 5, strengthIndex: 86 },
        { weekLabel: 'W4', sessions: 4, strengthIndex: 88 },
        { weekLabel: 'W5', sessions: 5, strengthIndex: 90 },
        { weekLabel: 'W6', sessions: 5, strengthIndex: 92 },
      ],
      outreachHistory: [],
    },
    {
      id: '6',
      pfId: '#670',
      name: 'Carlos Mendoza',
      initials: 'CM',
      tier: 'Elite Track & Field',
      phone: '+1 (555) 893-1725',
      creditsRemaining: 28,
      morningBatch: true,
      progressSeries: [
        { weekLabel: 'W1', sessions: 5, strengthIndex: 90 },
        { weekLabel: 'W2', sessions: 6, strengthIndex: 91 },
        { weekLabel: 'W3', sessions: 5, strengthIndex: 93 },
        { weekLabel: 'W4', sessions: 6, strengthIndex: 94 },
        { weekLabel: 'W5', sessions: 6, strengthIndex: 96 },
        { weekLabel: 'W6', sessions: 6, strengthIndex: 97 },
      ],
      outreachHistory: [],
    },
    {
      id: '7',
      pfId: '#914',
      name: 'Tariq Khan',
      initials: 'TK',
      tier: 'Morning Regular',
      phone: '+1 (555) 531-6648',
      creditsRemaining: 14,
      morningBatch: true,
      progressSeries: [
        { weekLabel: 'W1', sessions: 3, strengthIndex: 75 },
        { weekLabel: 'W2', sessions: 4, strengthIndex: 78 },
        { weekLabel: 'W3', sessions: 4, strengthIndex: 80 },
        { weekLabel: 'W4', sessions: 4, strengthIndex: 82 },
        { weekLabel: 'W5', sessions: 4, strengthIndex: 84 },
        { weekLabel: 'W6', sessions: 4, strengthIndex: 86 },
      ],
      outreachHistory: [],
    },
    {
      id: '8',
      pfId: '#849',
      name: 'K. Henderson',
      initials: 'KH',
      tier: 'Morning Regular',
      phone: '+1 (555) 204-8391',
      creditsRemaining: 12,
      morningBatch: true,
      progressSeries: [
        { weekLabel: 'W1', sessions: 3, strengthIndex: 79 },
        { weekLabel: 'W2', sessions: 4, strengthIndex: 81 },
        { weekLabel: 'W3', sessions: 3, strengthIndex: 82 },
        { weekLabel: 'W4', sessions: 4, strengthIndex: 85 },
        { weekLabel: 'W5', sessions: 4, strengthIndex: 86 },
        { weekLabel: 'W6', sessions: 3, strengthIndex: 87 },
      ],
      outreachHistory: [],
    },
    {
      id: '9',
      pfId: '#112',
      name: 'J. Morales',
      initials: 'JM',
      tier: 'Unlimited Pro',
      phone: '+1 (555) 774-1029',
      creditsRemaining: 21,
      morningBatch: true,
      progressSeries: [
        { weekLabel: 'W1', sessions: 4, strengthIndex: 83 },
        { weekLabel: 'W2', sessions: 4, strengthIndex: 84 },
        { weekLabel: 'W3', sessions: 5, strengthIndex: 87 },
        { weekLabel: 'W4', sessions: 4, strengthIndex: 88 },
        { weekLabel: 'W5', sessions: 4, strengthIndex: 89 },
        { weekLabel: 'W6', sessions: 5, strengthIndex: 91 },
      ],
      outreachHistory: [],
    },
    {
      id: '10',
      pfId: '#902',
      name: 'A. Chen',
      initials: 'AC',
      tier: 'Elite Athlete',
      phone: '+1 (555) 689-3304',
      creditsRemaining: 18,
      morningBatch: true,
      progressSeries: [
        { weekLabel: 'W1', sessions: 4, strengthIndex: 86 },
        { weekLabel: 'W2', sessions: 4, strengthIndex: 87 },
        { weekLabel: 'W3', sessions: 4, strengthIndex: 89 },
        { weekLabel: 'W4', sessions: 5, strengthIndex: 91 },
        { weekLabel: 'W5', sessions: 4, strengthIndex: 92 },
        { weekLabel: 'W6', sessions: 4, strengthIndex: 93 },
      ],
      outreachHistory: [],
    },
    {
      id: '11',
      pfId: '#89310',
      name: 'Maya Patel',
      initials: 'MP',
      tier: 'Unlimited Pro',
      phone: '+1 (555) 912-4402',
      creditsRemaining: 9,
      morningBatch: true,
      progressSeries: [
        { weekLabel: 'W1', sessions: 3, strengthIndex: 76 },
        { weekLabel: 'W2', sessions: 4, strengthIndex: 79 },
        { weekLabel: 'W3', sessions: 3, strengthIndex: 81 },
        { weekLabel: 'W4', sessions: 2, strengthIndex: 80 },
        { weekLabel: 'W5', sessions: 1, strengthIndex: 78 },
        { weekLabel: 'W6', sessions: 0, strengthIndex: 75 },
      ],
      outreachHistory: [],
    },
    {
      id: '12',
      pfId: '#89188',
      name: 'Marcus Vance',
      initials: 'MV',
      tier: 'Standard Club',
      phone: '+1 (555) 443-9275',
      creditsRemaining: 7,
      morningBatch: false,
      progressSeries: [
        { weekLabel: 'W1', sessions: 3, strengthIndex: 80 },
        { weekLabel: 'W2', sessions: 3, strengthIndex: 82 },
        { weekLabel: 'W3', sessions: 2, strengthIndex: 82 },
        { weekLabel: 'W4', sessions: 2, strengthIndex: 81 },
        { weekLabel: 'W5', sessions: 1, strengthIndex: 79 },
        { weekLabel: 'W6', sessions: 1, strengthIndex: 78 },
      ],
      outreachHistory: [],
    },
    {
      id: '13',
      pfId: '#89402',
      name: 'Zoe Alvarez',
      initials: 'ZA',
      tier: 'Elite Athlete',
      phone: '+1 (555) 318-7741',
      creditsRemaining: 15,
      morningBatch: true,
      progressSeries: [
        { weekLabel: 'W1', sessions: 4, strengthIndex: 84 },
        { weekLabel: 'W2', sessions: 3, strengthIndex: 85 },
        { weekLabel: 'W3', sessions: 2, strengthIndex: 83 },
        { weekLabel: 'W4', sessions: 2, strengthIndex: 81 },
        { weekLabel: 'W5', sessions: 0, strengthIndex: 79 },
        { weekLabel: 'W6', sessions: 0, strengthIndex: 77 },
      ],
      outreachHistory: [],
    },
    {
      id: '14',
      pfId: '#87640',
      name: 'Noah Takahashi',
      initials: 'NT',
      tier: 'Standard Club',
      phone: '+1 (555) 650-2198',
      creditsRemaining: 4,
      morningBatch: false,
      progressSeries: [
        { weekLabel: 'W1', sessions: 1, strengthIndex: 70 },
        { weekLabel: 'W2', sessions: 0, strengthIndex: 68 },
        { weekLabel: 'W3', sessions: 0, strengthIndex: 67 },
        { weekLabel: 'W4', sessions: 0, strengthIndex: 65 },
        { weekLabel: 'W5', sessions: 0, strengthIndex: 64 },
        { weekLabel: 'W6', sessions: 0, strengthIndex: 63 },
      ],
      outreachHistory: [],
    },
    {
      id: '15',
      pfId: '#89055',
      name: 'Chloe Bennett',
      initials: 'CB',
      tier: 'Unlimited Pro',
      phone: '+1 (555) 822-5190',
      creditsRemaining: 20,
      morningBatch: true,
      progressSeries: [
        { weekLabel: 'W1', sessions: 4, strengthIndex: 81 },
        { weekLabel: 'W2', sessions: 5, strengthIndex: 84 },
        { weekLabel: 'W3', sessions: 4, strengthIndex: 85 },
        { weekLabel: 'W4', sessions: 5, strengthIndex: 88 },
        { weekLabel: 'W5', sessions: 4, strengthIndex: 89 },
        { weekLabel: 'W6', sessions: 5, strengthIndex: 91 },
      ],
      outreachHistory: [],
    },
    {
      id: '16',
      pfId: '#88119',
      name: 'Jordan Brooks',
      initials: 'JB',
      tier: 'Morning Regular',
      phone: '+1 (555) 971-6034',
      creditsRemaining: 5,
      morningBatch: false,
      progressSeries: [
        { weekLabel: 'W1', sessions: 2, strengthIndex: 72 },
        { weekLabel: 'W2', sessions: 1, strengthIndex: 71 },
        { weekLabel: 'W3', sessions: 0, strengthIndex: 69 },
        { weekLabel: 'W4', sessions: 0, strengthIndex: 68 },
        { weekLabel: 'W5', sessions: 0, strengthIndex: 67 },
        { weekLabel: 'W6', sessions: 0, strengthIndex: 65 },
      ],
      outreachHistory: [],
    },
  ];

  // Multi-date attendance check-ins with explicit workout tags per (member × date)
  const checkIns: PreviewCheckIn[] = [
    // Today
    {
      id: 'chk-1',
      memberId: '4',
      sessionDate: today,
      checkInTime: '07:02 AM',
      ingressGate: 'GATE 01 NFC',
      workoutClassName: 'Agility & Weight Training',
      creditDeducted: true,
      workouts: { agility: true, flexibility: false, core: false, weightTraining: true },
    },
    {
      id: 'chk-2',
      memberId: '5',
      sessionDate: today,
      checkInTime: '07:05 AM',
      ingressGate: 'TURNSTILE A',
      workoutClassName: 'Mobility & Plyometric Flow',
      creditDeducted: true,
      workouts: { agility: true, flexibility: true, core: false, weightTraining: false },
    },
    {
      id: 'chk-3',
      memberId: '6',
      sessionDate: today,
      checkInTime: '06:58 AM',
      ingressGate: 'TERMINAL 3',
      workoutClassName: 'Full Calisthenics Circuit',
      creditDeducted: true,
      workouts: { agility: true, flexibility: true, core: true, weightTraining: true },
    },
    {
      id: 'chk-4',
      memberId: '7',
      sessionDate: today,
      checkInTime: '07:11 AM',
      ingressGate: 'DESK FAST-CHECK',
      workoutClassName: 'Core & Rings Foundation',
      creditDeducted: true,
      workouts: { agility: false, flexibility: false, core: true, weightTraining: false },
    },
    // Yesterday
    {
      id: 'chk-5',
      memberId: '2',
      sessionDate: d(1),
      checkInTime: '06:30 PM',
      ingressGate: 'TURNSTILE A',
      workoutClassName: 'Core Power & Conditioning',
      creditDeducted: true,
      workouts: { agility: true, flexibility: false, core: true, weightTraining: true },
    },
    {
      id: 'chk-6',
      memberId: '9',
      sessionDate: d(1),
      checkInTime: '07:00 AM',
      ingressGate: 'GATE 01 NFC',
      workoutClassName: 'Explosive Sprint Conditioning',
      creditDeducted: true,
      workouts: { agility: true, flexibility: true, core: false, weightTraining: false },
    },
    {
      id: 'chk-7',
      memberId: '15',
      sessionDate: d(1),
      checkInTime: '07:30 AM',
      ingressGate: 'TURNSTILE A',
      workoutClassName: 'Agile Shred Conditioning',
      creditDeducted: true,
      workouts: { agility: true, flexibility: true, core: true, weightTraining: false },
    },
    {
      id: 'chk-8',
      memberId: '4',
      sessionDate: d(2),
      checkInTime: '07:04 AM',
      ingressGate: 'GATE 01 NFC',
      workoutClassName: 'Lower Body Power Block',
      creditDeducted: true,
      workouts: { agility: true, flexibility: true, core: true, weightTraining: true },
    },
    {
      id: 'chk-9',
      memberId: '8',
      sessionDate: d(2),
      checkInTime: '06:30 AM',
      ingressGate: 'TURNSTILE A',
      workoutClassName: 'Strict Pull-Up Progression',
      creditDeducted: true,
      workouts: { agility: false, flexibility: true, core: true, weightTraining: true },
    },
    {
      id: 'chk-10',
      memberId: '10',
      sessionDate: d(2),
      checkInTime: '07:15 AM',
      ingressGate: 'GATE 01 NFC',
      workoutClassName: 'Gymnastic Rings & Core',
      creditDeducted: true,
      workouts: { agility: true, flexibility: false, core: true, weightTraining: true },
    },
    {
      id: 'chk-11',
      memberId: '2',
      sessionDate: d(3),
      checkInTime: '06:35 PM',
      ingressGate: 'TURNSTILE A',
      workoutClassName: 'Upper Body Conditioning',
      creditDeducted: true,
      workouts: { agility: false, flexibility: true, core: true, weightTraining: true },
    },
    {
      id: 'chk-12',
      memberId: '5',
      sessionDate: d(3),
      checkInTime: '07:10 AM',
      ingressGate: 'TURNSTILE A',
      workoutClassName: 'Olympic Pull & Core',
      creditDeducted: true,
      workouts: { agility: true, flexibility: true, core: true, weightTraining: true },
    },
    {
      id: 'chk-13',
      memberId: '6',
      sessionDate: d(4),
      checkInTime: '06:55 AM',
      ingressGate: 'TERMINAL 3',
      workoutClassName: 'Track Sprint & Mobility',
      creditDeducted: true,
      workouts: { agility: true, flexibility: true, core: false, weightTraining: true },
    },
    // At-Risk (8-14 days ago)
    {
      id: 'chk-14',
      memberId: '1',
      sessionDate: d(9),
      checkInTime: '07:00 AM',
      ingressGate: 'TURNSTILE A',
      workoutClassName: 'HIIT Kettlebell Shred',
      creditDeducted: true,
      workouts: { agility: true, flexibility: false, core: true, weightTraining: true },
    },
    {
      id: 'chk-15',
      memberId: '1',
      sessionDate: d(13),
      checkInTime: '07:05 AM',
      ingressGate: 'GATE 01 NFC',
      workoutClassName: 'Calisthenics Flow',
      creditDeducted: true,
      workouts: { agility: true, flexibility: true, core: true, weightTraining: false },
    },
    {
      id: 'chk-16',
      memberId: '11',
      sessionDate: d(11),
      checkInTime: '06:00 PM',
      ingressGate: 'TURNSTILE A',
      workoutClassName: 'Calisthenics Skill Lab',
      creditDeducted: true,
      workouts: { agility: true, flexibility: true, core: false, weightTraining: false },
    },
    {
      id: 'chk-17',
      memberId: '12',
      sessionDate: d(8),
      checkInTime: '05:30 PM',
      ingressGate: 'DESK FAST-CHECK',
      workoutClassName: 'Weighted Dip & Pull Block',
      creditDeducted: true,
      workouts: { agility: false, flexibility: false, core: true, weightTraining: true },
    },
    {
      id: 'chk-18',
      memberId: '13',
      sessionDate: d(13),
      checkInTime: '07:30 AM',
      ingressGate: 'GATE 01 NFC',
      workoutClassName: 'Handstand & Shoulder Prep',
      creditDeducted: true,
      workouts: { agility: false, flexibility: true, core: true, weightTraining: false },
    },
    // Inactive (>30 days ago)
    {
      id: 'chk-19',
      memberId: '3',
      sessionDate: d(34),
      checkInTime: '08:00 AM',
      ingressGate: 'TERMINAL 3',
      workoutClassName: 'Heavy Barbell Strength',
      creditDeducted: true,
      workouts: { agility: false, flexibility: false, core: true, weightTraining: true },
    },
    {
      id: 'chk-20',
      memberId: '14',
      sessionDate: d(41),
      checkInTime: '06:00 PM',
      ingressGate: 'TURNSTILE A',
      workoutClassName: 'Kettlebell Metcon',
      creditDeducted: true,
      workouts: { agility: true, flexibility: false, core: false, weightTraining: true },
    },
    {
      id: 'chk-21',
      memberId: '16',
      sessionDate: d(37),
      checkInTime: '07:00 AM',
      ingressGate: 'DESK FAST-CHECK',
      workoutClassName: 'Strength & Mobility Base',
      creditDeducted: true,
      workouts: { agility: false, flexibility: true, core: false, weightTraining: true },
    },
  ];

  const latestDispatch: OutreachDispatchBanner = {
    id: 'disp-seed-1',
    recipientSummary: 'Sophia Chen',
    channel: 'WhatsApp',
    timestamp: '9:15 AM',
    messagePreview:
      "We miss you at DANNY'STHENICS! Agile Shred tomorrow at 7:00 AM",
  };

  return { members, checkIns, latestDispatch };
}

export class PreviewPortalRepository implements PortalRepository {
  readonly storageMode = 'preview' as const;
  private coaches: PreviewCoachRecord[] = [];
  private members: PreviewMemberBase[];
  private checkIns: PreviewCheckIn[];
  private outreachTemplate: string = DEFAULT_TEMPLATE;
  private latestDispatch: OutreachDispatchBanner | null;

  constructor() {
    const seed = createInitialData();
    this.members = seed.members;
    this.checkIns = seed.checkIns;
    this.latestDispatch = seed.latestDispatch;
  }

  async getAuthStatus(): Promise<AuthStatusResponse> {
    const envPass = process.env.COACH_ADMIN_PASSWORD?.trim();
    if (envPass) {
      return { storageMode: 'preview', needsSetup: false };
    }
    return {
      storageMode: 'preview',
      needsSetup: this.coaches.length === 0,
    };
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
    const coachName = formatCoachName(email, input.fullName);
    const passwordHash = await hashPassword(input.password);
    const created: PreviewCoachRecord = {
      id: 'coach-1',
      email,
      coachName,
      roleTitle: 'Head Conditioning Coach',
      passwordHash,
    };
    this.coaches.push(created);
    return {
      id: created.id,
      email: created.email,
      coachName: created.coachName,
      roleTitle: created.roleTitle,
    };
  }

  async authenticateCoach(
    email: string,
    password: string,
  ): Promise<CoachAccount | null> {
    const cleanEmail = email.trim().toLowerCase();
    const envPass = process.env.COACH_ADMIN_PASSWORD?.trim();
    if (envPass && safeEqualSecret(password, envPass)) {
      return {
        id: 'env-admin',
        email: cleanEmail,
        coachName: formatCoachName(cleanEmail),
        roleTitle: 'Head Conditioning Coach',
      };
    }

    const found = this.coaches.find((c) => c.email === cleanEmail);
    if (!found) return null;
    const valid = await verifyPassword(password, found.passwordHash);
    if (!valid) return null;
    return {
      id: found.id,
      email: found.email,
      coachName: found.coachName,
      roleTitle: found.roleTitle,
    };
  }

  private hydrateMember(m: PreviewMemberBase): MemberRecord {
    const today = getTodayIsoDate();
    const memberCheckins = this.checkIns
      .filter((c) => c.memberId === m.id)
      .sort((a, b) => b.sessionDate.localeCompare(a.sessionDate));

    const latest = memberCheckins[0] ?? null;
    const daysSince = latest ? daysBetween(latest.sessionDate, today) : 99;
    const cutoff28 = shiftIsoDate(today, -28);
    const visits28d = memberCheckins.filter((c) => c.sessionDate >= cutoff28).length;
    const baselineSeriesAvg =
      m.progressSeries.length > 0
        ? m.progressSeries[m.progressSeries.length - 1].sessions
        : 0;
    const cadence = Number(
      Math.max(visits28d / 4, daysSince <= 7 ? baselineSeriesAvg * 0.85 : visits28d / 4).toFixed(1),
    );

    const attendanceHistory: MemberDateWorkoutEntry[] = memberCheckins.map((c) => ({
      checkInId: c.id,
      sessionDate: c.sessionDate,
      checkInTime: c.checkInTime,
      workoutClassName: c.workoutClassName,
      workouts: { ...c.workouts },
    }));

    return {
      id: m.id,
      pfId: m.pfId,
      name: m.name,
      initials: m.initials,
      phone: m.phone,
      status: computeStatusFromDays(daysSince),
      daysSinceLastVisit: daysSince,
      lastAttendedLabel: formatLastAttendedLabel(
        latest?.sessionDate ?? null,
        latest?.checkInTime ?? null,
        daysSince,
      ),
      lastWorkoutClass: latest?.workoutClassName ?? 'Onboarding Assessment',
      cadencePerWeek: cadence,
      progressSeries: [...m.progressSeries],
      outreachHistory: [...m.outreachHistory],
      attendanceHistory,
    };
  }

  async listMembers(): Promise<MemberRecord[]> {
    return this.members.map((m) => this.hydrateMember(m));
  }

  async getMemberHistory(memberId: string): Promise<MemberRecord | null> {
    const found = this.members.find((m) => m.id === memberId);
    return found ? this.hydrateMember(found) : null;
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
    const created: PreviewMemberBase = {
      id: String(Date.now()),
      pfId: `#${num}`,
      name: trimmed,
      initials,
      phone: input.phone.trim(),
      progressSeries: [
        { weekLabel: 'W1', sessions: 2, strengthIndex: 74 },
        { weekLabel: 'W2', sessions: 3, strengthIndex: 77 },
        { weekLabel: 'W3', sessions: 3, strengthIndex: 80 },
      ],
      outreachHistory: [],
    };
    this.members.unshift(created);
    return this.hydrateMember(created);
  }

  async logMemberProgress(
    memberId: string,
    strengthIndex: number,
    sessions: number,
  ): Promise<MemberRecord | null> {
    const found = this.members.find((m) => m.id === memberId);
    if (!found) return null;
    const nextWeek = found.progressSeries.length + 1;
    found.progressSeries = [
      ...found.progressSeries.slice(-5),
      { weekLabel: `W${nextWeek}`, sessions, strengthIndex },
    ];
    return this.hydrateMember(found);
  }

  async getAttendanceByDate(sessionDate: string): Promise<CheckInEntry[]> {
    return this.checkIns
      .filter((c) => c.sessionDate === sessionDate)
      .map((c) => ({
        id: c.id,
        memberId: c.memberId,
        sessionDate: c.sessionDate,
        checkInTime: c.checkInTime,
        ingressGate: 'Manual',
        creditDeducted: false,
        workouts: { ...c.workouts },
      }));
  }

  async batchCheckIn(input: {
    sessionDate: string;
    memberIds: string[];
    checkInTime: string;
  }): Promise<{ addedCount: number; checkIns: CheckInEntry[] }> {
    const existingForDate = new Set(
      this.checkIns
        .filter((c) => c.sessionDate === input.sessionDate)
        .map((c) => c.memberId),
    );
    const [hourValue, minuteValue] = input.checkInTime.split(':').map(Number);
    const suffix = hourValue >= 12 ? 'PM' : 'AM';
    const hour12 = hourValue % 12 || 12;
    const timeNow = `${String(hour12).padStart(2, '0')}:${String(minuteValue).padStart(2, '0')} ${suffix}`;
    let addedCount = 0;

    for (const memberId of input.memberIds) {
      if (existingForDate.has(memberId)) continue;
      const member = this.members.find((m) => m.id === memberId);
      if (!member) continue;
      existingForDate.add(memberId);
      addedCount += 1;

      this.checkIns.unshift({
        id: `chk-${memberId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        memberId,
        sessionDate: input.sessionDate,
        checkInTime: timeNow,
        ingressGate: 'Manual',
        workoutClassName: 'Batch Studio Session',
        creditDeducted: false,
        workouts: {
          agility: false,
          flexibility: false,
          core: false,
          weightTraining: false,
        },
      });
    }

    return {
      addedCount,
      checkIns: await this.getAttendanceByDate(input.sessionDate),
    };
  }

  async toggleCheckInWorkout(input: {
    checkInId: string;
    workoutKey?: WorkoutKey;
    allDone?: boolean;
  }): Promise<CheckInEntry | null> {
    const entry = this.checkIns.find((c) => c.id === input.checkInId);
    if (!entry) return null;

    if (typeof input.allDone === 'boolean') {
      entry.workouts = {
        agility: input.allDone,
        flexibility: input.allDone,
        core: input.allDone,
        weightTraining: input.allDone,
      };
    } else if (input.workoutKey) {
      entry.workouts[input.workoutKey] = !entry.workouts[input.workoutKey];
    }

    return {
      id: entry.id,
      memberId: entry.memberId,
      sessionDate: entry.sessionDate,
      checkInTime: entry.checkInTime,
      ingressGate: entry.ingressGate,
      workouts: { ...entry.workouts },
    };
  }

  async deleteCheckIn(
    checkInId: string,
  ): Promise<{ deleted: CheckInEntry } | null> {
    const idx = this.checkIns.findIndex((c) => c.id === checkInId);
    if (idx === -1) return null;
    const [removed] = this.checkIns.splice(idx, 1);
    return {
      deleted: {
        id: removed.id,
        memberId: removed.memberId,
        sessionDate: removed.sessionDate,
        checkInTime: removed.checkInTime,
        ingressGate: removed.ingressGate,
        workouts: { ...removed.workouts },
      },
    };
  }

  async getOutreachMeta(): Promise<{
    template: string;
    latestDispatch: OutreachDispatchBanner | null;
  }> {
    return {
      template: this.outreachTemplate,
      latestDispatch: this.latestDispatch,
    };
  }

  async updateOutreachTemplate(template: string): Promise<string> {
    this.outreachTemplate = template;
    return template;
  }

  async sendOutreach(input: {
    memberIds: string[];
    channel: 'WhatsApp' | 'SMS';
  }): Promise<{ dispatch: OutreachDispatchBanner; count: number }> {
    const targets = this.members.filter((m) => input.memberIds.includes(m.id));
    if (targets.length === 0) {
      throw new Error('No matching members selected for outreach.');
    }
    const timeNow = formatTimeNow();
    const today = getTodayIsoDate();
    let firstPreview = '';

    for (const member of targets) {
      const firstName = member.name.split(' ')[0];
      const msg = this.outreachTemplate.replaceAll('[First Name]', firstName);
      if (!firstPreview) firstPreview = msg;
      member.outreachHistory.unshift({
        id: `out-${member.id}-${Date.now()}`,
        channel: input.channel,
        timestamp: `${today} · ${timeNow}`,
        message: msg,
      });
    }

    const recipientSummary =
      targets.length === 1
        ? targets[0].name
        : `${targets.length} athletes (incl. ${targets[0].name})`;

    this.latestDispatch = {
      id: `disp-${Date.now()}`,
      recipientSummary,
      channel: input.channel,
      timestamp: timeNow,
      messagePreview: firstPreview,
    };

    return {
      count: targets.length,
      dispatch: this.latestDispatch,
    };
  }

  async resetDemoData(): Promise<void> {
    const fresh = createInitialData();
    this.members = fresh.members;
    this.checkIns = fresh.checkIns;
    this.outreachTemplate = DEFAULT_TEMPLATE;
    this.latestDispatch = fresh.latestDispatch;
  }
}
