import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ChartNoAxesCombined,
  Check,
  ChevronDown,
  Clock,
  Edit3,
  MessageSquare,
  LoaderCircle,
  Search,
  Send,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { Member, OutreachDispatchBanner } from '../types/portal';
import { MemberAvatar } from './MemberAvatar';

interface MemberDirectoryScreenProps {
  members: Member[];
  outreachTemplate: string;
  latestDispatch: OutreachDispatchBanner | null;
  outreachTemplateSaveStatus: 'idle' | 'saving' | 'saved' | 'error';
  sendingOutreach: {
    memberIds: string[];
    channel: 'WhatsApp' | 'SMS';
  } | null;
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
  outreachTemplateSaveStatus,
  sendingOutreach,
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
  const [outreachTemplateOpen, setOutreachTemplateOpen] = useState(false);

  const stats = useMemo(() => {
    const total = members.length;
    const activeList = members.filter((m) => m.status === 'active');
    const atRiskList = members.filter((m) => m.status === 'at_risk');
    const inactiveList = members.filter((m) => m.status === 'inactive');
    const activePct = total > 0 ? ((activeList.length / total) * 100).toFixed(1) : '0.0';
    return {
      total,
      activeCount: activeList.length,
      atRiskCount: atRiskList.length,
      inactiveCount: inactiveList.length,
      activePct,
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
  const selectedMember =
    selectedIds.length === 1
      ? members.find((member) => member.id === selectedIds[0]) ?? null
      : null;
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

  const batchOutreachTargets = selectedIds;

  useEffect(() => {
    if (!outreachTemplateOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOutreachTemplateOpen(false);
        setEditingTemplate(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [outreachTemplateOpen]);

  const closeOutreachTemplate = () => {
    setOutreachTemplateOpen(false);
    setEditingTemplate(false);
  };

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

      {/* 4-Column Member Summary Grid */}
      <section
        aria-label="Member directory metrics"
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
      >
        {/* Total Members */}
        <div className="rounded-lg border border-white/[0.08] bg-[#141824] p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9AA7B8]">
              Total Members
            </span>
            <Users className="w-4 h-4 text-[#64748B]" />
          </div>
          <div className="mt-4 flex items-baseline gap-2.5">
            <span className="font-mono text-4xl font-bold tabular-nums text-[#DFE2EF]">
              {stats.total}
            </span>
            <span className="text-sm text-[#9AA7B8]">members</span>
          </div>
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
            <Check className="w-3.5 h-3.5 text-[#4EDEA3]" />
            Visited within the last 7 days
          </p>
        </div>

        {/* Needs Follow-Up */}
        <div className="rounded-lg border border-white/[0.08] bg-[#141824] p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-[#C3F400]">
              Needs Follow-Up
            </span>
            <span className="font-mono text-[11px] font-semibold text-[#C3F400] bg-[#C3F400]/12 border border-[#C3F400]/30 px-2 py-0.5 rounded whitespace-nowrap">
              Action needed
            </span>
          </div>
          <div className="mt-4 flex items-baseline gap-2.5">
            <span className="font-mono text-4xl font-bold tabular-nums text-[#C3F400]">
              {stats.atRiskCount}
            </span>
            <span className="text-sm text-[#C3F400]/90">members</span>
          </div>
          <p className="mt-3 text-xs text-[#9AA7B8] inline-flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#C3F400]" />
            Last visit was 8–30 days ago
          </p>
        </div>

        {/* Inactive Members */}
        <div className="rounded-lg border border-white/[0.08] bg-[#141824] p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-[#FCA5A5]">
              Inactive Members
            </span>
            <AlertTriangle className="w-4 h-4 text-[#F87171]" />
          </div>
          <div className="mt-4 flex items-baseline gap-2.5">
            <span className="font-mono text-4xl font-bold tabular-nums text-[#FCA5A5]">
              {stats.inactiveCount}
            </span>
            <span className="text-sm text-[#9AA7B8]">members</span>
          </div>
          <p className="mt-3 text-xs text-[#9AA7B8] inline-flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-[#F87171]" />
            No visit for over 30 days
          </p>
        </div>
      </section>

      {/* Roster Filters and Actions */}
      <section className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2.5">
          <div className="relative min-w-[170px] flex-1 sm:flex-none sm:w-48">
            <label htmlFor="member-status-filter" className="sr-only">
              Filter members by status
            </label>
            <select
              id="member-status-filter"
              value={statusFilter}
              onChange={(event) => {
                const value = event.target.value;
                if (
                  value === 'all' ||
                  value === 'active' ||
                  value === 'at_risk' ||
                  value === 'inactive'
                ) {
                  setStatusFilter(value);
                }
              }}
              className="h-10 w-full appearance-none rounded-md border border-white/10 bg-[#121622] pl-3.5 pr-9 text-sm text-[#DFE2EF] focus:border-white/25 focus:outline-none crimson-focus"
            >
              <option value="all">All Members</option>
              <option value="active">Active</option>
              <option value="at_risk">Needs Follow-Up</option>
              <option value="inactive">Inactive</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9AA7B8]" />
          </div>

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
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setOutreachTemplateOpen(true)}
            title="Open WhatsApp / SMS outreach"
            aria-label="Open WhatsApp / SMS outreach"
            aria-haspopup="dialog"
            aria-expanded={outreachTemplateOpen}
            aria-busy={sendingOutreach !== null}
            className="h-10 w-10 rounded-md border border-[#10B981]/35 bg-[#10B981]/10 text-[#4EDEA3] hover:bg-[#10B981]/20 inline-flex items-center justify-center transition-colors shrink-0"
          >
            {sendingOutreach ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <MessageSquare className="h-4 w-4" />
            )}
          </button>

          <button
            type="button"
            disabled={!selectedMember}
            onClick={() => {
              if (selectedMember) onSelectHistoryMember(selectedMember.id);
            }}
            title={
              selectedMember
                ? `View workout analytics for ${selectedMember.name}`
                : 'Select exactly one member to view workout analytics'
            }
            aria-label={
              selectedMember
                ? `View workout analytics for ${selectedMember.name}`
                : 'Select exactly one member to view workout analytics'
            }
            className="h-10 w-10 rounded-md border border-white/10 bg-[#181E2C] text-[#9AA7B8] hover:border-[#60A5FA]/40 hover:text-[#60A5FA] inline-flex items-center justify-center transition-colors shrink-0 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChartNoAxesCombined className="h-4 w-4" />
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
          <table className="w-full border-collapse text-left min-w-[880px]">
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
                <th className="py-3.5 px-3">Member</th>
                <th className="py-3.5 px-3">Status</th>
                <th className="py-3.5 px-3">Age</th>
                <th className="py-3.5 px-3">Gender</th>
                <th className="py-3.5 px-3">Last Attended Session</th>
                <th className="py-3.5 px-3 text-right">Cadence (Freq)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 px-6 text-center">
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
                      : member.status === 'at_risk'
                        ? 'Needs Follow-Up'
                        : 'Inactive';

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

                      <td className="py-3.5 px-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded border font-mono text-[11px] font-medium whitespace-nowrap ${statusTone}`}
                        >
                          {statusLabel}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-sm text-[#64748B] whitespace-nowrap">
                        Not available
                      </td>

                      <td className="py-3.5 px-3 text-sm text-[#64748B] whitespace-nowrap">
                        Not available
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

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {outreachTemplateOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="outreach-template-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeOutreachTemplate();
          }}
        >
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-white/15 bg-[#131C2E] shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] bg-[#0D1422] px-5 py-4">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#10B981]/35 bg-[#10B981]/10 text-[#4EDEA3]">
                  <MessageSquare className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <h2
                    id="outreach-template-title"
                    className="font-display text-lg font-bold text-[#DFE2EF]"
                  >
                    WhatsApp / SMS Outreach
                  </h2>
                  {outreachTemplateSaveStatus !== 'idle' && (
                    <span
                      className={`inline-flex items-center gap-1 font-mono text-[10px] ${
                        outreachTemplateSaveStatus === 'error'
                          ? 'text-[#FCA5A5]'
                          : 'text-[#9AA7B8]'
                      }`}
                      role="status"
                    >
                      {outreachTemplateSaveStatus === 'saving' ? (
                        <>
                          <LoaderCircle className="h-3 w-3 animate-spin" />
                          Saving template...
                        </>
                      ) : outreachTemplateSaveStatus === 'saved' ? (
                        <>
                          <Check className="h-3 w-3" />
                          Template saved
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="h-3 w-3" />
                          Template save failed
                        </>
                      )}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => setEditingTemplate((prev) => !prev)}
                  className="inline-flex items-center gap-1 rounded px-2.5 py-2 font-mono text-[11px] text-[#DFE2EF] hover:bg-white/[0.06] hover:text-[#4EDEA3] transition-colors"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  {editingTemplate ? 'Preview' : 'Edit'}
                </button>
                <button
                  type="button"
                  onClick={closeOutreachTemplate}
                  className="rounded p-1.5 text-[#9AA7B8] hover:bg-white/[0.06] hover:text-white"
                  aria-label="Close outreach popup"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="space-y-4 overflow-y-auto p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-mono font-semibold uppercase tracking-wider text-[#4EDEA3]">
                  Message Template
                </span>
                <span className="font-mono text-[11px] text-[#9AA7B8]">
                  Personalization token: [First Name]
                </span>
              </div>

              {editingTemplate ? (
                <textarea
                  rows={5}
                  autoFocus
                  value={outreachTemplate}
                  onChange={(event) => onUpdateTemplate(event.target.value)}
                  aria-label="Edit WhatsApp and SMS outreach template"
                  className="w-full rounded-md border border-[#10B981]/40 bg-[#141B2B] p-3 text-sm leading-relaxed text-[#DFE2EF] kinetic-focus"
                />
              ) : (
                <div className="rounded-md border border-white/[0.07] bg-[#141B2B] p-4 text-sm leading-relaxed text-[#CBD5E1]">
                  &ldquo;{renderHighlightedTemplate(outreachTemplate)}&rdquo;
                </div>
              )}

              <div className="flex flex-col gap-3 border-t border-white/[0.08] pt-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs text-[#9AA7B8]">
                    Recipients:{' '}
                    <strong className="font-mono tabular-nums text-[#DFE2EF]">
                      {batchOutreachTargets.length} Selected Members
                    </strong>
                  </p>
                  {selectedIds.length === 0 && (
                    <p className="mt-1 text-[11px] text-[#64748B]">
                      Select members in the table to send outreach.
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  disabled={
                    batchOutreachTargets.length === 0 || sendingOutreach !== null
                  }
                  onClick={() =>
                    onSendOutreach(batchOutreachTargets, 'WhatsApp')
                  }
                  aria-busy={sendingOutreach !== null}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-[#E62020] px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#EF3333] disabled:cursor-not-allowed disabled:opacity-45 crimson-focus"
                >
                  {sendingOutreach ? (
                    <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  {sendingOutreach
                    ? 'Sending outreach...'
                    : `Send WhatsApp Outreach (${batchOutreachTargets.length})`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
