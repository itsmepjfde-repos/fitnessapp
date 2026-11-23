import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Download,
  Printer,
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
  onSelectDate: (dateIso: string) => void;
  onQueueMember: (memberId: string) => void;
  onUnqueueMember: (memberId: string) => void;
  onClearQueue: () => void;
  onConfirmBatchCheckIn: (checkInTime: string) => void;
  onToggleWorkout: (checkInId: string, workout: WorkoutKey) => void;
  onToggleAllWorkoutsDone: (checkInId: string) => void;
  onRemoveCheckIn: (checkInId: string) => void;
}

type RosterFilter = 'all' | 'pending' | 'completed';

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

export function BatchAttendanceScreen({
  selectedDate,
  members,
  checkIns,
  queuedMemberIds,
  onSelectDate,
  onQueueMember,
  onUnqueueMember,
  onClearQueue,
  onConfirmBatchCheckIn,
  onToggleWorkout,
  onToggleAllWorkoutsDone,
  onRemoveCheckIn,
}: BatchAttendanceScreenProps) {
  const [scanQuery, setScanQuery] = useState('');
  const [rosterFilter, setRosterFilter] = useState<RosterFilter>('all');
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
        return { entry, member, completedAll };
      })
      .filter(
        (
          item,
        ): item is {
          entry: CheckInEntry;
          member: Member;
          completedAll: boolean;
        } => Boolean(item),
      );
  }, [checkIns, memberMap]);

  const completedCount = enrichedCheckIns.filter((c) => c.completedAll).length;
  const pendingCount = enrichedCheckIns.length - completedCount;

  const filteredCheckIns = useMemo(() => {
    if (rosterFilter === 'completed') {
      return enrichedCheckIns.filter((c) => c.completedAll);
    }
    if (rosterFilter === 'pending') {
      return enrichedCheckIns.filter((c) => !c.completedAll);
    }
    return enrichedCheckIns;
  }, [enrichedCheckIns, rosterFilter]);

  const handleScanSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (searchSuggestions.length > 0) {
      onQueueMember(searchSuggestions[0].id);
      setScanQuery('');
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
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#DFE2EF]">
            Batch Attendance &amp; Check-In
          </h1>
          <p className="mt-1 text-sm text-[#9AA7B8]">
            Manage date-wise member check-ins and tap workout tags to record daily completion.
          </p>
        </div>

        {/* Date-Wise Picker Controls */}
        <div className="inline-flex items-center gap-1.5 rounded-md border border-white/12 bg-[#141824] p-1.5 self-start md:self-auto no-print">
          <button
            type="button"
            onClick={() => onSelectDate(shiftIsoDate(selectedDate, -1))}
            className="w-8 h-8 rounded bg-[#1C2334] hover:bg-[#263047] text-[#DFE2EF] inline-flex items-center justify-center transition-colors"
            aria-label="Previous day"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <label className="relative inline-flex items-center gap-2 px-2.5 h-8 rounded bg-[#0C101B] border border-white/[0.08] cursor-pointer">
            <Calendar className="w-3.5 h-3.5 text-[#4EDEA3] shrink-0" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                if (e.target.value) onSelectDate(e.target.value);
              }}
              aria-label="Select attendance session date"
              className="bg-transparent font-mono text-xs font-semibold tabular-nums text-[#DFE2EF] focus:outline-none cursor-pointer"
            />
          </label>

          <button
            type="button"
            onClick={() => onSelectDate(shiftIsoDate(selectedDate, 1))}
            className="w-8 h-8 rounded bg-[#1C2334] hover:bg-[#263047] text-[#DFE2EF] inline-flex items-center justify-center transition-colors"
            aria-label="Next day"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {!isToday && (
            <button
              type="button"
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

          {/* Date Check-Ins Counter Well */}
          <div className="rounded-md border border-white/[0.07] bg-[#0C101B] px-4 py-3.5 flex items-center justify-between gap-3">
            <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9AA7B8]">
              {isToday ? "Today's Check-Ins" : `Check-Ins (${selectedDate})`}
            </span>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-2xl font-bold tabular-nums text-white">
                {checkIns.length}
              </span>
              <span className="text-xs text-[#9AA7B8]">Athletes In</span>
            </div>
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
            </div>

            <div className="relative">
              <form onSubmit={handleScanSubmit}>
                <Search className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="nfc-search-input"
                  type="text"
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
                        onClick={() => onUnqueueMember(member.id)}
                        className="text-[#9AA7B8] hover:text-[#F87171] transition-colors"
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
                onChange={(e) => {
                  setCheckInTime(e.target.value);
                  setCheckInTimeModified(true);
                }}
                className="bg-transparent text-sm font-mono font-semibold text-[#DFE2EF] w-full focus:outline-none"
              />
              <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#4EDEA3] whitespace-nowrap">
                IST
              </span>
            </div>
          </div>

          {/* Primary Confirm CTA */}
          <button
            type="button"
            disabled={queuedMembers.length === 0}
            onClick={() => onConfirmBatchCheckIn(checkInTime)}
            className="w-full h-12 rounded-md bg-[#E62020] hover:bg-[#EF3333] disabled:bg-[#2A2229] disabled:text-[#7F6D72] disabled:cursor-not-allowed text-white font-mono text-xs sm:text-sm font-bold uppercase tracking-[0.08em] inline-flex items-center justify-center gap-2 transition-colors crimson-focus"
          >
            <CheckCheck className="w-4 h-4" />
            Confirm &amp; Check In ({queuedMembers.length}{' '}
            {queuedMembers.length === 1 ? 'Member' : 'Members'})
          </button>

          {/* Footer Controls */}
          <div className="pt-1 flex items-center justify-between gap-3 text-xs">
            <button
              type="button"
              disabled={queuedMembers.length === 0}
              onClick={onClearQueue}
              className="text-[#9AA7B8] hover:text-white disabled:opacity-40 transition-colors"
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
          {/* Panel Header + Filter Tabs */}
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
              <p className="mt-0.5 text-xs text-[#9AA7B8]">
                Tap workout tags to assign or mark completion for each athlete on{' '}
                <span className="font-mono text-[#DFE2EF]">{selectedDate}</span>
              </p>
            </div>

            <div
              role="tablist"
              aria-label="Filter checked-in roster"
              className="inline-flex items-center bg-[#0D111C] p-1 rounded-md border border-white/[0.08] self-start xl:self-auto no-print"
            >
              {(
                [
                  {
                    key: 'all',
                    label: `ALL (${enrichedCheckIns.length})`,
                  },
                  {
                    key: 'pending',
                    label: `PENDING WORKOUT (${pendingCount})`,
                  },
                  {
                    key: 'completed',
                    label: `COMPLETED (${completedCount})`,
                  },
                ] as const
              ).map((tab) => {
                const isActive = rosterFilter === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setRosterFilter(tab.key)}
                    className={`px-3 py-1.5 rounded font-mono text-[11px] font-semibold uppercase tracking-wider transition-colors whitespace-nowrap shrink-0 tabular-nums ${
                      isActive
                        ? 'bg-[#E62020] text-white'
                        : 'text-[#9AA7B8] hover:text-[#DFE2EF]'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Checked-In Roster Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left min-w-[680px]">
              <thead>
                <tr className="bg-[#0B0F19] border-b border-white/[0.08] font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-[#64748B]">
                  <th className="py-3.5 pl-5 pr-3">Athlete &amp; ID</th>
                  <th className="py-3.5 px-3">Check-In Time</th>
                  <th className="py-3.5 px-3">Assign Workouts (Tap to Toggle)</th>
                  <th className="py-3.5 pl-3 pr-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {filteredCheckIns.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 px-6 text-center">
                      <p className="text-sm font-medium text-[#DFE2EF]">
                        No checked-in athletes logged for {selectedDate}.
                      </p>
                      <p className="mt-1 text-xs text-[#9AA7B8]">
                        {rosterFilter !== 'all'
                          ? 'Switch back to ALL or toggle workout tags to move athletes across statuses.'
                          : 'Queue athletes on the left to log attendance for this date, or switch to another date above.'}
                      </p>
                      {rosterFilter !== 'all' && (
                        <button
                          type="button"
                          onClick={() => setRosterFilter('all')}
                          className="mt-3 px-3 py-1.5 rounded border border-white/15 bg-[#1C2334] text-xs font-mono text-[#DFE2EF]"
                        >
                          Show All Checked-In
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredCheckIns.map(({ entry, member, completedAll }) => (
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
                            const active = entry.workouts[key];
                            return (
                              <button
                                key={key}
                                type="button"
                                aria-pressed={active}
                                onClick={() => onToggleWorkout(entry.id, key)}
                                className={`h-8 px-2.5 rounded text-xs font-medium inline-flex items-center gap-1.5 transition-all duration-150 whitespace-nowrap shrink-0 ${
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
                            onClick={() => onToggleAllWorkoutsDone(entry.id)}
                            className={`h-9 px-3 rounded font-mono text-xs font-semibold transition-colors whitespace-nowrap ${
                              completedAll
                                ? 'bg-[#10B981]/15 border border-[#10B981]/40 text-[#4EDEA3] hover:bg-[#10B981]/25'
                                : 'bg-[#22293A] hover:bg-[#2C354B] border border-white/12 text-[#DFE2EF]'
                            }`}
                          >
                            {completedAll ? 'COMPLETED' : 'All Done'}
                          </button>

                          <button
                            type="button"
                            onClick={() => onRemoveCheckIn(entry.id)}
                            title={`Remove ${member.name} from ${selectedDate} attendance`}
                            aria-label={`Remove ${member.name} check-in`}
                            className="w-9 h-9 rounded bg-[#1B2130] hover:bg-[#EF4444]/15 border border-white/10 hover:border-[#EF4444]/40 text-[#9AA7B8] hover:text-[#F87171] inline-flex items-center justify-center transition-colors no-print"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="px-5 sm:px-6 py-3.5 border-t border-white/[0.08] bg-[#101420] flex flex-wrap items-center justify-between gap-3 text-xs">
            <span className="text-[#9AA7B8] font-mono tabular-nums">
              Showing {filteredCheckIns.length} of {enrichedCheckIns.length}{' '}
              athletes &middot; {selectedDate}
            </span>
            <div className="flex items-center gap-4 no-print">
              <button
                type="button"
                onClick={handleExportCsv}
                className="inline-flex items-center gap-1.5 font-medium text-[#F87171] hover:text-[#FCA5A5] transition-colors whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                Export Attendance CSV
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 font-medium text-[#CBD5E1] hover:text-white transition-colors whitespace-nowrap"
              >
                <Printer className="w-3.5 h-3.5" />
                Print Daily Sheet
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
