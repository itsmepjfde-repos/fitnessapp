import { FormEvent, useMemo, useState } from 'react';
import {
  CalendarDays,
  Check,
  ExternalLink,
  MessageCircle,
  MessageSquare,
  Plus,
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
  onLogProgress: (memberId: string, strengthIndex: number, sessions: number) => void;
  onToggleWorkoutTag: (checkInId: string, workoutKey: WorkoutKey) => void;
  onJumpToAttendanceDate: (sessionDate: string) => void;
}

type DateWindow = 'all' | '7d' | '30d';

export function MemberHistoryDrawer({
  member,
  onClose,
  onSendOutreach,
  onLogProgress,
  onToggleWorkoutTag,
  onJumpToAttendanceDate,
}: MemberHistoryDrawerProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [newStrength, setNewStrength] = useState('88');
  const [newSessions, setNewSessions] = useState('4');
  const [dateWindow, setDateWindow] = useState<DateWindow>('all');

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

  const series = member.progressSeries;
  const chartW = 420;
  const chartH = 160;
  const padX = 28;
  const padY = 20;
  const minVal = 55;
  const maxVal = 100;
  const targetCeiling = 90;

  const points = series.map((pt, idx) => {
    const x =
      padX + (idx / Math.max(1, series.length - 1)) * (chartW - padX * 2);
    const clamped = Math.max(minVal, Math.min(maxVal, pt.strengthIndex));
    const y =
      chartH -
      padY -
      ((clamped - minVal) / (maxVal - minVal)) * (chartH - padY * 2);
    return { ...pt, x, y };
  });

  const linePath = points
    .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');
  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${(chartH - padY).toFixed(1)} L ${points[0].x.toFixed(1)} ${(chartH - padY).toFixed(1)} Z`
      : '';

  const targetY =
    chartH -
    padY -
    ((targetCeiling - minVal) / (maxVal - minVal)) * (chartH - padY * 2);

  const activePoint =
    hoveredIdx !== null && points[hoveredIdx]
      ? points[hoveredIdx]
      : points[points.length - 1];

  const handleLogSubmit = (e: FormEvent) => {
    e.preventDefault();
    const sVal = Math.max(55, Math.min(100, Number(newStrength) || 85));
    const sessVal = Math.max(0, Math.min(7, Number(newSessions) || 3));
    onLogProgress(member.id, sVal, sessVal);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="member-history-title"
    >
      <div className="w-full max-w-xl h-full bg-[#111726] border-l border-white/12 shadow-[0_0_0_1px_rgba(16,185,129,0.2),0_20px_40px_-15px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden">
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

          {/* Kinetic Obsidian Longitudinal Progress Chart */}
          <div className="rounded-lg border border-white/[0.08] bg-[#0B101C] p-4">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div>
                <h3 className="font-display text-sm font-semibold text-[#DFE2EF]">
                  Longitudinal Strength &amp; Conditioning Index
                </h3>
                <p className="text-xs text-[#9AA7B8]">
                  6-week trend vs. 90-pt target ceiling
                </p>
              </div>
              {activePoint && (
                <div className="text-right font-mono tabular-nums">
                  <span className="text-base font-bold text-[#4EDEA3]">
                    {activePoint.strengthIndex}
                  </span>
                  <span className="block text-[10px] text-[#9AA7B8]">
                    {activePoint.weekLabel} &middot; {activePoint.sessions} sess
                  </span>
                </div>
              )}
            </div>

            <svg
              viewBox={`0 0 ${chartW} ${chartH}`}
              className="w-full h-40 overflow-visible"
              role="img"
              aria-label={`Strength index trend for ${member.name}`}
            >
              <defs>
                <linearGradient id="kineticArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity="0.32" />
                  <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
                </linearGradient>
              </defs>

              {[60, 75, 90].map((val) => {
                const y =
                  chartH -
                  padY -
                  ((val - minVal) / (maxVal - minVal)) * (chartH - padY * 2);
                return (
                  <g key={val}>
                    <line
                      x1={padX}
                      x2={chartW - padX}
                      y1={y}
                      y2={y}
                      stroke="rgba(255,255,255,0.06)"
                      strokeWidth="1"
                    />
                    <text
                      x={4}
                      y={y + 3}
                      fill="#64748B"
                      fontSize="9"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      {val}
                    </text>
                  </g>
                );
              })}

              <line
                x1={padX}
                x2={chartW - padX}
                y1={targetY}
                y2={targetY}
                stroke="#C3F400"
                strokeWidth="1.25"
                strokeDasharray="4 4"
                opacity="0.75"
              />
              <text
                x={chartW - padX}
                y={targetY - 5}
                textAnchor="end"
                fill="#C3F400"
                fontSize="9"
                fontFamily="JetBrains Mono, monospace"
              >
                TARGET 90
              </text>

              {areaPath && <path d={areaPath} fill="url(#kineticArea)" />}
              {linePath && (
                <path
                  d={linePath}
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="2.2"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              )}

              {points.map((pt, idx) => (
                <g
                  key={pt.weekLabel}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  className="cursor-pointer"
                >
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={hoveredIdx === idx ? 5.5 : 3.5}
                    fill={hoveredIdx === idx ? '#C3F400' : '#4EDEA3'}
                    stroke="#090D16"
                    strokeWidth="1.5"
                  />
                  <text
                    x={pt.x}
                    y={chartH - 3}
                    textAnchor="middle"
                    fill="#9AA7B8"
                    fontSize="9.5"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {pt.weekLabel}
                  </text>
                </g>
              ))}
            </svg>

            <form
              onSubmit={handleLogSubmit}
              className="mt-4 pt-3.5 border-t border-white/[0.07] flex flex-wrap items-end gap-2.5"
            >
              <div className="flex-1 min-w-[100px]">
                <label className="block font-mono text-[10px] uppercase tracking-wider text-[#9AA7B8] mb-1">
                  Strength Index (55–100)
                </label>
                <input
                  type="number"
                  min={55}
                  max={100}
                  value={newStrength}
                  onChange={(e) => setNewStrength(e.target.value)}
                  className="w-full h-9 px-2.5 rounded bg-[#161D2E] border border-white/12 font-mono text-xs tabular-nums text-[#DFE2EF] kinetic-focus"
                />
              </div>
              <div className="w-24">
                <label className="block font-mono text-[10px] uppercase tracking-wider text-[#9AA7B8] mb-1">
                  Sessions
                </label>
                <input
                  type="number"
                  min={0}
                  max={7}
                  value={newSessions}
                  onChange={(e) => setNewSessions(e.target.value)}
                  className="w-full h-9 px-2.5 rounded bg-[#161D2E] border border-white/12 font-mono text-xs tabular-nums text-[#DFE2EF] kinetic-focus"
                />
              </div>
              <button
                type="submit"
                className="h-9 px-3.5 rounded bg-[#10B981] hover:bg-[#22C55E] text-[#052418] font-mono text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5 whitespace-nowrap transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Log Week
              </button>
            </form>
          </div>

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
