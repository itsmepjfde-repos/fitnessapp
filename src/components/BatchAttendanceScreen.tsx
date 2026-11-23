import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  LoaderCircle,
  ListChecks,
  Printer,
  Save,
  Search,
  Trash2,
  UserCheck,
  X,
} from 'lucide-react';
import {
  CheckInEntry,
  Member,
  WORKOUT_META,
  WorkoutKey,
  getTodayIsoDate,
  shiftIsoDate,
} from '../types/portal';
import { MemberAvatar } from './MemberAvatar';

interface BatchAttendanceScreenProps {
  selectedDate: string;
  members: Member[];
  checkIns: CheckInEntry[];
  queuedMemberIds: string[];
  loadingAttendanceDate: boolean;
  confirmingBatchCheckIn: boolean;
  confirmingBatchMemberCount: number;
  removingCheckInId: string | null;
  onSelectDate: (dateIso: string) => void;
  onQueueMember: (memberId: string) => void;
  onUnqueueMember: (memberId: string) => void;
  onClearQueue: () => void;
  onConfirmBatchCheckIn: (checkInTime: string) => void;
  onSaveWorkouts: (
    checkInId: string,
    workouts: Record<WorkoutKey, boolean>,
  ) => Promise<boolean>;
  onRemoveCheckIn: (checkInId: string) => void;
}

function formatHumanDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function areWorkoutTagsEqual(
  left: Record<WorkoutKey, boolean>,
  right: Record<WorkoutKey, boolean>,
): boolean {
  return WORKOUT_META.every(({ key }) => left[key] === right[key]);
}

export function BatchAttendanceScreen({
  selectedDate,
  members,
  checkIns,
  queuedMemberIds,
  loadingAttendanceDate,
  confirmingBatchCheckIn,
  confirmingBatchMemberCount,
  removingCheckInId,
  onSelectDate,
  onQueueMember,
  onUnqueueMember,
  onClearQueue,
  onConfirmBatchCheckIn,
  onSaveWorkouts,
  onRemoveCheckIn,
}: BatchAttendanceScreenProps) {
  const [scanQuery, setScanQuery] = useState('');
  const [memberPickerOpen, setMemberPickerOpen] = useState(false);
  const [memberPickerQuery, setMemberPickerQuery] = useState('');
  const [memberPickerIds, setMemberPickerIds] = useState<string[]>([]);
  const [workoutDrafts, setWorkoutDrafts] = useState<
    Record<string, Record<WorkoutKey, boolean>>
  >({});
  const [savingCheckInId, setSavingCheckInId] = useState<string | null>(null);
  const getIstTimeInput = () =>
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(new Date());
  const [checkInTime, setCheckInTime] = useState(getIstTimeInput);
  const [checkInTimeModified, setCheckInTimeModified] = useState(false);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (!checkInTimeModified) setCheckInTime(getIstTimeInput());
    }, 60_000);
    return () => window.clearInterval(interval);
  }, [checkInTimeModified]);

  useEffect(() => {
    if (!memberPickerOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMemberPickerOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [memberPickerOpen]);

  const todayIso = getTodayIsoDate();
  const isToday = selectedDate === todayIso;

  const memberMap = useMemo(() => {
    const map = new Map<string, Member>();
    members.forEach((m) => map.set(m.id, m));
    return map;
  }, [members]);

  const checkedInMemberIds = useMemo(
    () => new Set(checkIns.map((c) => c.memberId)),
    [checkIns],
  );

  const filteredPickerMembers = useMemo(() => {
    const query = memberPickerQuery.trim().toLowerCase();
    return [...members]
      .filter(
        (member) =>
          !query ||
          member.name.toLowerCase().includes(query) ||
          member.pfId.toLowerCase().includes(query),
      )
      .sort((left, right) => left.name.localeCompare(right.name));
  }, [memberPickerQuery, members]);

  const visibleSelectableMemberIds = filteredPickerMembers
    .filter((member) => !checkedInMemberIds.has(member.id))
    .map((member) => member.id);
  const allVisibleMembersSelected =
    visibleSelectableMemberIds.length > 0 &&
    visibleSelectableMemberIds.every((id) => memberPickerIds.includes(id));

  const queuedMembers = useMemo(
    () =>
      queuedMemberIds
        .map((id) => memberMap.get(id))
        .filter((m): m is Member => Boolean(m)),
    [memberMap, queuedMemberIds],
  );

  const searchSuggestions = useMemo(() => {
    const q = scanQuery.trim().toLowerCase();
    if (!q) return [];
    const queuedSet = new Set(queuedMemberIds);
    return members
      .filter(
        (m) =>
          !checkedInMemberIds.has(m.id) &&
          !queuedSet.has(m.id) &&
          (m.name.toLowerCase().includes(q) ||
            m.pfId.toLowerCase().includes(q)),
      )
      .slice(0, 5);
  }, [checkedInMemberIds, members, queuedMemberIds, scanQuery]);

  const enrichedCheckIns = useMemo(() => {
    return checkIns
      .map((entry) => {
        const member = memberMap.get(entry.memberId);
        if (!member) return null;
        const completedAll = Object.values(entry.workouts).every(Boolean);
        const workouts = workoutDrafts[entry.id] ?? entry.workouts;
        return {
          entry,
          member,
          completedAll,
          workouts,
          hasUnsavedWorkouts: !areWorkoutTagsEqual(workouts, entry.workouts),
        };
      })
      .filter(
        (
          item,
        ): item is {
          entry: CheckInEntry;
          member: Member;
          completedAll: boolean;
          workouts: Record<WorkoutKey, boolean>;
          hasUnsavedWorkouts: boolean;
        } => Boolean(item),
      );
  }, [checkIns, memberMap, workoutDrafts]);

  const handleScanSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (searchSuggestions.length > 0) {
      onQueueMember(searchSuggestions[0].id);
      setScanQuery('');
    }
  };

  const openMemberPicker = () => {
    setMemberPickerIds(queuedMemberIds);
    setMemberPickerQuery('');
    setMemberPickerOpen(true);
  };

  const toggleVisibleMembers = () => {
    setMemberPickerIds((current) => {
      const selected = new Set(current);
      if (allVisibleMembersSelected) {
        visibleSelectableMemberIds.forEach((id) => selected.delete(id));
      } else {
        visibleSelectableMemberIds.forEach((id) => selected.add(id));
      }
      return [...selected];
    });
  };

  const applyMemberSelection = () => {
    const selectedIds = new Set(
      memberPickerIds.filter((id) => !checkedInMemberIds.has(id)),
    );
    queuedMemberIds.forEach((id) => {
      if (!selectedIds.has(id)) onUnqueueMember(id);
    });
    memberPickerIds.forEach((id) => {
      if (selectedIds.has(id) && !queuedMemberIds.includes(id)) {
        onQueueMember(id);
      }
    });
    setMemberPickerOpen(false);
  };

  const handleToggleWorkout = (entry: CheckInEntry, workout: WorkoutKey) => {
    setWorkoutDrafts((prev) => {
      const current = prev[entry.id] ?? entry.workouts;
      const updated = { ...current, [workout]: !current[workout] };
      const next = { ...prev };
      if (areWorkoutTagsEqual(updated, entry.workouts)) {
        delete next[entry.id];
      } else {
        next[entry.id] = updated;
      }
      return next;
    });
  };

  const handleSaveWorkouts = async (
    checkInId: string,
    workouts: Record<WorkoutKey, boolean>,
  ) => {
    setSavingCheckInId(checkInId);
    try {
      if (await onSaveWorkouts(checkInId, workouts)) {
        setWorkoutDrafts((prev) => {
          const next = { ...prev };
          delete next[checkInId];
          return next;
        });
      }
    } finally {
      setSavingCheckInId(null);
    }
  };

  const handleExportCsv = () => {
    const header = [
      'Session Date',
      'Athlete Name',
      'Member ID',
      'Check-In Time',
      'Agility',
      'Flexibility',
      'Core',
      'Weight Training',
      'Status',
    ];
    const rows = enrichedCheckIns.map(({ entry, member, completedAll }) => [
      entry.sessionDate,
      `"${member.name}"`,
      member.pfId,
      entry.checkInTime,
      entry.workouts.agility ? 'Done' : 'Pending',
      entry.workouts.flexibility ? 'Done' : 'Pending',
      entry.workouts.core ? 'Done' : 'Pending',
      entry.workouts.weightTraining ? 'Done' : 'Pending',
      completedAll ? 'Completed' : 'In Progress',
    ]);
    const csv = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dannysthenics-attendance-${selectedDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header Row with Date-Wise Selector */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-end">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#DFE2EF]">
            Batch Attendance &amp; Check-In
          </h1>
          <p className="mt-1 text-sm text-[#9AA7B8]">
            Select each athlete&apos;s workouts, then save the row.
          </p>
        </div>

        <div className="justify-self-center text-center">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#9AA7B8]">
            {isToday ? "Today's Check-Ins" : `Check-Ins · ${selectedDate}`}
          </p>
          <div className="mt-0.5 flex items-baseline justify-center gap-2">
            <span className="font-mono text-3xl font-bold tabular-nums text-white">
              {checkIns.length}
            </span>
            <span className="text-xs text-[#9AA7B8]">Members</span>
          </div>
        </div>

        {/* Date-Wise Picker Controls */}
        <div className="inline-flex items-center gap-1.5 rounded-md border border-white/12 bg-[#141824] p-1.5 justify-self-start lg:justify-self-end no-print">
          <button
            type="button"
            disabled={loadingAttendanceDate}
            onClick={() => onSelectDate(shiftIsoDate(selectedDate, -1))}
            className="w-8 h-8 rounded bg-[#1C2334] hover:bg-[#263047] text-[#DFE2EF] inline-flex items-center justify-center transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Previous day"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <label className="relative inline-flex items-center gap-2 px-2.5 h-8 rounded bg-[#0C101B] border border-white/[0.08] cursor-pointer">
            <Calendar className="w-3.5 h-3.5 text-[#4EDEA3] shrink-0" />
            <input
              type="date"
              value={selectedDate}
              disabled={loadingAttendanceDate}
              onChange={(e) => {
                if (e.target.value) onSelectDate(e.target.value);
              }}
              aria-label="Select attendance session date"
              className="bg-transparent font-mono text-xs font-semibold tabular-nums text-[#DFE2EF] focus:outline-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            />
          </label>

          <button
            type="button"
            disabled={loadingAttendanceDate}
            onClick={() => onSelectDate(shiftIsoDate(selectedDate, 1))}
            className="w-8 h-8 rounded bg-[#1C2334] hover:bg-[#263047] text-[#DFE2EF] inline-flex items-center justify-center transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Next day"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {!isToday && (
            <button
              type="button"
              disabled={loadingAttendanceDate}
              onClick={() => onSelectDate(todayIso)}
              className="h-8 px-2.5 rounded bg-[#10B981]/15 hover:bg-[#10B981]/25 border border-[#10B981]/40 font-mono text-[11px] font-semibold uppercase tracking-wider text-[#4EDEA3] transition-colors whitespace-nowrap"
            >
              Today
            </button>
          )}
        </div>
      </div>

      {/* Asymmetrical 5:7 Desktop Split Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 5-Column Panel: Batch Check-In */}
        <section
          aria-labelledby="batch-checkin-heading"
          className="lg:col-span-5 rounded-lg border border-white/[0.10] bg-[#141824] p-5 sm:p-6 space-y-5 no-print"
        >
          {/* Card Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="w-9 h-9 rounded-md bg-[#E62020]/15 border border-[#E62020]/35 text-[#EF233C] inline-flex items-center justify-center shrink-0">
                <UserCheck className="w-4 h-4" />
              </span>
              <div>
                <h2
                  id="batch-checkin-heading"
                  className="font-display text-lg font-bold text-[#DFE2EF] leading-tight"
                >
                  Batch Check-In
                </h2>
                <p className="text-xs text-[#9AA7B8] mt-0.5">
                  Logging for <span className="font-mono text-[#DFE2EF]">{selectedDate}</span>
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded bg-[#E62020] font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-white whitespace-nowrap shrink-0">
              Manual Check-In
            </span>
          </div>

          {/* Search & Add Athletes */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="nfc-search-input"
                className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9AA7B8]"
              >
                Search &amp; Add Athletes
              </label>
              <button
                type="button"
                disabled={confirmingBatchCheckIn}
                onClick={openMemberPicker}
                className="inline-flex items-center gap-1.5 rounded border border-white/15 bg-[#1C2334] px-2.5 py-1.5 text-[11px] font-semibold text-[#DFE2EF] hover:bg-[#263047] transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ListChecks className="h-3.5 w-3.5 text-[#4EDEA3]" />
                Select Members
              </button>
            </div>

            <div className="relative">
              <form onSubmit={handleScanSubmit}>
                <Search className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="nfc-search-input"
                  type="text"
                  disabled={confirmingBatchCheckIn}
                  value={scanQuery}
                  onChange={(e) => setScanQuery(e.target.value)}
                  placeholder="Enter athlete name or #ID..."
                  className="w-full h-11 pl-10 pr-3.5 rounded-md bg-[#0C101B] border border-white/10 text-sm text-[#DFE2EF] placeholder:text-[#64748B] focus:border-[#E62020]/70 crimson-focus transition-colors"
                />
              </form>

              {searchSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 mt-1.5 rounded-md border border-white/15 bg-[#131C2E] shadow-2xl z-20 overflow-hidden divide-y divide-white/[0.06]">
                  {searchSuggestions.map((athlete) => (
                    <button
                      key={athlete.id}
                      type="button"
                      disabled={confirmingBatchCheckIn}
                      onClick={() => {
                        onQueueMember(athlete.id);
                        setScanQuery('');
                      }}
                      className="w-full px-3.5 py-2.5 flex items-center justify-between gap-3 hover:bg-white/[0.06] text-left transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <MemberAvatar
                          initials={athlete.initials}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#DFE2EF] truncate">
                            {athlete.name}
                          </p>
                          <p className="font-mono text-[11px] text-[#9AA7B8]">
                            {athlete.pfId}
                          </p>
                        </div>
                      </div>
                      <span className="font-mono text-[11px] font-semibold text-[#4EDEA3] whitespace-nowrap">
                        + Queue
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Selected Athletes Queue Box */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9AA7B8]">
                Selected Athletes for Check-In
              </span>
              <span className="font-mono text-xs font-semibold tabular-nums text-[#F87171]">
                {queuedMembers.length} Queued
              </span>
            </div>

            <div className="min-h-[108px] rounded-md border border-white/[0.08] bg-[#0B0F19] p-3">
              {queuedMembers.length === 0 ? (
                <div className="h-[82px] flex flex-col items-center justify-center text-center px-4">
                  <p className="text-xs text-[#64748B]">
                    No athletes queued for <span className="font-mono text-[#9AA7B8]">{selectedDate}</span>.
                    Search above to queue an athlete.
                  </p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {queuedMembers.map((member) => (
                    <span
                      key={member.id}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-[#181F30] border border-white/15 text-xs font-mono text-[#DFE2EF]"
                    >
                      <span>
                        {member.name}{' '}
                      </span>
                      <button
                        type="button"
                        disabled={confirmingBatchCheckIn}
                        onClick={() => onUnqueueMember(member.id)}
                        className="text-[#9AA7B8] hover:text-[#F87171] transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label={`Remove ${member.name} from queue`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Check-In Time */}
          <div className="space-y-2">
            <label
              htmlFor="check-in-time"
              className="block font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9AA7B8]"
            >
              Check-In Time (IST)
            </label>
            <div className="rounded-md border border-white/[0.08] bg-[#181E2C] px-3.5 py-2.5 flex items-center justify-between gap-3">
              <input
                id="check-in-time"
                type="time"
                value={checkInTime}
                disabled={confirmingBatchCheckIn}
                onChange={(e) => {
                  setCheckInTime(e.target.value);
                  setCheckInTimeModified(true);
                }}
                className="bg-transparent text-sm font-mono font-semibold text-[#DFE2EF] w-full focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              />
              <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#4EDEA3] whitespace-nowrap">
                IST
              </span>
            </div>
          </div>

          {/* Primary Confirm CTA */}
          <button
            type="button"
            disabled={queuedMembers.length === 0 || confirmingBatchCheckIn}
            onClick={() => onConfirmBatchCheckIn(checkInTime)}
            aria-busy={confirmingBatchCheckIn}
            className="w-full h-12 rounded-md bg-[#E62020] hover:bg-[#EF3333] disabled:bg-[#2A2229] disabled:text-[#7F6D72] disabled:cursor-not-allowed text-white font-mono text-xs sm:text-sm font-bold uppercase tracking-[0.08em] inline-flex items-center justify-center gap-2 transition-colors crimson-focus"
          >
            {confirmingBatchCheckIn ? (
              <span role="status" className="inline-flex items-center gap-2">
                <LoaderCircle className="w-4 h-4 animate-spin" />
                Checking In {confirmingBatchMemberCount}{' '}
                {confirmingBatchMemberCount === 1 ? 'Member' : 'Members'}...
              </span>
            ) : (
              <>
                <CheckCheck className="w-4 h-4" />
                Confirm &amp; Check In ({queuedMembers.length}{' '}
                {queuedMembers.length === 1 ? 'Member' : 'Members'})
              </>
            )}
          </button>

          {/* Footer Controls */}
          <div className="pt-1 flex items-center justify-between gap-3 text-xs">
            <button
              type="button"
              disabled={queuedMembers.length === 0 || confirmingBatchCheckIn}
              onClick={onClearQueue}
              className="text-[#9AA7B8] hover:text-white disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
            >
              Clear Selection
            </button>
          </div>
        </section>

        {/* Right 7-Column Panel: Date-Wise Checked-In Members */}
        <section
          aria-labelledby="checked-in-heading"
          className="lg:col-span-7 rounded-lg border border-white/[0.10] bg-[#141824] overflow-hidden print-surface"
        >
          {/* Panel Header + Export Actions */}
          <div className="p-5 sm:p-6 border-b border-white/[0.08] flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            <div>
              <h2
                id="checked-in-heading"
                className="font-display text-xl font-bold text-[#DFE2EF]"
              >
                {isToday
                  ? "Today's Checked-In Members"
                  : `Checked-In Members · ${formatHumanDate(selectedDate)}`}
              </h2>
              {loadingAttendanceDate && (
                <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-[#9AA7B8]" role="status">
                  <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                  Loading attendance...
                </p>
              )}
              <p className="mt-0.5 text-xs text-[#9AA7B8]">
                Select each athlete&apos;s workouts, then save the row for{' '}
                <span className="font-mono text-[#DFE2EF]">{selectedDate}</span>
              </p>
            </div>

            <div
              role="group"
              aria-label="Export attendance"
              className="inline-flex items-center gap-2 self-start xl:self-auto no-print"
            >
              <button
                type="button"
                onClick={handleExportCsv}
                title="Export attendance as CSV"
                aria-label="Export attendance as CSV"
                className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-white/10 bg-[#0D111C] text-[#4EDEA3] hover:border-[#10B981]/45 hover:bg-[#10B981]/10 transition-colors"
              >
                <FileSpreadsheet className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                title="Print or save attendance as PDF"
                aria-label="Print or save attendance as PDF"
                className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-white/10 bg-[#0D111C] text-[#DFE2EF] hover:border-white/30 hover:bg-white/[0.06] transition-colors"
              >
                <Printer className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Checked-In Roster Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left min-w-[680px]">
              <thead>
                <tr className="bg-[#0B0F19] border-b border-white/[0.08] font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-[#64748B]">
                  <th className="py-3.5 pl-5 pr-3">Athlete &amp; ID</th>
                  <th className="py-3.5 px-3">Check-In Time</th>
                  <th className="py-3.5 px-3">Workout</th>
                  <th className="py-3.5 pl-3 pr-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {enrichedCheckIns.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 px-6 text-center">
                      <p className="text-sm font-medium text-[#DFE2EF]">
                        No checked-in athletes logged for {selectedDate}.
                      </p>
                      <p className="mt-1 text-xs text-[#9AA7B8]">
                        Queue athletes on the left to log attendance for this date, or switch to another date above.
                      </p>
                    </td>
                  </tr>
                ) : (
                  enrichedCheckIns.map(
                    ({ entry, member, workouts, hasUnsavedWorkouts }) => (
                      <tr
                        key={entry.id}
                        className="transition-colors duration-100 hover:bg-white/[0.025]"
                      >
                      {/* Athlete & ID */}
                      <td className="py-4 pl-5 pr-3 align-middle">
                        <div className="flex items-center gap-3">
                          <MemberAvatar
                            initials={member.initials}
                          />
                          <div className="min-w-0">
                            <p className="font-display text-sm sm:text-base font-semibold text-[#DFE2EF] whitespace-nowrap">
                              {member.name}
                            </p>
                            <p className="font-mono text-[11px] text-[#9AA7B8] whitespace-nowrap">
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Check-In Time */}
                      <td className="py-4 px-3 align-middle whitespace-nowrap">
                        <p className="font-mono text-xs sm:text-sm font-semibold tabular-nums text-[#DFE2EF]">
                          {entry.checkInTime}
                        </p>
                      </td>

                      {/* Workout Toggle Tags */}
                      <td className="py-4 px-3 align-middle">
                        <div className="flex flex-wrap gap-1.5 max-w-[280px]">
                          {WORKOUT_META.map(({ key, label }) => {
                            const active = workouts[key];
                            return (
                              <button
                                key={key}
                                type="button"
                                disabled={savingCheckInId === entry.id}
                                aria-pressed={active}
                                onClick={() => handleToggleWorkout(entry, key)}
                                className={`h-8 px-2.5 rounded text-xs font-medium inline-flex items-center gap-1.5 transition-all duration-150 whitespace-nowrap shrink-0 disabled:opacity-60 disabled:cursor-not-allowed ${
                                  active
                                    ? 'bg-[#E62020] hover:bg-[#EF3333] text-white font-semibold border border-[#EF4444]/60'
                                    : 'bg-[#1D2332] hover:bg-[#262E42] text-[#CBD5E1] border border-white/10'
                                }`}
                              >
                                <span>{label}</span>
                                {active && <Check className="w-3.5 h-3.5 stroke-[2.6]" />}
                              </button>
                            );
                          })}
                        </div>
                      </td>

                      {/* Row Actions */}
                      <td className="py-4 pl-3 pr-5 align-middle text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            disabled={
                              !hasUnsavedWorkouts ||
                              savingCheckInId !== null ||
                              removingCheckInId === entry.id
                            }
                            onClick={() =>
                              void handleSaveWorkouts(entry.id, workouts)
                            }
                            title={
                              hasUnsavedWorkouts
                                ? 'Save workout selections'
                                : 'No unsaved workout changes'
                            }
                            aria-label={`Save workout selections for ${member.name}`}
                            className="h-9 px-2.5 rounded font-mono text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap border border-[#10B981]/35 bg-[#10B981]/10 text-[#4EDEA3] hover:bg-[#10B981]/20 disabled:border-white/10 disabled:bg-[#1B2130] disabled:text-[#64748B] disabled:cursor-not-allowed"
                          >
                            <Save className="w-3.5 h-3.5" />
                            {savingCheckInId === entry.id ? 'Saving' : 'Save'}
                          </button>

                          <button
                            type="button"
                            disabled={
                              removingCheckInId !== null ||
                              savingCheckInId === entry.id
                            }
                            onClick={() => onRemoveCheckIn(entry.id)}
                            aria-busy={removingCheckInId === entry.id}
                            title={`Remove ${member.name} from ${selectedDate} attendance`}
                            aria-label={`Remove ${member.name} check-in`}
                            className="w-9 h-9 rounded bg-[#1B2130] hover:bg-[#EF4444]/15 border border-white/10 hover:border-[#EF4444]/40 text-[#9AA7B8] hover:text-[#F87171] inline-flex items-center justify-center transition-colors disabled:cursor-not-allowed disabled:opacity-50 no-print"
                          >
                            {removingCheckInId === entry.id ? (
                              <LoaderCircle className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                      </tr>
                    ),
                  )
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="px-5 sm:px-6 py-3.5 border-t border-white/[0.08] bg-[#101420] flex flex-wrap items-center justify-between gap-3 text-xs">
            <span className="text-[#9AA7B8] font-mono tabular-nums">
              Showing {enrichedCheckIns.length} athletes &middot; {selectedDate}
            </span>
          </div>
        </section>
      </div>

      {memberPickerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="member-picker-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setMemberPickerOpen(false);
            }
          }}
        >
          <div className="flex max-h-[85vh] w-full max-w-xl flex-col overflow-hidden rounded-lg border border-white/15 bg-[#131C2E] shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] bg-[#0D1422] px-5 py-4">
              <div>
                <h2
                  id="member-picker-title"
                  className="font-display text-lg font-bold text-[#DFE2EF]"
                >
                  Select Members
                </h2>
                <p className="mt-0.5 text-xs text-[#9AA7B8]">
                  Choose members to queue for {selectedDate}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMemberPickerOpen(false)}
                className="rounded p-1.5 text-[#9AA7B8] hover:bg-white/[0.06] hover:text-white"
                aria-label="Close member selection"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 p-5">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
                <input
                  type="search"
                  autoFocus
                  value={memberPickerQuery}
                  onChange={(event) => setMemberPickerQuery(event.target.value)}
                  placeholder="Search by member name or ID..."
                  aria-label="Search members"
                  className="h-10 w-full rounded-md border border-white/10 bg-[#0C101B] pl-10 pr-3.5 text-sm text-[#DFE2EF] placeholder:text-[#64748B] focus:border-[#E62020]/70 crimson-focus"
                />
              </div>

              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="font-mono text-[#9AA7B8]">
                  {memberPickerIds.filter((id) => !checkedInMemberIds.has(id)).length} selected
                </span>
                <button
                  type="button"
                  onClick={toggleVisibleMembers}
                  disabled={visibleSelectableMemberIds.length === 0}
                  className="font-semibold text-[#4EDEA3] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {allVisibleMembersSelected
                    ? 'Deselect visible'
                    : 'Select all visible'}
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto border-y border-white/[0.08]">
              {filteredPickerMembers.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-[#9AA7B8]">
                  No members match that search.
                </p>
              ) : (
                filteredPickerMembers.map((member) => {
                  const checkedIn = checkedInMemberIds.has(member.id);
                  const selected = memberPickerIds.includes(member.id);
                  return (
                    <label
                      key={member.id}
                      className={`flex items-center gap-3 border-b border-white/[0.05] px-5 py-3 last:border-b-0 ${
                        checkedIn
                          ? 'cursor-not-allowed opacity-50'
                          : 'cursor-pointer hover:bg-white/[0.04]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selected && !checkedIn}
                        disabled={checkedIn}
                        onChange={() =>
                          setMemberPickerIds((current) =>
                            current.includes(member.id)
                              ? current.filter((id) => id !== member.id)
                              : [...current, member.id],
                          )
                        }
                        className="h-4 w-4 accent-[#E62020]"
                      />
                      <MemberAvatar initials={member.initials} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-[#DFE2EF]">
                          {member.name}
                        </span>
                        <span className="font-mono text-[11px] text-[#9AA7B8]">
                          {member.pfId}
                        </span>
                      </span>
                      <span
                        className={`shrink-0 font-mono text-[10px] font-semibold uppercase tracking-wider ${
                          checkedIn ? 'text-[#9AA7B8]' : selected ? 'text-[#4EDEA3]' : 'text-[#64748B]'
                        }`}
                      >
                        {checkedIn ? 'Checked in' : selected ? 'Selected' : ''}
                      </span>
                    </label>
                  );
                })
              )}
            </div>

            <div className="flex items-center justify-between gap-3 px-5 py-4">
              <button
                type="button"
                onClick={() => setMemberPickerOpen(false)}
                className="rounded border border-white/15 px-3.5 py-2 text-sm text-[#DFE2EF] hover:bg-white/[0.05]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={applyMemberSelection}
                className="rounded bg-[#E62020] px-4 py-2 text-sm font-semibold text-white hover:bg-[#EF3333]"
              >
                Update Queue ({memberPickerIds.filter((id) => !checkedInMemberIds.has(id)).length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
