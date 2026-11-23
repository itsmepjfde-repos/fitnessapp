interface BrandWordmarkProps {
  size?: 'sm' | 'md' | 'xl';
  showEmblem?: boolean;
  subtitle?: string;
}

export function BrandEmblem({ className = 'w-11 h-11' }: { className?: string }) {
  return (
    <img
      src="/dannysthenics-logo.jpeg"
      alt=""
      aria-hidden="true"
      className={`rounded-md object-cover shrink-0 ${className}`}
    />
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
      {showEmblem && <BrandEmblem className="w-11 h-11" />}
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
