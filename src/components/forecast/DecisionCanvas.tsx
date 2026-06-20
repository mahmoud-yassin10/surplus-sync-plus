import { useMemo, useState } from "react";
import { AlertTriangle, Lock, ShieldCheck } from "lucide-react";
import { useStore } from "../../lib/store";
import { computeShortage, computeWaste, forecastViewFromState, SAFETY_FLOOR } from "../../lib/forecast";

export { SAFETY_FLOOR };

export function DecisionCanvas() {
  const { state, dispatch } = useStore();
  const view = forecastViewFromState(state);
  const [proposed, setProposed] = useState(state.currentPlan);
  const shortage = computeShortage(proposed);
  const waste = computeWaste(proposed, view.expectedAttendance);
  const blocked = proposed < SAFETY_FLOOR;

  const curve = useMemo(() => {
    const arr: { x: number; shortage: number; waste: number }[] = [];
    for (let m = 450; m <= 800; m += 10) {
      arr.push({
        x: m,
        shortage: computeShortage(m),
        waste: computeWaste(m, view.expectedAttendance),
      });
    }
    return arr;
  }, [view.expectedAttendance]);

  const maxShortage = Math.max(...curve.map((c) => c.shortage));
  const maxWaste = Math.max(...curve.map((c) => c.waste));

  return (
    <div className="grid lg:grid-cols-[1.4fr_1fr] gap-4 p-4">
      <div className="rounded-md border border-[var(--color-line)] bg-[var(--color-surface-2)]/40 p-5">
        <div className="flex items-center justify-between mb-4 gap-3">
          <div>
            <div className="text-[10.5px] uppercase tracking-[0.14em] text-[var(--color-text-faint)]">Proposed preparation</div>
            <div className="flex items-baseline gap-2 mt-1">
              <div className="text-[34px] font-semibold tnum tracking-tight">{proposed}</div>
              <div className="text-[12px] text-[var(--color-text-soft)]">meals</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10.5px] uppercase tracking-[0.14em] text-[var(--color-text-faint)]">Safety floor</div>
            <div className="text-[14px] font-semibold tnum mt-1 text-[var(--color-text)]">{SAFETY_FLOOR} meals</div>
          </div>
        </div>

        <input type="range" min={450} max={800} step={2} value={proposed} onChange={(e) => setProposed(Number(e.target.value))} className="w-full accent-[var(--color-ai)]" />

        <div className="mt-5 grid sm:grid-cols-2 gap-4">
          <Curve title="Shortage probability" color="var(--color-critical)" curve={curve} key1="shortage" max={maxShortage} marker={proposed} format={(v) => `${(v * 100).toFixed(1)}%`} expectedAttendance={view.expectedAttendance} />
          <Curve title="Projected overproduction" color="var(--color-warning)" curve={curve} key1="waste" max={maxWaste} marker={proposed} format={(v) => `${Math.round(v)}`} expectedAttendance={view.expectedAttendance} />
        </div>

        <div className={`mt-4 rounded-md p-3 border text-[12px] flex items-start gap-2 ${
          blocked
            ? "border-[var(--color-critical)]/30 bg-[var(--color-critical-soft)]/50 text-[var(--color-critical)]"
            : "border-[var(--color-success)]/20 bg-[var(--color-success-soft)]/50 text-[var(--color-success)]"
        }`}>
          {blocked ? <Lock size={14} className="mt-0.5" /> : <ShieldCheck size={14} className="mt-0.5" />}
          <div>
            {blocked ? (
              <><strong>Blocked.</strong> {proposed} meals is below the {SAFETY_FLOOR}-meal safety floor. Adjust upward to continue.</>
            ) : (
              <><strong>Within safe range.</strong> Shortage probability {(shortage * 100).toFixed(1)}% · expected overproduction {waste} meals.</>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button disabled={blocked} onClick={() => dispatch({ type: "SET_PLAN", meals: proposed })} className="text-[12px] px-3 py-2 rounded-md bg-[var(--color-ink)] text-white disabled:opacity-40">Apply proposed plan</button>
          <button onClick={() => setProposed(view.recommendedPrep)} className="text-[12px] px-3 py-2 rounded-md border border-[var(--color-line)]">Snap to AI recommendation</button>
          <button onClick={() => setProposed(view.baselinePrep)} className="text-[12px] px-3 py-2 rounded-md border border-[var(--color-line)]">Reset to current plan</button>
        </div>
      </div>

      <div className="space-y-3">
        <div className="rounded-md border border-[var(--color-line)] overflow-hidden">
          <div className="px-4 py-2.5 border-b border-[var(--color-line)] text-[11.5px] font-semibold text-[var(--color-text)]">Scenario comparison</div>
          <table className="w-full text-[11.5px]">
            <thead className="text-[var(--color-text-faint)] uppercase text-[9.5px] tracking-wider">
              <tr className="border-b border-[var(--color-line)]">
                <th className="text-left px-3 py-2 font-medium">Plan</th>
                <th className="text-right px-3 py-2 font-medium">Meals</th>
                <th className="text-right px-3 py-2 font-medium">Shortage</th>
                <th className="text-right px-3 py-2 font-medium">Waste</th>
              </tr>
            </thead>
            <tbody className="tnum">
              {view.scenarioRows.map((s) => {
                const isSsp = s.id === "ssp";
                return (
                  <tr key={s.id} className={`border-b border-[var(--color-line)] ${isSsp ? "bg-[var(--color-ai-soft)]/40" : ""}`}>
                    <td className="px-3 py-2 text-[var(--color-text)]">{s.label}</td>
                    <td className="px-3 py-2 text-right">{s.meals}</td>
                    <td className="px-3 py-2 text-right text-[var(--color-critical)]">{(s.shortage * 100).toFixed(1)}%</td>
                    <td className="px-3 py-2 text-right text-[var(--color-warning)]">{s.waste}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="rounded-md border border-[var(--color-warning)]/30 bg-[var(--color-warning-soft)]/40 p-3 text-[11.5px] text-[var(--color-text-soft)] flex gap-2">
          <AlertTriangle size={14} className="text-[var(--color-warning)] mt-0.5 shrink-0" />
          <div>
            AI plans are estimates with visible uncertainty. The cafeteria manager makes the final call. The {SAFETY_FLOOR}-meal safety floor is a policy minimum, separate from the statistical attendance interval.
          </div>
        </div>
      </div>
    </div>
  );
}

function Curve({ title, color, curve, key1, max, marker, format, expectedAttendance }: { title: string; color: string; curve: { x: number; shortage: number; waste: number }[]; key1: "shortage" | "waste"; max: number; marker: number; format: (v: number) => string; expectedAttendance: number }) {
  const W = 220, H = 80;
  const xMin = 450, xMax = 800;
  const path = curve.map((c, i) => {
    const x = ((c.x - xMin) / (xMax - xMin)) * W;
    const v = c[key1];
    const y = H - (v / max) * (H - 8) - 2;
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const markerX = ((marker - xMin) / (xMax - xMin)) * W;
  const v = key1 === "shortage" ? computeShortage(marker) : computeWaste(marker, expectedAttendance);

  return (
    <div>
      <div className="flex items-center justify-between text-[10.5px] mb-1">
        <span className="uppercase tracking-wider text-[var(--color-text-faint)]">{title}</span>
        <span className="tnum text-[var(--color-text)] font-medium">{format(v)}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[80px]">
        <path d={path} stroke={color} strokeWidth="1.5" fill="none" />
        <path d={`${path} L ${W},${H} L 0,${H} Z`} fill={color} opacity="0.1" />
        <line x1={markerX} y1={0} x2={markerX} y2={H} stroke="var(--color-ink)" strokeWidth="1" strokeDasharray="2 3" />
      </svg>
    </div>
  );
}
