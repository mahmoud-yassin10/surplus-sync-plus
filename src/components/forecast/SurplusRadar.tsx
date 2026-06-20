import { HORIZON_DAYS } from "../../lib/mock";
import { forecastViewFromState, syncHorizonFocusDay } from "../../lib/forecast";
import { useStore } from "../../lib/store";

const RISK_COLOR: Record<string, string> = {
  low: "var(--color-success)",
  moderate: "var(--color-warning)",
  high: "var(--color-critical)",
  critical: "var(--color-critical)",
};

export function SurplusRadar() {
  const { state } = useStore();
  const view = forecastViewFromState(state);
  const days = syncHorizonFocusDay(HORIZON_DAYS, state.forecast, state.currentPlan);
  const size = 360;
  const cx = size / 2;
  const cy = size / 2;

  return (
    <div className="p-4">
      <div className="grid lg:grid-cols-[1fr_260px] gap-4 items-start">
        <div className="relative aspect-square w-full max-w-[440px] mx-auto">
          <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full">
            {[60, 110, 160].map((r, i) => (
              <g key={r}>
                <circle
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill="none"
                  stroke="var(--color-line)"
                  strokeDasharray="2 4"
                />
                <text x={cx + r + 3} y={cy + 3} fontSize="9" fill="var(--color-text-faint)">
                  +{(i + 1) * 5}d
                </text>
              </g>
            ))}

            <circle cx={cx} cy={cy} r="26" fill="var(--color-ink)" />
            <text x={cx} y={cy - 2} textAnchor="middle" fontSize="9" fill="white" opacity="0.7">
              LINCOLN
            </text>
            <text x={cx} y={cy + 9} textAnchor="middle" fontSize="9" fill="white" opacity="0.7">
              HEIGHTS
            </text>

            {days.map((d, i) => {
              const angle = (i / days.length) * Math.PI * 2 - Math.PI / 2;
              const ring = i < 5 ? 80 : i < 8 ? 130 : 160;
              const x = cx + Math.cos(angle) * ring;
              const y = cy + Math.sin(angle) * ring;
              const isFocus = d.date === view.date;
              const color = RISK_COLOR[d.risk];
              const sz = 4 + Math.min(10, d.preventable / 20);
              return (
                <g key={d.date}>
                  <line
                    x1={cx}
                    y1={cy}
                    x2={x}
                    y2={y}
                    stroke="var(--color-line)"
                    strokeWidth="0.6"
                    opacity="0.4"
                  />
                  {isFocus && (
                    <circle cx={x} cy={y} r={sz + 6} fill={color} opacity="0.18">
                      <animate
                        attributeName="r"
                        values={`${sz + 6};${sz + 14};${sz + 6}`}
                        dur="2.4s"
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="opacity"
                        values="0.22;0.05;0.22"
                        dur="2.4s"
                        repeatCount="indefinite"
                      />
                    </circle>
                  )}
                  <circle cx={x} cy={y} r={sz} fill={color} />
                  <text
                    x={x}
                    y={y - sz - 4}
                    textAnchor="middle"
                    fontSize="8.5"
                    fill="var(--color-text-soft)"
                  >
                    {d.label} {d.date.slice(8)}
                  </text>
                </g>
              );
            })}

            {state.partners
              .filter((p) => p.status !== "closed")
              .map((p, i, arr) => {
                const angle = (i / arr.length) * Math.PI * 2 - Math.PI / 2 + 0.4;
                const r = 175;
                const x = cx + Math.cos(angle) * r;
                const y = cy + Math.sin(angle) * r;
                return (
                  <g key={p.id}>
                    <path
                      d={`M ${cx} ${cy} L ${x} ${y}`}
                      stroke="var(--color-success)"
                      strokeWidth="0.8"
                      strokeDasharray="3 4"
                      opacity="0.35"
                    />
                    <circle
                      cx={x}
                      cy={y}
                      r="6"
                      fill="var(--color-success-soft)"
                      stroke="var(--color-success)"
                    />
                    <text
                      x={x}
                      y={y + 14}
                      textAnchor="middle"
                      fontSize="8"
                      fill="var(--color-text-soft)"
                    >
                      {p.capacity}
                    </text>
                  </g>
                );
              })}
          </svg>
        </div>

        <aside className="space-y-3">
          <div>
            <div className="text-[10.5px] uppercase tracking-[0.14em] text-[var(--color-text-faint)] mb-1">
              Selected horizon event
            </div>
            <div className="text-[14px] font-semibold">{view.focusDateShort}</div>
            <div className="text-[11.5px] text-[var(--color-text-soft)]">
              Exams · Trip · Early dismissal · Rain · Popular menu
            </div>
          </div>
          <div className="rounded-md border border-[var(--color-line)] p-3 space-y-2">
            <Row
              label="Expected attendance"
              value={String(view.expectedAttendance)}
              sub={`80% interval ${view.intervalLabel}`}
            />
            <Row label="Current plan" value={`${view.currentPlan} meals`} />
            <Row label="Recommended plan" value={`${view.recommendedPrep} meals`} tone="ai" />
            <Row
              label="Preventable surplus"
              value={`${view.preventableSurplus} meals`}
              tone="critical"
            />
            <Row label="Shortage probability" value={`${(view.shortageProb * 100).toFixed(1)}%`} />
          </div>
          <div className="rounded-md border border-[var(--color-line)] p-3">
            <div className="text-[10.5px] uppercase tracking-[0.14em] text-[var(--color-text-faint)] mb-2">
              Nearby capacity
            </div>
            <div className="space-y-1.5">
              {state.partners
                .filter((p) => p.status === "available")
                .map((p) => (
                  <div key={p.id} className="flex items-center justify-between text-[11.5px]">
                    <span className="truncate text-[var(--color-text)] pr-2">{p.name}</span>
                    <span className="tnum text-[var(--color-text-soft)] whitespace-nowrap">
                      {p.capacity} · {p.distanceMi}mi
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "ai" | "critical";
}) {
  const color =
    tone === "ai"
      ? "text-[var(--color-ai)]"
      : tone === "critical"
        ? "text-[var(--color-critical)]"
        : "text-[var(--color-text)]";
  return (
    <div className="flex items-baseline justify-between gap-2">
      <div className="min-w-0">
        <div className="text-[11px] text-[var(--color-text-soft)]">{label}</div>
        {sub && <div className="text-[10.5px] text-[var(--color-text-faint)]">{sub}</div>}
      </div>
      <div className={`text-[13px] font-semibold tnum ${color}`}>{value}</div>
    </div>
  );
}
