export function Logo({ size = 28, mono = false }: { size?: number; mono?: boolean }) {
  const stroke = mono ? "currentColor" : "var(--color-ai)";
  const accent = mono ? "currentColor" : "var(--color-success)";
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
      <circle cx="16" cy="16" r="14" stroke={stroke} strokeWidth="1.5" opacity="0.35" />
      <circle cx="16" cy="16" r="9" stroke={stroke} strokeWidth="1.5" opacity="0.6" />
      <path d="M16 4 A12 12 0 0 1 28 16" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
      <rect x="11" y="13" width="10" height="6" rx="1.4" fill={accent} />
      <circle cx="16" cy="16" r="1.6" fill="white" />
    </svg>
  );
}