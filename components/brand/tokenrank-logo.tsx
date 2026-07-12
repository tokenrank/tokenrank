export function TokenRankLogo({
  compact = false,
}: {
  compact?: boolean;
  invert?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-3.5">
      <span className="tr-logo-mark" aria-hidden="true">
        <svg className="size-6 skew-x-[5deg]" viewBox="0 0 48 48" role="img">
          <path d="M8 9h25v7H8zM15 20h25v7H15zM22 31h18v7H22z" fill="currentColor" />
          <path d="m8 34 10-10v20H8Z" fill="currentColor" />
        </svg>
      </span>
      {compact ? null : (
        <span className="grid leading-none">
          <span className="font-display text-xl font-bold uppercase tracking-[-0.03em] text-[color:var(--tr-ivory)]">
            Token<span className="text-[color:var(--tr-gold)]">/</span>Rank
          </span>
          <span className="mt-1 hidden font-mono text-[0.55rem] font-bold uppercase tracking-[0.2em] text-[color:var(--tr-muted)] sm:block">
            AI token league
          </span>
        </span>
      )}
    </span>
  );
}
