import { useEffect, useRef, useState } from 'react';
import { ChevronDown, LoaderCircle, LogOut, RotateCcw } from 'lucide-react';
import { AppView, AuthSession } from '../types/portal';
import { BrandWordmark } from './BrandWordmark';

interface TopNavProps {
  activeView: AppView;
  session: AuthSession;
  canResetDemo: boolean;
  isResettingDemoData: boolean;
  onSelectView: (view: AppView) => void;
  onResetDemo: () => void;
  onSignOut: () => void;
}

export function TopNav({
  activeView,
  session,
  canResetDemo,
  isResettingDemoData,
  onSelectView,
  onResetDemo,
  onSignOut,
}: TopNavProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.08] bg-[#0B0F19]/95 backdrop-blur-md no-print">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4 lg:gap-8">
        {/* Zone 1: Brand Wordmark */}
        <button
          type="button"
          onClick={() => onSelectView('attendance')}
          className="text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981]/60 rounded-md shrink-0"
          aria-label="DANNY'STHENICS Coach Pro Home"
        >
          <BrandWordmark size="md" showEmblem />
        </button>

        {/* Zone 2: Clean Single-Line Navigation */}
        <nav
          className="hidden md:flex items-center gap-2 bg-[#121724] p-1 rounded-md border border-white/[0.07]"
          aria-label="Primary sections"
        >
          <button
            type="button"
            onClick={() => onSelectView('attendance')}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors duration-150 whitespace-nowrap shrink-0 ${
              activeView === 'attendance'
                ? 'bg-[#E62020] text-white font-semibold'
                : 'text-[#9AA7B8] hover:text-[#DFE2EF] hover:bg-white/[0.04]'
            }`}
          >
            Attendance &amp; Check-In
          </button>
          <button
            type="button"
            onClick={() => onSelectView('directory')}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors duration-150 whitespace-nowrap shrink-0 ${
              activeView === 'directory'
                ? 'bg-[#E62020] text-white font-semibold'
                : 'text-[#9AA7B8] hover:text-[#DFE2EF] hover:bg-white/[0.04]'
            }`}
          >
            Member Directory &amp; Inactivity
          </button>
          <button
            type="button"
            disabled
            title="Assessment is coming soon"
            aria-label="Assessment (coming soon)"
            className="px-4 py-2 rounded text-sm font-medium whitespace-nowrap shrink-0 text-[#64748B] opacity-60 cursor-not-allowed"
          >
            Assessment
            <span className="ml-1.5 rounded bg-[#0A0E17] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider">
              Soon
            </span>
          </button>
        </nav>

        {/* Zone 3: Coach Account Menu */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded border border-white/10 bg-[#141925] hover:border-white/20 transition-colors whitespace-nowrap shrink-0 kinetic-focus"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
            >
              <span className="w-7 h-7 rounded bg-[#10B981]/15 border border-[#10B981]/35 text-[#4EDEA3] font-mono text-xs font-bold inline-flex items-center justify-center">
                {session.coachName
                  .split(' ')
                  .map((p) => p[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()}
              </span>
              <span className="hidden lg:inline text-sm font-medium text-[#DFE2EF]">
                {session.coachName}
              </span>
              <ChevronDown className="w-4 h-4 text-[#9AA7B8]" />
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-60 rounded-lg border border-white/12 bg-[#131C2E] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.85)] py-1.5 z-50"
              >
                <div className="px-3.5 py-2.5 border-b border-white/[0.08]">
                  <p className="text-sm font-semibold text-[#DFE2EF] truncate">
                    {session.coachName}
                  </p>
                  <p className="text-xs font-mono text-[#9AA7B8] truncate">
                    {session.email}
                  </p>
                </div>
                {canResetDemo && (
                  <button
                    type="button"
                    role="menuitem"
                    disabled={isResettingDemoData}
                    onClick={onResetDemo}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-[#DFE2EF] hover:bg-white/[0.05] transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isResettingDemoData ? (
                      <LoaderCircle className="w-4 h-4 animate-spin text-[#C3F400]" />
                    ) : (
                      <RotateCcw className="w-4 h-4 text-[#C3F400]" />
                    )}
                    {isResettingDemoData ? 'Resetting demo data...' : 'Reset Demo Data'}
                  </button>
                )}
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    onSignOut();
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-[#F87171] hover:bg-[#EF4444]/10 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Navigation Bar */}
      <div className="md:hidden border-t border-white/[0.06] px-4 py-2 flex items-center gap-2 bg-[#0D111C]">
        <button
          type="button"
          onClick={() => onSelectView('attendance')}
          className={`flex-1 min-w-0 py-2 px-1 rounded text-[10px] leading-tight font-semibold transition-colors ${
            activeView === 'attendance'
              ? 'bg-[#E62020] text-white'
              : 'bg-[#141925] text-[#9AA7B8]'
          }`}
        >
          Check-In
        </button>
        <button
          type="button"
          onClick={() => onSelectView('directory')}
          className={`flex-1 min-w-0 py-2 px-1 rounded text-[10px] leading-tight font-semibold transition-colors ${
            activeView === 'directory'
              ? 'bg-[#E62020] text-white'
              : 'bg-[#141925] text-[#9AA7B8]'
          }`}
        >
          Members
        </button>
        <button
          type="button"
          disabled
          title="Assessment is coming soon"
          aria-label="Assessment (coming soon)"
          className="flex-1 min-w-0 py-2 px-1 rounded text-[10px] leading-tight font-semibold bg-[#141925] text-[#64748B] opacity-60 cursor-not-allowed"
        >
          Assessment <span className="block text-[9px] font-normal">Soon</span>
        </button>
      </div>
    </header>
  );
}
