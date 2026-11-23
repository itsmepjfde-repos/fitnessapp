import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BellOff,
  Check,
  CheckSquare,
  Clock,
  Edit3,
  MessageCircle,
  MessageSquare,
  Search,
  Send,
  TrendingUp,
  UserPlus,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { Member, OutreachDispatchBanner } from '../types/portal';
import { MemberAvatar } from './MemberAvatar';

interface MemberDirectoryScreenProps {
  members: Member[];
  outreachTemplate: string;
  latestDispatch: OutreachDispatchBanner | null;
  onUpdateTemplate: (value: string) => void;
  onDismissDispatch: () => void;
  onSendOutreach: (memberIds: string[], channel: 'WhatsApp' | 'SMS') => void;
  onOpenAddMember: () => void;
  onSelectHistoryMember: (memberId: string) => void;
}

type StatusFilter = 'all' | 'active' | 'at_risk' | 'inactive';

export function MemberDirectoryScreen({
  members,
  outreachTemplate,
  latestDispatch,
  onUpdateTemplate,
  onDismissDispatch,
  onSendOutreach,
  onOpenAddMember,
  onSelectHistoryMember,
}: MemberDirectoryScreenProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingTemplate, setEditingTemplate] = useState(false);

  const stats = useMemo(() => {
    const total = members.length;
    const activeList = members.filter((m) => m.status === 'active');
    const atRiskList = members.filter((m) => m.status === 'at_risk');
    const inactiveList = members.filter((m) => m.status === 'inactive');
    const activePct = total > 0 ? ((activeList.length / total) * 100).toFixed(1) : '0.0';
    const avgLull =
      atRiskList.length > 0
        ? (
            atRiskList.reduce((acc, m) => acc + m.daysSinceLastVisit, 0) /
            atRiskList.length
          ).toFixed(1)
        : '0.0';
    const capacityPct = Math.min(100, Math.round((total / 20) * 100));
    return {
      total,
      activeCount: activeList.length,
      atRiskCount: atRiskList.length,
      inactiveCount: inactiveList.length,
      activePct,
      avgLull,
      capacityPct,
      atRiskIds: atRiskList.map((m) => m.id),
    };
  }, [members]);

  const filteredMembers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return members.filter((m) => {
      if (statusFilter !== 'all' && m.status !== statusFilter) return false;
      if (!q) return true;
      return (
        m.name.toLowerCase().includes(q) ||
        m.phone.toLowerCase().includes(q) ||
        m.pfId.toLowerCase().includes(q)
      );
    });
  }, [members, searchQuery, statusFilter]);

  const visibleIds = filteredMembers.map((m) => m.id);
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));

  const toggleRowSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const handleSelectAtRiskBatch = () => {
    setStatusFilter('at_risk');
    setSelectedIds(stats.atRiskIds);
  };

  const batchOutreachTargets =
    selectedIds.length > 0 ? selectedIds : stats.atRiskIds;

  const renderHighlightedTemplate = (raw: string) => {
    const parts = raw.split(/(\[First Name\]|DANNY'STHENICS)/g);
    return parts.map((segment, index) => {
      if (segment === '[First Name]') {
        return (
          <span key={index} className="font-mono font-semibold text-[#C3F400]">
            [First Name]
          </span>
        );
      }
      if (segment === "DANNY'STHENICS") {
        return (
          <span key={index} className="font-display font-bold tracking-tight">
            <span className="text-[#EF233C]">DANNY&apos;</span>
            <span className="text-white">ST</span>
            <span className="text-[#EF233C]">HENICS</span>
          </span>
        );
      }
      return <span key={index}>{segment}</span>;
    });
  };

  return (
    <div className="space-y-6">
      {/* Live Automated Dispatch Confirmation Banner */}
      {latestDispatch && !latestDispatch.dismissed && (
        <div
          role="status"
          className="rounded-lg border border-[#EF233C]/30 bg-[#18141D] px-4 py-3 flex flex-wrap items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <span className="w-8 h-8 rounded bg-[#EF233C]/15 border border-[#EF233C]/35 text-[#F87171] inline-flex items-center justify-center shrink-0">
              <MessageSquare className="w-4 h-4" />
            </span>
            <p className="text-xs sm:text-sm text-[#DFE2EF] leading-snug">
              <span className="font-semibold text-[#F87171] mr-1.5">
                Automated Dispatch Logged:
              </span>
              Follow-up sent to{' '}
              <strong className="font-semibold text-white">
                {latestDispatch.recipientSummary}
              </strong>{' '}
              via {latestDispatch.channel} at{' '}
              <span className="font-mono tabular-nums">
                {latestDispatch.timestamp}
              </span>
              :{' '}
              <span className="italic text-[#BBCABF]">
                &ldquo;{latestDispatch.messagePreview}&rdquo;
              </span>
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#4EDEA3] bg-[#10B981]/12 border border-[#10B981]/35 px-2.5 py-1 rounded whitespace-nowrap">
              Delivered
            </span>
            <button
              type="button"
              onClick={onDismissDispatch}
              className="p-1 rounded text-[#9AA7B8] hover:text-white hover:bg-white/[0.06] transition-colors"
              aria-label="Dismiss dispatch notice"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 4-Column Directory KPI Stat Grid */}
      <section
        aria-label="Member directory metrics"
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
      >
        {/* Directory Registry */}
        <div className="rounded-lg border border-white/[0.08] bg-[#141824] p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9AA7B8]">
              Directory Registry
            </span>
            <Users className="w-4 h-4 text-[#64748B]" />
          </div>
          <div className="mt-4 flex items-baseline gap-2.5">
            <span className="font-mono text-4xl font-bold tabular-nums text-[#DFE2EF]">
              {stats.total}
            </span>
            <span className="font-mono text-xs font-medium text-[#4EDEA3]">
              +4 this mo
            </span>
          </div>
          <p className="mt-3 text-xs text-[#9AA7B8]">
            Roster capacity: <span className="font-mono tabular-nums text-[#DFE2EF]">{stats.capacityPct}%</span> utilized
          </p>
        </div>

        {/* Currently Active */}
        <div className="rounded-lg border border-white/[0.08] bg-[#141824] p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-[#4EDEA3]">
              Currently Active
            </span>
            <span className="font-mono text-xs font-semibold tabular-nums text-[#4EDEA3] bg-[#10B981]/12 border border-[#10B981]/30 px-2 py-0.5 rounded">
              {stats.activePct}%
            </span>
          </div>
          <div className="mt-4 flex items-baseline gap-2.5">
            <span className="font-mono text-4xl font-bold tabular-nums text-[#4EDEA3]">
              {stats.activeCount}
            </span>
            <span className="text-sm text-[#9AA7B8]">athletes</span>
          </div>
          <p className="mt-3 text-xs text-[#9AA7B8] inline-flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-[#4EDEA3]" />
            Rolling 7-day adherence: High
          </p>
        </div>

        {/* At-Risk (1-2 Wks) */}
        <div className="rounded-lg border border-white/[0.08] bg-[#141824] p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-[#C3F400]">
              At-Risk (1–2 Wks)
            </span>
            <span className="font-mono text-[11px] font-semibold text-[#C3F400] bg-[#C3F400]/12 border border-[#C3F400]/30 px-2 py-0.5 rounded whitespace-nowrap">
              High Priority
            </span>
          </div>
          <div className="mt-4 flex items-baseline gap-2.5">
            <span className="font-mono text-4xl font-bold tabular-nums text-[#C3F400]">
              {stats.atRiskCount}
            </span>
            <span className="text-sm text-[#C3F400]/90">needs outreach</span>
          </div>
          <p className="mt-3 text-xs text-[#9AA7B8] inline-flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#C3F400]" />
            Average lull:{' '}
            <span className="font-mono tabular-nums text-[#DFE2EF]">
              {stats.avgLull} days
            </span>
          </p>
        </div>

        {/* Inactive (>30 Days) */}
        <div className="rounded-lg border border-white/[0.08] bg-[#141824] p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-[#FCA5A5]">
              Inactive (&gt;30 Days)
            </span>
            <AlertTriangle className="w-4 h-4 text-[#F87171]" />
          </div>
          <div className="mt-4 flex items-baseline gap-2.5">
            <span className="font-mono text-4xl font-bold tabular-nums text-[#FCA5A5]">
              {stats.inactiveCount}
            </span>
            <span className="text-sm text-[#9AA7B8]">retention alert</span>
          </div>
          <p className="mt-3 text-xs text-[#9AA7B8] inline-flex items-center gap-1.5">
            <BellOff className="w-3.5 h-3.5 text-[#F87171]" />
            Dormancy protocol initiated
          </p>
        </div>
      </section>

      {/* Automated Retention Outreach Spotlight */}
      <section
        aria-labelledby="retention-engine-heading"
        className="rounded-lg border border-white/[0.10] bg-gradient-to-r from-[#161A26] via-[#151D26] to-[#122026] p-5 sm:p-6"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Left Narrative */}
          <div className="lg:col-span-6 flex items-start gap-4">
            <div className="w-11 h-11 rounded-md bg-[#E62020]/15 border border-[#E62020]/40 text-[#EF233C] flex items-center justify-center shrink-0 mt-0.5">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#F87171] bg-[#E62020]/15 border border-[#E62020]/30 px-2 py-0.5 rounded">
                  Automated Retention Engine
                </span>
                <span className="text-[#9AA7B8]">Batch trigger verified</span>
              </div>
              <h2
                id="retention-engine-heading"
                className="mt-2.5 font-display text-xl sm:text-2xl font-bold text-[#DFE2EF]"
              >
                {stats.atRiskCount} members detected inactive for 1–2 weeks
              </h2>
              <p className="mt-2 text-sm text-[#9AA7B8] leading-relaxed max-w-xl">
                Re-engagement outreach sequence is primed. Broadcast personal
                encouragement from Coach Danny along with direct class booking
                slots to reclaim roster attendance.
              </p>
            </div>
          </div>

          {/* Right Template Preview & 1-Click Dispatch */}
          <div className="lg:col-span-6 rounded-md border border-white/[0.08] bg-[#0D121D] p-4 sm:p-5 space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-[#4EDEA3]">
                <MessageSquare className="w-3.5 h-3.5" />
                WhatsApp / SMS Template Preview
              </span>
              <div className="flex items-center gap-3">
                <span className="font-mono text-[11px] text-[#9AA7B8]">
                  Tokenized: [First Name]
                </span>
                <button
                  type="button"
                  onClick={() => setEditingTemplate((prev) => !prev)}
                  className="inline-flex items-center gap-1 font-mono text-[11px] text-[#DFE2EF] hover:text-[#4EDEA3] transition-colors"
                >
                  <Edit3 className="w-3 h-3" />
                  {editingTemplate ? 'Done' : 'Edit'}
                </button>
              </div>
            </div>

            {editingTemplate ? (
              <textarea
                rows={3}
                value={outreachTemplate}
                onChange={(e) => onUpdateTemplate(e.target.value)}
                className="w-full rounded bg-[#141B2B] border border-[#10B981]/40 p-3 text-xs sm:text-sm text-[#DFE2EF] leading-relaxed kinetic-focus"
              />
            ) : (
              <div className="rounded bg-[#141B2B] border border-white/[0.07] p-3.5 text-xs sm:text-sm text-[#CBD5E1] leading-relaxed">
                &ldquo;{renderHighlightedTemplate(outreachTemplate)}&rdquo;
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <span className="text-xs text-[#9AA7B8]">
                Recipients:{' '}
                <strong className="font-mono tabular-nums text-[#DFE2EF]">
                  {batchOutreachTargets.length}{' '}
                  {selectedIds.length > 0 ? 'Selected' : 'At-Risk'} Members
                </strong>
              </span>
              <button
                type="button"
                disabled={batchOutreachTargets.length === 0}
                onClick={() => onSendOutreach(batchOutreachTargets, 'WhatsApp')}
                className="px-4 py-2.5 rounded bg-[#E62020] hover:bg-[#EF3333] disabled:opacity-45 text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 crimson-focus"
              >
                <Send className="w-3.5 h-3.5" />
                Send 1-Click WhatsApp/SMS Outreach ({batchOutreachTargets.length})
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Filter Tabs & Search Actions Bar */}
      <section className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        {/* Segmented Status Tabs */}
        <div
          role="tablist"
          aria-label="Filter members by activity status"
          className="flex flex-wrap items-center gap-2"
        >
          {(
            [
              {
                key: 'all',
                label: 'All Members',
                count: stats.total,
                accent: 'text-[#DFE2EF]',
              },
              {
                key: 'active',
                label: 'Active',
                count: stats.activeCount,
                accent: 'text-[#4EDEA3]',
              },
              {
                key: 'at_risk',
                label: 'Inactive: 1–2 Weeks',
                count: stats.atRiskCount,
                accent: 'text-[#C3F400]',
              },
              {
                key: 'inactive',
                label: 'Inactive: 1 Month+',
                count: stats.inactiveCount,
                accent: 'text-[#FCA5A5]',
              },
            ] as const
          ).map((tab) => {
            const isActive = statusFilter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setStatusFilter(tab.key)}
                className={`h-10 px-3.5 rounded-md border text-xs sm:text-sm font-medium inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-[#1C2334] border-white/20 text-white font-semibold'
                    : 'bg-[#121622] border-white/[0.06] text-[#9AA7B8] hover:text-[#DFE2EF] hover:border-white/15'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`font-mono text-xs tabular-nums px-1.5 py-0.5 rounded bg-[#0A0E17] ${tab.accent}`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search + Bulk Select + Add Member */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 sm:flex-none sm:w-64">
            <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, phone, or ID..."
              aria-label="Search members"
              className="w-full h-10 pl-9 pr-3 rounded-md bg-[#121622] border border-white/10 text-sm text-[#DFE2EF] placeholder:text-[#64748B] kinetic-focus"
            />
          </div>

          <button
            type="button"
            onClick={handleSelectAtRiskBatch}
            className="h-10 px-3.5 rounded-md border border-white/15 bg-[#181E2C] hover:border-[#C3F400]/50 text-xs sm:text-sm font-medium text-[#DFE2EF] inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
          >
            <CheckSquare className="w-4 h-4 text-[#C3F400]" />
            Select Inactive ({stats.atRiskCount})
          </button>

          <button
            type="button"
            onClick={onOpenAddMember}
            className="h-10 px-4 rounded-md bg-[#E62020] hover:bg-[#EF3333] text-xs sm:text-sm font-semibold text-white inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 crimson-focus"
          >
            <UserPlus className="w-4 h-4" />+ New Member
          </button>
        </div>
      </section>

      {/* Clean Member Roster Data Table */}
      <section className="rounded-lg border border-white/[0.08] bg-[#121622] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left min-w-[920px]">
            <thead>
              <tr className="bg-[#0B0F19] border-b border-white/[0.08] font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-[#64748B]">
                <th className="py-3.5 pl-5 pr-3 w-12">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={allVisibleSelected}
                    aria-label="Select all visible members"
                    onClick={toggleSelectAllVisible}
                    className={`w-4 h-4 rounded-[3px] border flex items-center justify-center transition-colors ${
                      allVisibleSelected
                        ? 'bg-[#E62020] border-[#E62020] text-white'
                        : 'bg-[#181E2C] border-white/25 text-transparent'
                    }`}
                  >
                    <Check className="w-3 h-3 stroke-[3]" />
                  </button>
                </th>
                <th className="py-3.5 px-3">Athlete / Member</th>
                <th className="py-3.5 px-3">Contact Number</th>
                <th className="py-3.5 px-3">Status &amp; Lull</th>
                <th className="py-3.5 px-3">Last Attended Session</th>
                <th className="py-3.5 px-3 text-right">Cadence (Freq)</th>
                <th className="py-3.5 px-3 text-center">1-Click Fast Outreach</th>
                <th className="py-3.5 pl-3 pr-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 px-6 text-center">
                    <p className="text-sm font-medium text-[#DFE2EF]">
                      No members match your current filter.
                    </p>
                    <p className="mt-1 text-xs text-[#9AA7B8]">
                      Try clearing the search input or switching back to All Members.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setStatusFilter('all');
                      }}
                      className="mt-4 px-3.5 py-2 rounded border border-white/15 bg-[#181E2C] hover:bg-[#222A3D] text-xs font-mono font-semibold uppercase tracking-wider text-[#DFE2EF] transition-colors"
                    >
                      Reset Filters
                    </button>
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member) => {
                  const isSelected = selectedIds.includes(member.id);
                  const statusTone =
                    member.status === 'active'
                      ? 'bg-[#10B981]/14 border-[#10B981]/35 text-[#4EDEA3]'
                      : member.status === 'at_risk'
                        ? 'bg-[#C3F400]/12 border-[#C3F400]/35 text-[#C3F400]'
                        : 'bg-[#EF4444]/14 border-[#EF4444]/35 text-[#FCA5A5]';

                  const statusLabel =
                    member.status === 'active'
                      ? 'Active'
                      : `Inactive (${member.daysSinceLastVisit} days)`;

                  const cadenceColor =
                    member.cadencePerWeek >= 3
                      ? 'text-[#4EDEA3]'
                      : member.cadencePerWeek >= 1
                        ? 'text-[#DFE2EF]'
                        : 'text-[#FCA5A5]';

                  return (
                    <tr
                      key={member.id}
                      className={`transition-colors duration-100 hover:bg-white/[0.03] ${
                        isSelected ? 'bg-white/[0.025]' : ''
                      }`}
                    >
                      <td className="py-3.5 pl-5 pr-3">
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={isSelected}
                          aria-label={`Select ${member.name}`}
                          onClick={() => toggleRowSelect(member.id)}
                          className={`w-4 h-4 rounded-[3px] border flex items-center justify-center transition-colors ${
                            isSelected
                              ? 'bg-[#E62020] border-[#E62020] text-white'
                              : 'bg-[#181E2C] border-white/25 text-transparent hover:border-white/45'
                          }`}
                        >
                          <Check className="w-3 h-3 stroke-[3]" />
                        </button>
                      </td>

                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-3">
                          <MemberAvatar
                            initials={member.initials}
                          />
                          <div className="min-w-0">
                            <p className="font-display text-sm sm:text-base font-semibold text-[#DFE2EF] truncate">
                              {member.name}
                            </p>
                            <p className="font-mono text-[11px] text-[#9AA7B8] truncate">
                              PF-ID: {member.pfId}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-3 font-mono text-xs sm:text-sm tabular-nums text-[#CBD5E1] whitespace-nowrap">
                        {member.phone}
                      </td>

                      <td className="py-3.5 px-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded border font-mono text-[11px] font-medium whitespace-nowrap ${statusTone}`}
                        >
                          {statusLabel}
                        </span>
                      </td>

                      <td className="py-3.5 px-3">
                        <p className="text-sm font-medium text-[#DFE2EF] whitespace-nowrap">
                          {member.lastAttendedLabel}
                        </p>
                        <p className="text-xs text-[#9AA7B8] truncate max-w-[200px]">
                          {member.lastWorkoutClass}
                        </p>
                      </td>

                      <td className="py-3.5 px-3 text-right whitespace-nowrap">
                        <span
                          className={`font-mono text-sm font-semibold tabular-nums ${cadenceColor}`}
                        >
                          {member.cadencePerWeek.toFixed(1)}
                        </span>
                        <span className="font-mono text-xs text-[#9AA7B8] ml-1">
                          d/wk
                        </span>
                      </td>

                      <td className="py-3.5 px-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => onSendOutreach([member.id], 'WhatsApp')}
                            title={`Send WhatsApp to ${member.name}`}
                            aria-label={`Send WhatsApp outreach to ${member.name}`}
                            className="w-9 h-9 rounded bg-[#1C2334] hover:bg-[#10B981]/20 border border-white/10 hover:border-[#10B981]/45 text-[#4EDEA3] inline-flex items-center justify-center transition-colors"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onSendOutreach([member.id], 'SMS')}
                            title={`Send SMS to ${member.name}`}
                            aria-label={`Send SMS outreach to ${member.name}`}
                            className="w-9 h-9 rounded bg-[#1C2334] hover:bg-white/10 border border-white/10 hover:border-white/30 text-[#DFE2EF] inline-flex items-center justify-center transition-colors"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
                        </div>
                      </td>

                      <td className="py-3.5 pl-3 pr-5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onSelectHistoryMember(member.id)}
                          className="font-mono text-xs font-semibold uppercase tracking-wider text-[#4EDEA3] hover:text-[#6FFBEE] transition-colors whitespace-nowrap"
                        >
                          View History
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
