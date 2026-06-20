import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, ChevronRight, Sparkles, X } from "lucide-react";
import { Page, Section, StatLabel } from "../components/shell/AppShell";
import { CountUp, SkeletonStat } from "../components/shell/motion";
import { EvidenceTrigger } from "../components/forecast/EvidenceDrawer";
import { useStore } from "../lib/store";
import { forecastViewFromState } from "../lib/forecast";
import { canPerform } from "../lib/permissions";

export const Route = createFileRoute("/forecast")({
  head: () => ({ meta: [{ title: "Daily forecast — SurplusSync Plus" }] }),
  component: Forecast,
});

function Forecast() {
  const { state, dispatch } = useStore();
  const f = state.forecast;
  const view = forecastViewFromState(state);
  const loading = state.forecastLoadStatus === "loading";

  return (
    <Page
      kicker="Daily forecast"
      title={view.focusDateLong}
      actions={
        <>
          <EvidenceTrigger />
          <Link
            to="/decision"
            className="text-[12px] px-3 py-1.5 rounded-md border border-[var(--color-line)]"
          >
            Decision Canvas →
          </Link>
        </>
      }
    >
      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-5">
        <div className="space-y-5">
          <Section
            title="Demand forecast"
            hint={`Model ${f.modelVersion} · data quality ${f.dataQuality}`}
          >
            {loading ? (
              <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <SkeletonStat key={i} />
                ))}
              </div>
            ) : (
            <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-4 stagger-fast">
              <Big
                label="Expected attendance"
                value={<CountUp value={f.expectedAttendance} />}
                unit="students"
              />
              <Big label="80% interval" value={view.intervalLabel} unit="students" />
              <Big
                label="Recommended prep"
                value={<CountUp value={f.recommendedPrep} />}
                tone="ai"
                unit="meals"
              />
              <Big
                label="Shortage probability"
                value={<CountUp value={view.shortageProb * 100} decimals={1} suffix="%" />}
              />
              <Big
                label="Preventable surplus"
                value={<CountUp value={f.preventableSurplus} />}
                tone="critical"
                unit="meals"
              />
              <Big
                label="Large-surplus prob"
                value={<CountUp value={f.largeSurplusProb * 100} suffix="%" />}
              />
              <Big label="Safety buffer" value={`+${view.safetyBuffer}`} unit="above 80% upper" />
              <Big label="Max safe reduction" value={`${view.maxSafeReduction}`} unit="meals" />
            </div>
            )}
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
                  <tr
                    key={m.item}
                    className="border-b border-[var(--color-line)] last:border-0 transition-colors hover:bg-[var(--color-surface-2)]"
                  >
                    <td className="px-4 py-2.5 text-[var(--color-text)]">{m.item}</td>
                    <td className="px-4 py-2.5 text-right tnum">{m.recommended}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          <Section title="Actions" hint="The cafeteria manager retains final authority">
            <div className="p-4 flex flex-wrap gap-2">
              {!view.approvedForCurrentRecommendation ? (
                <button
                  disabled={!canPerform(state.role, "APPLY_RECOMMENDATION")}
                  onClick={() => dispatch({ type: "APPLY_RECOMMENDATION" })}
                  className="press text-[12px] px-3 py-2 rounded-md bg-[var(--color-success)] text-white flex items-center gap-1.5 disabled:opacity-40 shadow-[0_4px_14px_-8px_var(--color-success)]"
                >
                  <CheckCircle2 size={12} /> Approve {f.recommendedPrep} meals
                </button>
              ) : (
                <span className="text-[12px] px-3 py-2 rounded-md bg-[var(--color-success-soft)] text-[var(--color-success)] flex items-center gap-1.5">
                  <CheckCircle2 size={12} /> Approved · current plan {state.currentPlan}
                </span>
              )}
              <Link
                to="/decision"
                className="text-[12px] px-3 py-2 rounded-md border border-[var(--color-line)] flex items-center gap-1.5"
              >
                Modify in Decision Canvas <ChevronRight size={12} />
              </Link>
              <button className="text-[12px] px-3 py-2 rounded-md border border-[var(--color-line)] text-[var(--color-critical)] flex items-center gap-1.5">
                <X size={12} /> Reject recommendation
              </button>
              <button
                onClick={() => dispatch({ type: "TOGGLE_AI" })}
                className="text-[12px] px-3 py-2 rounded-md border border-[var(--color-line)]"
              >
                {state.aiMode ? "Switch to manual mode" : "Re-enable AI"}
              </button>
            </div>
          </Section>
        </div>

        <div className="space-y-5">
          <Section
            title="Top influential inputs"
            right={<Sparkles size={13} className="text-[var(--color-ai)]" />}
          >
            <ul className="divide-y divide-[var(--color-line)]">
              {f.influences.map((i) => (
                <li
                  key={i.factor}
                  className="px-4 py-2.5 transition-colors hover:bg-[var(--color-surface-2)]"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${i.direction === "down" ? "bg-[var(--color-critical)]" : "bg-[var(--color-success)]"}`}
                    />
                    <span className="text-[12.5px] text-[var(--color-text)]">{i.factor}</span>
                    <span className="ml-auto tnum text-[11.5px] text-[var(--color-text-soft)]">
                      {i.direction === "down" ? "−" : "+"}
                      {i.magnitude}
                    </span>
                  </div>
                  <div className="text-[10.5px] text-[var(--color-text-faint)] pl-3.5 mt-0.5">
                    {i.note}
                  </div>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Similar historical days">
            <table className="w-full text-[12px]">
              <tbody>
                {f.similarDays.map((d) => (
                  <tr
                    key={d.date}
                    className="border-b border-[var(--color-line)] last:border-0 transition-colors hover:bg-[var(--color-surface-2)]"
                  >
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
                <span className="inline-flex items-center gap-1.5 text-[var(--color-success)]">
                  <CheckCircle2 size={12} /> Trip cancelled — attendance corrected to 540.
                </span>
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

function Big({
  label,
  value,
  unit,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  unit?: string;
  tone?: "ai" | "critical";
}) {
  const c =
    tone === "ai"
      ? "text-[var(--color-ai)]"
      : tone === "critical"
        ? "text-[var(--color-critical)]"
        : "text-[var(--color-text)]";
  return (
    <div className="hover-lift rounded-md border border-[var(--color-line)] p-3">
      <StatLabel>{label}</StatLabel>
      <div className={`font-display text-[20px] font-semibold tnum mt-0.5 ${c}`}>{value}</div>
      {unit && <div className="text-[10.5px] text-[var(--color-text-faint)]">{unit}</div>}
    </div>
  );
}
