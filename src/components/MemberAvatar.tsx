interface MemberAvatarProps {
  initials: string;
  size?: 'sm' | 'md' | 'lg';
}

export function MemberAvatar({
  initials,
  size = 'md',
}: MemberAvatarProps) {
  const dims =
    size === 'sm'
      ? 'w-8 h-8 text-xs'
      : size === 'lg'
        ? 'w-12 h-12 text-base'
        : 'w-10 h-10 text-xs';

  return (
    <div
      className={`inline-flex items-center justify-center rounded-md border bg-slate-700/40 text-[#DFE2EF] border-white/15 font-mono font-semibold tracking-wider shrink-0 select-none ${dims}`}
      aria-hidden="true"
    >
      {initials}
    </div>
  );
}
