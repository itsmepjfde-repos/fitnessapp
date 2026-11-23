import { useMemo, useState } from 'react';
import {
  CalendarDays,
  Check,
  ExternalLink,
  MessageCircle,
  MessageSquare,
  X,
} from 'lucide-react';
import {
  Member,
  WORKOUT_META,
  WorkoutKey,
  getTodayIsoDate,
  shiftIsoDate,
} from '../types/portal';
import { MemberAvatar } from './MemberAvatar';

interface MemberHistoryDrawerProps {
  member: Member | null;
  onClose: () => void;
  onSendOutreach: (memberIds: string[], channel: 'WhatsApp' | 'SMS') => void;
  onToggleWorkoutTag: (checkInId: string, workoutKey: WorkoutKey) => void;
  onJumpToAttendanceDate: (sessionDate: string) => void;
}

type DateWindow = 'all' | '7d' | '30d';

const WORKOUT_COLORS: Record<WorkoutKey, string> = {
  agility: 'bg-[#EF233C] text-white',
  flexibility: 'bg-[#10B981] text-[#052418]',
  core: 'bg-[#C3F400] text-[#172000]',
  weightTraining: 'bg-[#60A5FA] text-[#071A33]',
};

export function MemberHistoryDrawer({
  member,
  onClose,
  onSendOutreach,
  onToggleWorkoutTag,
  onJumpToAttendanceDate,
}: MemberHistoryDrawerProps) {
  const [dateWindow, setDateWindow] = useState<DateWindow>('all');

  const weeklyTraining = useMemo(() => {
    const today = getTodayIsoDate();
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = shiftIsoDate(today, index - 6);
      const [year, month, day] = date.split('-').map(Number);
      return {
        date,
        label: new Intl.DateTimeFormat('en', { weekday: 'short' }).format(
          new Date(year, month - 1, day, 12),
        ),
        dayOfMonth: day,
      };
    });
    const countsByDate = new Map<string, Record<WorkoutKey, number>>();
    for (const { date } of days) {
      countsByDate.set(date, {
        agility: 0,
        flexibility: 0,
        core: 0,
        weightTraining: 0,
      });
    }

    let totalVisits = 0;
    for (const visit of member?.attendanceHistory ?? []) {
      const dailyCounts = countsByDate.get(visit.sessionDate);
      if (!dailyCounts) continue;
      totalVisits += 1;
      for (const { key } of WORKOUT_META) {
        if (visit.workouts[key]) dailyCounts[key] += 1;
      }
    }

    return {
      days,
      totalVisits,
      rows: WORKOUT_META.map(({ key, label }) => ({
        key,
        label,
        counts: days.map(
          ({ date }) => countsByDate.get(date)?.[key] ?? 0,
        ),
      })),
    };
  }, [member]);

  const filteredVisits = useMemo(() => {
    if (!member) return [];
    const today = getTodayIsoDate();
    const cutoff =
      dateWindow === '7d'
        ? shiftIsoDate(today, -7)
        : dateWindow === '30d'
          ? shiftIsoDate(today, -30)
          : null;
    return member.attendanceHistory.filter((visit) =>
      cutoff ? visit.sessionDate >= cutoff : true,
    );
  }, [dateWindow, member]);

  if (!member) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="member-history-title"
    >
      <div className="w-full max-w-3xl h-full bg-[#111726] border-l border-white/12 shadow-[0_0_0_1px_rgba(16,185,129,0.2),0_20px_40px_-15px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/[0.08] flex items-start justify-between gap-4 bg-[#0C111D]">
          <div className="flex items-center gap-3.5 min-w-0">
            <MemberAvatar
              initials={member.initials}
              size="lg"
            />
            <div className="min-w-0">
              <h2
                id="member-history-title"
                className="font-display text-xl font-bold text-[#DFE2EF] truncate"
              >
                {member.name}
              </h2>
              <p className="mt-0.5 font-mono text-xs text-[#9AA7B8]">
                PF-ID: {member.pfId}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded text-[#9AA7B8] hover:text-white hover:bg-white/[0.06]"
            aria-label="Close athlete history"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Summary Metrics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-md border border-white/[0.08] bg-[#161D2E] p-3.5">
              <p className="font-mono text-[10px] uppercase tracking-wider text-[#9AA7B8]">
                Cadence
              </p>
              <p className="mt-1 font-mono text-xl font-bold tabular-nums text-[#4EDEA3]">
                {member.cadencePerWeek.toFixed(1)}
                <span className="text-xs font-normal text-[#9AA7B8] ml-1">
                  d/wk
                </span>
              </p>
            </div>
            <div className="rounded-md border border-white/[0.08] bg-[#161D2E] p-3.5">
              <p className="font-mono text-[10px] uppercase tracking-wider text-[#9AA7B8]">
                Logged Dates
              </p>
              <p className="mt-1 font-mono text-xl font-bold tabular-nums text-[#DFE2EF]">
                {member.attendanceHistory.length}
              </p>
            </div>
          </div>

          {/* Date-Wise Workout Tags History (Member × Date × Workout Tags) */}
          <section className="rounded-lg border border-white/[0.08] bg-[#0B101C] p-4 space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-[#EF233C]" />
                <h3 className="font-display text-sm font-semibold text-[#DFE2EF]">
                  Date-Wise Attendance &amp; Workout Tags
                </h3>
              </div>

              <div className="inline-flex items-center gap-1 bg-[#141A29] p-0.5 rounded border border-white/[0.07]">
                {(
                  [
                    { key: 'all', label: 'All' },
                    { key: '7d', label: '7d' },
                    { key: '30d', label: '30d' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setDateWindow(opt.key)}
                    className={`px-2 py-1 rounded font-mono text-[10px] font-semibold uppercase transition-colors ${
                      dateWindow === opt.key
                        ? 'bg-[#E62020] text-white'
                        : 'text-[#9AA7B8] hover:text-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {filteredVisits.length === 0 ? (
              <p className="text-xs text-[#64748B] py-4 text-center border border-dashed border-white/[0.08] rounded">
                No attendance dates recorded in this window.
              </p>
            ) : (
              <div className="space-y-2.5">
                {filteredVisits.map((visit) => {
                  const doneCount = Object.values(visit.workouts).filter(Boolean).length;
                  return (
                    <div
                      key={visit.checkInId}
                      className="rounded-md border border-white/[0.08] bg-[#141B2B] p-3.5 space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="font-mono text-xs font-bold tabular-nums text-[#DFE2EF] bg-[#0B101C] border border-white/10 px-2 py-0.5 rounded">
                            {visit.sessionDate}
                          </span>
                          <span className="font-mono text-[11px] text-[#9AA7B8] tabular-nums">
                            {visit.checkInTime}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            onJumpToAttendanceDate(visit.sessionDate);
                            onClose();
                          }}
                          className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-[#4EDEA3] hover:text-[#6FFBEE] whitespace-nowrap shrink-0"
                        >
                          Open Day
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        {WORKOUT_META.map(({ key, label }) => {
                          const active = visit.workouts[key];
                          return (
                            <button
                              key={key}
                              type="button"
                              aria-pressed={active}
                              onClick={() => onToggleWorkoutTag(visit.checkInId, key)}
                              className={`h-7 px-2 rounded text-[11px] font-medium inline-flex items-center gap-1 transition-colors whitespace-nowrap ${
                                active
                                  ? 'bg-[#E62020] hover:bg-[#EF3333] text-white font-semibold border border-[#EF4444]/60'
                                  : 'bg-[#1D2436] hover:bg-[#263047] text-[#9AA7B8] border border-white/10'
                              }`}
                            >
                              <span>{label}</span>
                              {active && <Check className="w-3 h-3 stroke-[2.8]" />}
                            </button>
                          );
                        })}
                        <span className="ml-auto font-mono text-[10px] tabular-nums text-[#9AA7B8]">
                          {doneCount}/4 done
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Weekly Workout Matrix */}
          <section
            aria-labelledby="weekly-workout-heading"
            className="rounded-lg border border-white/[0.08] bg-[#0B101C] p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h3
                id="weekly-workout-heading"
                className="font-display text-sm font-semibold text-[#DFE2EF]"
              >
                Workout Types This Week
              </h3>
              <span className="font-mono text-[11px] text-[#9AA7B8]">
                {weeklyTraining.totalVisits} visits · Last 7 days
              </span>
            </div>

            {weeklyTraining.totalVisits === 0 ? (
              <p className="text-xs text-[#64748B] py-4 text-center border border-dashed border-white/[0.08] rounded">
                No visits recorded in the last 7 days.
              </p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[35rem] table-fixed text-xs">
                    <thead>
                      <tr>
                        <th
                          scope="col"
                          className="w-32 pb-2 text-left font-mono text-[10px] uppercase tracking-wider text-[#9AA7B8]"
                        >
                          Training
                        </th>
                        {weeklyTraining.days.map((day) => (
                          <th
                            key={day.date}
                            scope="col"
                            className="pb-2 text-center font-mono font-medium text-[#9AA7B8]"
                          >
                            <span className="block">{day.label}</span>
                            <span className="block text-[10px] text-[#64748B]">
                              {day.date.slice(5).replace('-', '/')}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {weeklyTraining.rows.map((row) => (
                        <tr key={row.key}>
                          <th
                            scope="row"
                            className="py-1.5 pr-2 text-left font-medium text-[#DFE2EF]"
                          >
                            {row.label}
                          </th>
                          {row.counts.map((count, index) => (
                            <td key={weeklyTraining.days[index].date} className="p-1">
                              <span
                                aria-label={`${count} ${row.label} visits on ${weeklyTraining.days[index].date}`}
                                className={`flex h-8 items-center justify-center rounded font-mono text-[11px] font-bold tabular-nums ${
                                  count > 0
                                    ? WORKOUT_COLORS[row.key]
                                    : 'bg-[#161D2E] text-[#64748B]'
                                }`}
                              >
                                {count > 0 ? count : '—'}
                              </span>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-[10px] text-[#64748B]">
                  Counts show visits tagged with each workout type; a visit can
                  include more than one type.
                </p>
              </>
            )}
          </section>

          {/* Quick Outreach */}
          <div className="rounded-lg border border-white/[0.08] bg-[#161D2E] p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[11px] uppercase tracking-wider text-[#9AA7B8]">
                Quick Outreach
              </span>
              <span className="font-mono text-xs text-[#DFE2EF]">
                {member.phone}
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => onSendOutreach([member.id], 'WhatsApp')}
                className="flex-1 h-9 rounded bg-[#10B981]/15 hover:bg-[#10B981]/25 border border-[#10B981]/40 text-[#4EDEA3] font-mono text-xs font-semibold uppercase tracking-wider inline-flex items-center justify-center gap-2 transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                WhatsApp
              </button>
              <button
                type="button"
                onClick={() => onSendOutreach([member.id], 'SMS')}
                className="flex-1 h-9 rounded bg-white/[0.05] hover:bg-white/[0.1] border border-white/15 text-[#DFE2EF] font-mono text-xs font-semibold uppercase tracking-wider inline-flex items-center justify-center gap-2 transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Send SMS
              </button>
            </div>
          </div>

          {/* Outreach Log */}
          <div>
            <h3 className="font-mono text-[11px] uppercase tracking-wider text-[#9AA7B8] mb-2.5">
              Outreach Dispatch Log ({member.outreachHistory.length})
            </h3>
            {member.outreachHistory.length === 0 ? (
              <p className="text-xs text-[#64748B] rounded-md border border-white/[0.06] bg-[#0D1320] p-4">
                No retention outreach messages logged for {member.name} yet.
              </p>
            ) : (
              <ul className="space-y-2.5">
                {member.outreachHistory.map((log) => (
                  <li
                    key={log.id}
                    className="rounded-md border border-white/[0.07] bg-[#0D1320] p-3.5"
                  >
                    <div className="flex items-center justify-between gap-2 font-mono text-[11px]">
                      <span className="text-[#4EDEA3] font-semibold">
                        {log.channel}
                      </span>
                      <span className="text-[#64748B]">{log.timestamp}</span>
                    </div>
                    <p className="mt-1.5 text-xs text-[#CBD5E1] leading-relaxed">
                      &ldquo;{log.message}&rdquo;
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
