import { createFileRoute } from "@tanstack/react-router";
import { Activity, ArrowDownRight, Sparkles } from "lucide-react";
import { Page, Section } from "../components/shell/AppShell";
import { useStore } from "../lib/store";
import { forecastViewFromState } from "../lib/forecast";

export const Route = createFileRoute("/impact")({
  head: () => ({ meta: [{ title: "Impact ledger — SurplusSync Plus" }] }),
  component: Impact,
});

function Impact() {
  const { state } = useStore();
  const i = state.impact;
  const view = forecastViewFromState(state);

  return (
    <Page kicker="Impact ledger" title="Prevented · recovered · wasted">
      <div className="grid md:grid-cols-3 gap-4 mb-5">
        <Ledger title="Prevented" value={i.preventedMeals} sub="meals never prepared" tone="ai" derivation={`${view.baselinePrep} baseline − approved AI recommendation (${view.recommendedPrep} meals)`} label="Predicted → realized" />
        <Ledger title="Recovered" value={i.recoveredMeals} sub="safe meals redistributed" tone="success" derivation="Confirmed surplus completed pickups" label="Observed" />
        <Ledger title="Nonrecoverable" value={i.wastedMeals} sub="cannot redistribute" tone="critical" derivation="Confirmed unsafe or expired food" label="Observed" />
      </div>

      <div className="grid md:grid-cols-4 gap-4 mb-5">
        <Small label="Students served" value={i.studentsServed.toString()} />
        <Small label="Procurement saved" value={`$${Math.round(i.costSaved)}`} />
        <Small label="Forecast accuracy" value={`${(i.forecastAccuracy * 100).toFixed(1)}%`} />
        <Small label="Pickups completed" value={i.pickupsCompleted.toString()} />
      </div>

      <Section title="How each number is derived" hint="The same meal is never counted in more than one category">
        <ul className="divide-y divide-[var(--color-line)]">
          <Row title="Prevented" desc={`Difference between the baseline ${view.baselinePrep}-meal plan and the approved AI recommendation (${view.recommendedPrep} meals). Counted only when a human approves a reduced plan before service.`} />
          <Row title="Recovered" desc="Meals confirmed safe post-service and successfully picked up by a verified partner with completed distribution." />
          <Row title="Nonrecoverable" desc="Surplus that fails the human-completed eligibility checklist (temperature, packaging, time-on-line, allergen labelling, partner compatibility)." />
          <Row title="Forecast accuracy" desc="Rolling 30-day mean absolute percentage error of attendance prediction. Updated nightly." />
        </ul>
      </Section>

      <div className="mt-5 rounded-md border border-[var(--color-warning)]/30 bg-[var(--color-warning-soft)]/40 p-3 text-[11.5px] text-[var(--color-text-soft)] flex gap-2">
        <Sparkles size={13} className="text-[var(--color-warning)] mt-0.5" />
        All numbers above are prototype demonstration data, tracked locally for this session. Reset Demo restores the original state.
      </div>
    </Page>
  );
}

function Ledger({ title, value, sub, tone, derivation, label }: { title: string; value: number; sub: string; tone: "ai" | "success" | "critical"; derivation: string; label: string }) {
  const c = tone === "ai" ? "text-[var(--color-ai)]" : tone === "success" ? "text-[var(--color-success)]" : "text-[var(--color-critical)]";
  return (
    <div className="rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
      <div className="flex items-center gap-2">
        <Activity size={12} className={c} />
        <span className="text-[11.5px] uppercase tracking-wider text-[var(--color-text-faint)]">{title}</span>
      </div>
      <div className={`text-[34px] font-semibold tnum mt-1 ${c}`}>{value}</div>
      <div className="text-[11.5px] text-[var(--color-text-soft)]">{sub}</div>
      <div className="mt-3 pt-3 border-t border-[var(--color-line)] text-[10.5px] text-[var(--color-text-faint)]">
        <div className="uppercase tracking-wider mb-0.5">{label}</div>
        {derivation}
      </div>
    </div>
  );
}

function Small({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] p-3">
      <div className="text-[10.5px] uppercase tracking-wider text-[var(--color-text-faint)]">{label}</div>
      <div className="text-[20px] font-semibold tnum mt-0.5">{value}</div>
    </div>
  );
}

function Row({ title, desc }: { title: string; desc: string }) {
  return (
    <li className="px-4 py-3 flex gap-3">
      <ArrowDownRight size={13} className="text-[var(--color-text-faint)] mt-0.5 shrink-0" />
      <div>
        <div className="text-[12.5px] font-medium">{title}</div>
        <div className="text-[11.5px] text-[var(--color-text-soft)] mt-0.5">{desc}</div>
      </div>
    </li>
  );
}