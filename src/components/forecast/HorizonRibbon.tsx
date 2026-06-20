import { Bus, Cloud, FlaskConical, Sun, Utensils } from "lucide-react";
import { HORIZON_DAYS } from "../../lib/mock";

const ICONS: Record<string, any> = {
  exam: FlaskConical,
  trip: Bus,
  weather: Cloud,
  "popular-menu": Utensils,
  "early-dismissal": Sun,
};

const RISK_COLOR: Record<string, string> = {
  low: "var(--color-success)",
  moderate: "var(--color-warning)",
  high: "var(--color-critical)",
  critical: "var(--color-critical)",
};

export function HorizonRibbon({ onSelectDate, selected }: { onSelectDate?: (d: string) => void; selected?: string }) {
  return (
    <div className="px-4 py-4">
      <div className="flex items-end justify-between mb-3 gap-3">
        <div>
          <div className="text-[10.5px] uppercase tracking-[0.16em] text-[var(--color-text-faint)]">Forecast horizon</div>
          <div className="text-[12.5px] text-[var(--color-text-soft)]">Next 10 school days · attendance, events, preventable surplus</div>
        </div>
        <div className="hidden md:flex items-center gap-3 text-[11px] text-[var(--color-text-soft)]">
          <Legend dot="var(--color-success)" label="Low" />
          <Legend dot="var(--color-warning)" label="Moderate" />
          <Legend dot="var(--color-critical)" label="High" />
        </div>
      </div>

      <div className="grid grid-cols-5 md:grid-cols-10 gap-1.5">
        {HORIZON_DAYS.map((d) => {
          const isFocus = d.risk === "high";
          const isSelected = selected === d.date;
          const color = RISK_COLOR[d.risk];
          const barH = Math.min(56, 8 + (d.preventable / 200) * 56);
          return (
            <button
              key={d.date}
              onClick={() => onSelectDate?.(d.date)}
              className={`group relative rounded-md border px-2 pt-2 pb-2 text-left transition ${
                isSelected
                  ? "border-[var(--color-ai)] bg-[var(--color-ai-soft)]/30"
                  : "border-[var(--color-line)] hover:border-[var(--color-line-strong)] bg-[var(--color-surface)]"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-faint)]">{d.label}</div>
                  <div className="text-[13px] font-semibold tnum">{d.date.slice(8)}</div>
                </div>
                {isFocus && (
                  <span className="relative inline-flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full rounded-full opacity-60 pulse-dot" style={{ background: color }} />
                    <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: color }} />
                  </span>
                )}
              </div>

              <div className="mt-2 flex items-end gap-1 h-[56px]">
                <div className="flex-1 rounded-sm" style={{ height: barH, background: color, opacity: 0.85 }} />
              </div>

              <div className="mt-1 text-[10.5px] text-[var(--color-text-faint)] tnum">
                <span className="text-[var(--color-text)]">{d.attendance}</span> exp
              </div>

              {d.events.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {d.events.slice(0, 3).map((ev) => {
                    const Ic = ICONS[ev];
                    return Ic ? <Ic key={ev} size={10} className="text-[var(--color-text-faint)]" /> : null;
                  })}
                  {d.events.length > 3 && <span className="text-[9px] text-[var(--color-text-faint)]">+{d.events.length - 3}</span>}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Legend({ dot, label }: { dot: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: dot }} /> {label}
    </span>
  );
}