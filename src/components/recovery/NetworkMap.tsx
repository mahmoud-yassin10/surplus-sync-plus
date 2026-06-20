import { useState } from "react";
import { Snowflake, Truck } from "lucide-react";
import { useStore } from "../../lib/store";
import { SCHOOL_POS } from "../../lib/mock";

const STATUS_COLOR = {
  available: "var(--color-success)",
  limited: "var(--color-warning)",
  unavailable: "var(--color-text-faint)",
  closed: "var(--color-text-faint)",
} as const;

export function NetworkMap({ onSelect, selectedId }: { onSelect?: (id: string) => void; selectedId?: string }) {
  const { state } = useStore();
  const [hover, setHover] = useState<string | null>(null);

  return (
    <div className="relative aspect-[5/3] w-full bg-[var(--color-surface-2)] rounded-md border border-[var(--color-line)] overflow-hidden">
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 60" preserveAspectRatio="none">
        <defs>
          <pattern id="grid" width="5" height="5" patternUnits="userSpaceOnUse">
            <path d="M 5 0 L 0 0 0 5" fill="none" stroke="var(--color-line)" strokeWidth="0.15" />
          </pattern>
        </defs>
        <rect width="100" height="60" fill="url(#grid)" />
        <path d="M 0 38 Q 30 30, 60 36 T 100 32" stroke="var(--color-ai-soft)" strokeWidth="3" fill="none" opacity="0.7" />

        {state.partners.map((p) => {
          if (p.status === "closed") return null;
          const match = state.matches.find((m) => m.partnerId === p.id);
          const x1 = SCHOOL_POS.lng * 100;
          const y1 = SCHOOL_POS.lat * 60;
          const x2 = p.lng * 100;
          const y2 = p.lat * 60;
          const mx = (x1 + x2) / 2;
          const my = Math.min(y1, y2) - 8;
          const path = `M ${x1} ${y1} Q ${mx} ${my}, ${x2} ${y2}`;
          const isHover = hover === p.id || selectedId === p.id;
          let stroke = "var(--color-line-strong)";
          let dash = "1 1.5";
          let width = 0.3;
          if (match?.state === "reserved" || match?.state === "provisional") { stroke = "var(--color-ai)"; dash = "2 2"; width = 0.7; }
          if (match?.state === "confirmed") { stroke = "var(--color-success)"; dash = ""; width = 0.8; }
          if (match?.state === "completed") { stroke = "var(--color-verified)"; dash = ""; width = 0.9; }
          if (isHover) width = Math.max(width, 0.9);
          return <path key={p.id} d={path} stroke={stroke} strokeWidth={width} strokeDasharray={dash} fill="none" opacity={isHover ? 1 : 0.7} />;
        })}
      </svg>

      <Marker x={SCHOOL_POS.lng} y={SCHOOL_POS.lat} label="Lincoln Heights HS" kind="school" />

      {state.partners.map((p) => (
        <Marker
          key={p.id}
          x={p.lng}
          y={p.lat}
          label={p.name}
          subLabel={`${p.capacity} meals · ${p.distanceMi}mi`}
          color={STATUS_COLOR[p.status]}
          refrigerated={p.refrigerated}
          vehicle={p.vehicle}
          dim={p.status === "closed" || p.status === "unavailable"}
          active={selectedId === p.id || hover === p.id}
          onClick={() => onSelect?.(p.id)}
          onHover={(h: boolean) => setHover(h ? p.id : null)}
          matched={state.matches.find((m) => m.partnerId === p.id)?.state}
        />
      ))}
    </div>
  );
}

function Marker({ x, y, label, subLabel, color = "var(--color-ink)", kind, refrigerated, vehicle, dim, active, onClick, onHover, matched }: any) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => onHover?.(true)}
      onMouseLeave={() => onHover?.(false)}
      className="absolute -translate-x-1/2 -translate-y-1/2 group"
      style={{ left: `${x * 100}%`, top: `${y * 100}%`, opacity: dim ? 0.45 : 1 }}
    >
      <div className="relative">
        {matched === "confirmed" && <span className="absolute -inset-2 rounded-full bg-[var(--color-success)] opacity-15 animate-pulse" />}
        <div className={`relative h-3.5 w-3.5 rounded-full border-2 border-white ${active ? "ring-2 ring-[var(--color-ai)]" : ""}`} style={{ background: kind === "school" ? "var(--color-ink)" : color, boxShadow: "0 1px 3px rgba(0,0,0,0.18)" }} />
      </div>
      <div className="absolute left-1/2 -translate-x-1/2 mt-1 whitespace-nowrap text-[10px] font-medium text-[var(--color-text)] pointer-events-none">
        {label}
      </div>
      {subLabel && (
        <div className="absolute left-1/2 -translate-x-1/2 mt-4 whitespace-nowrap text-[9.5px] text-[var(--color-text-faint)] tnum pointer-events-none">
          {subLabel}
          {refrigerated && <Snowflake size={9} className="inline ml-1 text-[var(--color-ai)]" />}
          {vehicle && <Truck size={9} className="inline ml-1 text-[var(--color-text-soft)]" />}
        </div>
      )}
    </button>
  );
}