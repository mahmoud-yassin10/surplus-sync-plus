import { createFileRoute } from "@tanstack/react-router";
import { Activity, ArrowDownRight, Sparkles } from "lucide-react";
import { Page, Section } from "../components/shell/AppShell";
import { CountUp } from "../components/shell/motion";
import { TiltCard } from "../components/shell/TiltCard";
import { useStore } from "../lib/store";
import {
  forecastViewFromState,
  preventedMealsDerivation,
  preventedMealsDescription,
} from "../lib/forecast";

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
      <div className="grid md:grid-cols-3 gap-4 mb-5 stagger-fast">
        <Ledger
          title="Prevented"
          value={i.preventedMeals}
          sub="meals never prepared"
          tone="ai"
          derivation={preventedMealsDerivation(view)}
          label="Predicted → realized"
        />
        <Ledger
          title="Recovered"
          value={i.recoveredMeals}
          sub="safe meals redistributed"
          tone="success"
          derivation="Confirmed surplus completed pickups"
          label="Observed"
        />
        <Ledger
          title="Nonrecoverable"
          value={i.wastedMeals}
          sub="cannot redistribute"
          tone="critical"
          derivation="Confirmed unsafe or expired food"
          label="Observed"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5 stagger-fast">
        <Small label="Students served" value={<CountUp value={i.studentsServed} />} />
        <Small
          label="Procurement saved"
          value={<CountUp value={Math.round(i.costSaved)} prefix="$" />}
        />
        <Small
          label="Forecast accuracy"
          value={<CountUp value={i.forecastAccuracy * 100} decimals={1} suffix="%" />}
        />
        <Small label="Pickups completed" value={<CountUp value={i.pickupsCompleted} />} />
      </div>

      <Section
        title="How each number is derived"
        hint="The same meal is never counted in more than one category"
      >
        <ul className="divide-y divide-[var(--color-line)]">
          <Row title="Prevented" desc={preventedMealsDescription(view)} />
          <Row
            title="Recovered"
            desc="Meals confirmed safe post-service and successfully picked up by a verified partner with completed distribution."
          />
          <Row
            title="Nonrecoverable"
            desc="Surplus that fails the human-completed eligibility checklist (temperature, packaging, time-on-line, allergen labelling, partner compatibility)."
          />
          <Row
            title="Forecast accuracy"
            desc="Rolling 30-day mean absolute percentage error of attendance prediction. Updated nightly."
          />
        </ul>
      </Section>

      <div className="mt-5 rounded-md border border-[var(--color-warning)]/30 bg-[var(--color-warning-soft)]/40 p-3 text-[11.5px] text-[var(--color-text-soft)] flex gap-2">
        <Sparkles size={13} className="text-[var(--color-warning)] mt-0.5" />
        All numbers above are prototype demonstration data, tracked locally for this session. Reset
        Demo restores the original state.
      </div>
    </Page>
  );
}

function Ledger({
  title,
  value,
  sub,
  tone,
  derivation,
  label,
}: {
  title: string;
  value: number;
  sub: string;
  tone: "ai" | "success" | "critical";
  derivation: string;
  label: string;
}) {
  const c =
    tone === "ai"
      ? "text-[var(--color-ai)]"
      : tone === "success"
        ? "text-[var(--color-success)]"
        : "text-[var(--color-critical)]";
  return (
    <TiltCard className="rounded-lg">
      <div className="rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] p-4 h-full">
        <div className="flex items-center gap-2">
          <Activity size={12} className={c} />
          <span className="text-[11.5px] uppercase tracking-wider text-[var(--color-text-faint)]">
            {title}
          </span>
        </div>
        <div className={`font-display text-[34px] font-semibold tnum mt-1 ${c}`}>
          <CountUp value={value} />
        </div>
        <div className="text-[11.5px] text-[var(--color-text-soft)]">{sub}</div>
        <div className="mt-3 pt-3 border-t border-[var(--color-line)] text-[10.5px] text-[var(--color-text-faint)]">
          <div className="uppercase tracking-wider mb-0.5">{label}</div>
          {derivation}
        </div>
      </div>
    </TiltCard>
  );
}

function Small({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="hover-lift rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] p-3">
      <div className="text-[10.5px] uppercase tracking-wider text-[var(--color-text-faint)]">
        {label}
      </div>
      <div className="font-display text-[20px] font-semibold tnum mt-0.5">{value}</div>
    </div>
  );
}

function Row({ title, desc }: { title: string; desc: string }) {
  return (
    <li className="px-4 py-3 flex gap-3 transition-colors hover:bg-[var(--color-surface-2)]">
      <ArrowDownRight size={13} className="text-[var(--color-text-faint)] mt-0.5 shrink-0" />
      <div>
        <div className="text-[12.5px] font-medium">{title}</div>
        <div className="text-[11.5px] text-[var(--color-text-soft)] mt-0.5">{desc}</div>
      </div>
    </li>
  );
}
