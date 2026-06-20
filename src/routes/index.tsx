import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, CheckCircle2, Clock, Sparkles, TriangleAlert } from "lucide-react";
import { Page, RiskPill, Section, StatLabel, StatValue } from "../components/shell/AppShell";
import { HorizonRibbon } from "../components/forecast/HorizonRibbon";
import { EvidenceTrigger } from "../components/forecast/EvidenceDrawer";
import { useStore } from "../lib/store";
import { forecastViewFromState, syncHorizonFocusDay } from "../lib/forecast";
import { HORIZON_DAYS } from "../lib/mock";
import { canPerform } from "../lib/permissions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Command Center — SurplusSync Plus" },
      {
        name: "description",
        content: "Operational meal forecasting and food-waste prevention for school cafeterias.",
      },
    ],
  }),
  component: CommandCenter,
});

function CommandCenter() {
  const { state, dispatch } = useStore();
  const view = forecastViewFromState(state);
  const f = state.forecast;
  const horizon = syncHorizonFocusDay(HORIZON_DAYS, f, state.currentPlan);

  return (
    <Page
      kicker="School Command Center"
      title={`${view.focusDateShort} is a high-risk surplus event`}
    >
      {/* Operational strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-5">
        <Strip
          label="Risk"
          value={<RiskPill level={f.risk} />}
          note="Preventable surplus > 100 meals"
        />
        <Strip
          label="Current plan"
          value={<span className="tnum text-[18px] font-semibold">{state.currentPlan}</span>}
          note="meals prepared"
        />
        <Strip
          label="AI recommendation"
          value={
            <span className="tnum text-[18px] font-semibold text-[var(--color-ai)]">
              {f.recommendedPrep}
            </span>
          }
          note={
            view.approvedForCurrentRecommendation
              ? "Approved"
              : `${view.planDelta > 0 ? `−${view.planDelta}` : `+${-view.planDelta}`} from plan`
          }
        />
        <Strip
          label="Shortage probability"
          value={
            <span className="tnum text-[18px] font-semibold">
              {(view.shortageProb * 100).toFixed(1)}%
            </span>
          }
          note="80% interval respected"
        />
        <Strip
          label="Last forecast"
          value={<span className="text-[13px] font-medium">06:02 today</span>}
          note={`Model ${f.modelVersion}`}
        />
      </div>

      {/* Forecast Horizon */}
      <div className="mb-5">
        <Section
          title="Forecast horizon"
          hint="Click a day to inspect its event signals"
          right={<EvidenceTrigger />}
        >
          <HorizonRibbon selected={f.date} horizonDays={horizon} />
        </Section>
      </div>

      <div className="grid lg:grid-cols-[1.5fr_1fr] gap-5">
        {/* Left: event stack + plan comparison */}
        <div className="space-y-5">
          <Section
            title={`${view.focusDateShort} — event signal stack`}
            hint={`Inputs the model used to predict ${f.expectedAttendance} students (interval ${view.intervalLabel})`}
          >
            <ul className="divide-y divide-[var(--color-line)]">
              {f.influences.map((i) => (
                <li
                  key={i.factor}
                  className="px-4 py-3 grid grid-cols-[20px_1fr_auto] gap-3 items-center"
                >
                  <span
                    className={`h-2 w-2 rounded-full ${i.direction === "down" ? "bg-[var(--color-critical)]" : "bg-[var(--color-success)]"}`}
                  />
                  <div>
                    <div className="text-[12.5px] text-[var(--color-text)]">{i.factor}</div>
                    <div className="text-[11px] text-[var(--color-text-faint)]">{i.note}</div>
                  </div>
                  <span className="tnum text-[11.5px] text-[var(--color-text-soft)]">
                    {i.direction === "down" ? "−" : "+"}
                    {i.magnitude}
                  </span>
                </li>
              ))}
            </ul>
          </Section>

          <Section
            title="Current plan vs AI recommendation"
            hint="Uncertainty shown as the 80% prediction interval"
          >
            <div className="p-5">
              <PlanComparison
                expected={f.expectedAttendance}
                low={f.intervalLow}
                high={f.intervalHigh}
                current={state.currentPlan}
                recommended={f.recommendedPrep}
                safetyBuffer={view.safetyBuffer}
              />
              <div className="mt-5 flex flex-wrap gap-2">
                <Link
                  to="/decision"
                  className="text-[12px] px-3 py-2 rounded-md bg-[var(--color-ink)] text-white"
                >
                  Open Decision Canvas
                </Link>
                {!view.approvedForCurrentRecommendation && (
                  <button
                    disabled={!canPerform(state.role, "APPLY_RECOMMENDATION")}
                    onClick={() => dispatch({ type: "APPLY_RECOMMENDATION" })}
                    className="text-[12px] px-3 py-2 rounded-md bg-[var(--color-ai)] text-white flex items-center gap-1.5 disabled:opacity-40"
                  >
                    <Sparkles size={12} /> Apply AI recommendation
                  </button>
                )}
                {view.approvedForCurrentRecommendation && (
                  <span className="text-[12px] px-3 py-2 rounded-md bg-[var(--color-success-soft)] text-[var(--color-success)] flex items-center gap-1.5">
                    <CheckCircle2 size={12} /> Recommendation approved by Maya
                  </span>
                )}
                <Link
                  to="/forecast"
                  className="text-[12px] px-3 py-2 rounded-md border border-[var(--color-line)]"
                >
                  Full daily forecast →
                </Link>
              </div>
            </div>
          </Section>

          <Section title="Menu-level forecast" hint="Recommended portions per item">
            <ul className="divide-y divide-[var(--color-line)]">
              {f.menu.map((m) => (
                <li key={m.item} className="px-4 py-2.5 flex items-center">
                  <span className="text-[12.5px] text-[var(--color-text)]">{m.item}</span>
                  <div className="ml-auto flex items-center gap-3">
                    <div className="w-32 h-1 rounded-full bg-[var(--color-line)] hidden sm:block">
                      <div
                        className="h-1 rounded-full bg-[var(--color-ai)]"
                        style={{ width: `${(m.recommended / 600) * 100}%` }}
                      />
                    </div>
                    <span className="tnum text-[12.5px] font-medium w-12 text-right">
                      {m.recommended}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </Section>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          <Section
            title="Partner readiness"
            hint="Capacity ready before surplus is confirmed"
            right={
              <Link
                to="/recovery"
                className="text-[11.5px] text-[var(--color-ai)] inline-flex items-center gap-0.5"
              >
                Open <ArrowUpRight size={11} />
              </Link>
            }
          >
            <ul className="divide-y divide-[var(--color-line)]">
              {state.partners.slice(0, 4).map((p) => {
                const match = state.matches.find((m) => m.partnerId === p.id);
                return (
                  <li key={p.id} className="px-4 py-2.5 flex items-center gap-2">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${p.status === "available" ? "bg-[var(--color-success)]" : p.status === "limited" ? "bg-[var(--color-warning)]" : "bg-[var(--color-text-faint)]"}`}
                    />
                    <div className="min-w-0">
                      <div className="text-[12.5px] truncate text-[var(--color-text)]">
                        {p.name}
                      </div>
                      <div className="text-[10.5px] text-[var(--color-text-faint)] tnum">
                        {p.capacity} meals · {p.distanceMi}mi · {p.windowStart}–{p.windowEnd}
                      </div>
                    </div>
                    <span className="ml-auto text-[10.5px]">
                      {match?.state === "reserved" && (
                        <span className="px-1.5 py-0.5 rounded bg-[var(--color-ai-soft)] text-[var(--color-ai)]">
                          Reserved {match.reservedMeals}
                        </span>
                      )}
                      {match?.state === "confirmed" && (
                        <span className="px-1.5 py-0.5 rounded bg-[var(--color-success-soft)] text-[var(--color-success)]">
                          Confirmed
                        </span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          </Section>

          <Section
            title="Copilot insight"
            right={<Sparkles size={13} className="text-[var(--color-ai)]" />}
          >
            <div className="p-4 text-[12.5px] text-[var(--color-text-soft)] leading-relaxed">
              <p>
                Reducing Thursday preparation from{" "}
                <span className="text-[var(--color-text)] tnum">
                  {view.baselinePrep} → {view.recommendedPrep}
                </span>{" "}
                meals respects the safety floor of {view.safetyFloor} and prevents an estimated{" "}
                <span className="text-[var(--color-critical)] tnum">
                  {view.preventableSurplus} meals
                </span>{" "}
                of overproduction.
              </p>
              <p className="mt-2">
                Three available partners can absorb 60–95 packaged meals if any safe surplus remains
                after service.
              </p>
              <div className="mt-3 flex gap-2">
                <EvidenceTrigger />
                <Link
                  to="/forecast"
                  className="text-[12px] px-3 py-1.5 rounded-md border border-[var(--color-line)]"
                >
                  Ask Copilot
                </Link>
              </div>
            </div>
          </Section>

          <Section
            title="Impact ledger"
            hint="Numbers stay separated — prototype data"
            right={
              <Link
                to="/impact"
                className="text-[11.5px] text-[var(--color-ai)] inline-flex items-center gap-0.5"
              >
                Open <ArrowUpRight size={11} />
              </Link>
            }
          >
            <div className="p-4 grid grid-cols-2 gap-3">
              <Ledger
                label="Prevented"
                value={state.impact.preventedMeals}
                tone="ai"
                sub="meals not prepared"
              />
              <Ledger
                label="Recovered"
                value={state.impact.recoveredMeals}
                tone="success"
                sub="safe untouched"
              />
              <Ledger
                label="Nonrecoverable"
                value={state.impact.wastedMeals}
                tone="critical"
                sub="cannot redistribute"
              />
              <Ledger
                label="Cost saved"
                value={`$${Math.round(state.impact.costSaved)}`}
                sub="procurement avoided"
              />
            </div>
          </Section>

          <Section title="Recent activity">
            <ul className="divide-y divide-[var(--color-line)] text-[12px]">
              {state.audit.slice(0, 4).map((a) => (
                <li key={a.id} className="px-4 py-2.5 flex items-start gap-2">
                  <Clock size={11} className="text-[var(--color-text-faint)] mt-0.5" />
                  <div className="min-w-0">
                    <div className="text-[var(--color-text)] truncate">{a.action}</div>
                    <div className="text-[10.5px] text-[var(--color-text-faint)]">
                      {a.actor} · {a.actorType}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </Section>
        </div>
      </div>
    </Page>
  );
}

function Strip({ label, value, note }: { label: string; value: React.ReactNode; note: string }) {
  return (
    <div className="rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2.5">
      <StatLabel>{label}</StatLabel>
      <div className="mt-1.5">{value}</div>
      <div className="text-[10.5px] text-[var(--color-text-faint)] mt-1">{note}</div>
    </div>
  );
}

function Ledger({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: any;
  sub: string;
  tone?: "ai" | "success" | "critical";
}) {
  const c =
    tone === "ai"
      ? "text-[var(--color-ai)]"
      : tone === "success"
        ? "text-[var(--color-success)]"
        : tone === "critical"
          ? "text-[var(--color-critical)]"
          : "text-[var(--color-text)]";
  return (
    <div className="rounded-md border border-[var(--color-line)] p-3">
      <StatLabel>{label}</StatLabel>
      <div className={`text-[20px] font-semibold tnum mt-0.5 ${c}`}>{value}</div>
      <div className="text-[10.5px] text-[var(--color-text-faint)]">{sub}</div>
    </div>
  );
}

function PlanComparison({
  expected,
  low,
  high,
  current,
  recommended,
  safetyBuffer,
}: {
  expected: number;
  low: number;
  high: number;
  current: number;
  recommended: number;
  safetyBuffer: number;
}) {
  const min = 450,
    max = 800;
  const pct = (v: number) => `${((v - min) / (max - min)) * 100}%`;
  return (
    <div>
      <div className="relative h-14">
        <div className="absolute inset-y-6 left-0 right-0 h-2 rounded-full bg-[var(--color-line)]" />
        <div
          className="absolute inset-y-6 h-2 rounded-full bg-[var(--color-ai-soft)]"
          style={{ left: pct(low), width: `calc(${pct(high)} - ${pct(low)})` }}
        />

        <Marker pos={pct(expected)} color="var(--color-ai)" top label={`${expected} expected`} />
        <Marker
          pos={pct(current)}
          color="var(--color-critical)"
          bottom
          label={`${current} current plan`}
        />
        <Marker
          pos={pct(recommended)}
          color="var(--color-success)"
          bottom
          label={`${recommended} recommended`}
        />
      </div>
      <div className="mt-2 flex justify-between text-[10.5px] text-[var(--color-text-faint)] tnum">
        <span>{min}</span>
        <span>540 safety floor</span>
        <span>{max}</span>
      </div>
      <div className="mt-3 flex items-start gap-2 text-[11.5px] text-[var(--color-text-soft)]">
        <TriangleAlert size={13} className="text-[var(--color-warning)] mt-0.5 shrink-0" />
        <span>
          The 80% interval is the plausible attendance range. The recommendation sits {safetyBuffer}{" "}
          meals above the upper bound for safety.
        </span>
      </div>
    </div>
  );
}

function Marker({
  pos,
  color,
  label,
  top,
  bottom,
}: {
  pos: string;
  color: string;
  label: string;
  top?: boolean;
  bottom?: boolean;
}) {
  return (
    <div
      className="absolute"
      style={{
        left: pos,
        transform: "translateX(-50%)",
        top: top ? 0 : undefined,
        bottom: bottom ? 0 : undefined,
      }}
    >
      <div className="w-px h-7 mx-auto" style={{ background: color }} />
      <div className="text-[10px] whitespace-nowrap tnum text-center" style={{ color }}>
        {label}
      </div>
    </div>
  );
}
