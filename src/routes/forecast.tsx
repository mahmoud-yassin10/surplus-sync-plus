import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, ChevronRight, Sparkles, X } from "lucide-react";
import { Page, Section, StatLabel } from "../components/shell/AppShell";
import { EvidenceTrigger } from "../components/forecast/EvidenceDrawer";
import { useStore } from "../lib/store";

export const Route = createFileRoute("/forecast")({
  head: () => ({ meta: [{ title: "Daily forecast — SurplusSync Plus" }] }),
  component: Forecast,
});

function Forecast() {
  const { state, dispatch } = useStore();
  const f = state.forecast;

  return (
    <Page kicker="Daily forecast" title={`Thursday Mar 12, 2026`}
      actions={<>
        <EvidenceTrigger />
        <Link to="/decision" className="text-[12px] px-3 py-1.5 rounded-md border border-[var(--color-line)]">Decision Canvas →</Link>
      </>}
    >
      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-5">
        <div className="space-y-5">
          <Section title="Demand forecast" hint={`Model ${f.modelVersion} · data quality ${f.dataQuality}`}>
            <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-4">
              <Big label="Expected attendance" value={f.expectedAttendance} unit="students" />
              <Big label="80% interval" value={`${f.intervalLow}–${f.intervalHigh}`} unit="students" />
              <Big label="Recommended prep" value={f.recommendedPrep} tone="ai" unit="meals" />
              <Big label="Shortage probability" value={`${(f.shortageProb * 100).toFixed(1)}%`} />
              <Big label="Preventable surplus" value={f.preventableSurplus} tone="critical" unit="meals" />
              <Big label="Large-surplus prob" value={`${(f.largeSurplusProb * 100).toFixed(0)}%`} />
              <Big label="Safety buffer" value={`+${f.recommendedPrep - f.intervalHigh}`} unit="above 80% upper" />
              <Big label="Max safe reduction" value={`${730 - 540}`} unit="meals" />
            </div>
          </Section>

          <Section title="Menu-level recommendation">
            <table className="w-full text-[12.5px]">
              <thead className="text-[var(--color-text-faint)] uppercase text-[9.5px] tracking-wider border-b border-[var(--color-line)]">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Item</th>
                  <th className="text-right px-4 py-2 font-medium">Recommended portions</th>
                </tr>
              </thead>
              <tbody>
                {f.menu.map((m) => (
                  <tr key={m.item} className="border-b border-[var(--color-line)] last:border-0">
                    <td className="px-4 py-2.5 text-[var(--color-text)]">{m.item}</td>
                    <td className="px-4 py-2.5 text-right tnum">{m.recommended}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          <Section title="Actions" hint="The cafeteria manager retains final authority">
            <div className="p-4 flex flex-wrap gap-2">
              {!state.approvedRecommendation ? (
                <button onClick={() => dispatch({ type: "APPLY_RECOMMENDATION" })} className="text-[12px] px-3 py-2 rounded-md bg-[var(--color-success)] text-white flex items-center gap-1.5">
                  <CheckCircle2 size={12} /> Approve {f.recommendedPrep} meals
                </button>
              ) : (
                <span className="text-[12px] px-3 py-2 rounded-md bg-[var(--color-success-soft)] text-[var(--color-success)] flex items-center gap-1.5">
                  <CheckCircle2 size={12} /> Approved · current plan {state.currentPlan}
                </span>
              )}
              <Link to="/decision" className="text-[12px] px-3 py-2 rounded-md border border-[var(--color-line)] flex items-center gap-1.5">Modify in Decision Canvas <ChevronRight size={12} /></Link>
              <button className="text-[12px] px-3 py-2 rounded-md border border-[var(--color-line)] text-[var(--color-critical)] flex items-center gap-1.5"><X size={12} /> Reject recommendation</button>
              <button onClick={() => dispatch({ type: "TOGGLE_AI" })} className="text-[12px] px-3 py-2 rounded-md border border-[var(--color-line)]">{state.aiMode ? "Switch to manual mode" : "Re-enable AI"}</button>
            </div>
          </Section>
        </div>

        <div className="space-y-5">
          <Section title="Top influential inputs" right={<Sparkles size={13} className="text-[var(--color-ai)]" />}>
            <ul className="divide-y divide-[var(--color-line)]">
              {f.influences.map((i) => (
                <li key={i.factor} className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className={`h-1.5 w-1.5 rounded-full ${i.direction === "down" ? "bg-[var(--color-critical)]" : "bg-[var(--color-success)]"}`} />
                    <span className="text-[12.5px] text-[var(--color-text)]">{i.factor}</span>
                    <span className="ml-auto tnum text-[11.5px] text-[var(--color-text-soft)]">{i.direction === "down" ? "−" : "+"}{i.magnitude}</span>
                  </div>
                  <div className="text-[10.5px] text-[var(--color-text-faint)] pl-3.5 mt-0.5">{i.note}</div>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Similar historical days">
            <table className="w-full text-[12px]">
              <tbody>
                {f.similarDays.map((d) => (
                  <tr key={d.date} className="border-b border-[var(--color-line)] last:border-0">
                    <td className="px-4 py-2 tnum text-[var(--color-text-soft)]">{d.date}</td>
                    <td className="px-4 py-2 text-right tnum font-medium">{d.attendance}</td>
                    <td className="px-4 py-2 pl-1 text-[var(--color-text-faint)]">{d.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          <Section title="Manual corrections">
            <div className="p-4 text-[12px] text-[var(--color-text-soft)]">
              {state.attendanceCorrected ? (
                <span className="inline-flex items-center gap-1.5 text-[var(--color-success)]"><CheckCircle2 size={12} /> Trip cancelled — attendance corrected to 540.</span>
              ) : (
                <>No human corrections on this forecast.</>
              )}
            </div>
          </Section>
        </div>
      </div>
    </Page>
  );
}

function Big({ label, value, unit, tone }: { label: string; value: any; unit?: string; tone?: "ai" | "critical" }) {
  const c = tone === "ai" ? "text-[var(--color-ai)]" : tone === "critical" ? "text-[var(--color-critical)]" : "text-[var(--color-text)]";
  return (
    <div className="rounded-md border border-[var(--color-line)] p-3">
      <StatLabel>{label}</StatLabel>
      <div className={`text-[20px] font-semibold tnum mt-0.5 ${c}`}>{value}</div>
      {unit && <div className="text-[10.5px] text-[var(--color-text-faint)]">{unit}</div>}
    </div>
  );
}