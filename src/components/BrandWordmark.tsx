interface BrandWordmarkProps {
  size?: 'sm' | 'md' | 'xl';
  showEmblem?: boolean;
  subtitle?: string;
}

export function BrandEmblem({ className = 'w-9 h-9' }: { className?: string }) {
  return (
    <div
      className={`relative flex items-center justify-center rounded-md bg-gradient-to-br from-[#1d2230] to-[#0f131c] border border-white/15 shrink-0 ${className}`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 36 36" className="w-6 h-6" fill="none">
        <path
          d="M6 12L18 5L30 12V24L18 31L6 24V12Z"
          stroke="#E62020"
          strokeWidth="2.2"
          fill="rgba(230, 32, 32, 0.14)"
        />
        <path
          d="M12 18H24M14 13V23M22 13V23"
          stroke="#FFFFFF"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <circle cx="18" cy="18" r="2.2" fill="#10B981" />
      </svg>
    </div>
  );
}

export function BrandWordmark({
  size = 'md',
  showEmblem = false,
  subtitle,
}: BrandWordmarkProps) {
  const textSize =
    size === 'xl'
      ? 'text-3xl sm:text-5xl tracking-[-0.03em]'
      : size === 'sm'
        ? 'text-base tracking-[-0.02em]'
        : 'text-lg sm:text-xl tracking-[-0.02em]';

  return (
    <div className="inline-flex items-center gap-3 shrink-0">
      {showEmblem && <BrandEmblem className="w-9 h-9" />}
      <div className="flex flex-col leading-none">
        <span
          className={`font-display font-bold uppercase whitespace-nowrap ${textSize}`}
        >
          <span className="text-[#EF233C]">DANNY&apos;</span>
          <span className="text-white">ST</span>
          <span className="text-[#EF233C]">HENICS</span>
        </span>
        {subtitle && (
          <span className="mt-1 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-[#4EDEA3] whitespace-nowrap">
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
}
