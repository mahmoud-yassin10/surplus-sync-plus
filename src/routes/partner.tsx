import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Snowflake, Truck } from "lucide-react";
import { Page, Section } from "../components/shell/AppShell";
import { useStore } from "../lib/store";

export const Route = createFileRoute("/partner")({
  head: () => ({ meta: [{ title: "Partner portal — SurplusSync Plus" }] }),
  component: Partner,
});

function Partner() {
  const { state, dispatch } = useStore();
  const me = state.partners[0]; // assume Metro Community Food Bank perspective
  const alerts = state.messages.filter((m) => m.kind === "alert" && m.threadId === `t-${me.id}`);
  const match = state.matches.find((m) => m.partnerId === me.id);

  return (
    <Page kicker="Recovery partner portal" title={me.name}>
      <div className="grid lg:grid-cols-3 gap-5">
        <Section title="Capacity today">
          <div className="p-4 space-y-2.5 text-[12.5px]">
            <Row label="Total capacity" value={`${me.capacity} meals`} />
            <Row label="Reserved" value={`${match?.reservedMeals ?? 0} meals`} tone="ai" />
            <Row label="Refrigerated" value={me.refrigerated ? "Yes" : "No"} icon={<Snowflake size={11} />} />
            <Row label="Vehicle" value="Refrigerated van · 2 drivers" icon={<Truck size={11} />} />
            <Row label="Window" value={`${me.windowStart}–${me.windowEnd}`} />
          </div>
        </Section>

        <div className="lg:col-span-2 space-y-5">
          <Section title="Potential alerts" hint="Provisional — not yet confirmed donations">
            {alerts.length === 0 ? (
              <div className="p-8 text-center text-[12.5px] text-[var(--color-text-faint)]">No new alerts.</div>
            ) : (
              <ul className="divide-y divide-[var(--color-line)]">
                {alerts.map((a) => (
                  <li key={a.id} className="px-4 py-3">
                    <div className="text-[12.5px]">{a.body}</div>
                    <div className="text-[10.5px] text-[var(--color-text-faint)] mt-1 tnum">{new Date(a.ts).toLocaleString()}</div>
                    {!match && (
                      <div className="mt-2 flex gap-2">
                        <button onClick={() => dispatch({ type: "PARTNER_RESERVE", partnerId: me.id, meals: 95 })} className="text-[11.5px] px-2.5 py-1.5 rounded-md bg-[var(--color-success)] text-white flex items-center gap-1"><CheckCircle2 size={11} /> Reserve up to 95 meals</button>
                        <button onClick={() => dispatch({ type: "PARTNER_DECLINE", partnerId: me.id })} className="text-[11.5px] px-2.5 py-1.5 rounded-md border border-[var(--color-line)]">Decline</button>
                      </div>
                    )}
                    {match && <div className="mt-2 text-[11.5px] text-[var(--color-success)]">Reserved {match.reservedMeals} meals</div>}
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Confirmed requests">
            {state.pickups.length === 0 ? (
              <div className="p-8 text-center text-[12.5px] text-[var(--color-text-faint)]">No confirmed requests yet.</div>
            ) : (
              <ul className="divide-y divide-[var(--color-line)]">
                {state.pickups.map((p) => (
                  <li key={p.id} className="px-4 py-3 flex items-center gap-3">
                    <Truck size={14} className="text-[var(--color-ai)]" />
                    <div>
                      <div className="text-[12.5px] font-medium">{p.meals} meals · ETA {p.eta}</div>
                      <div className="text-[10.5px] text-[var(--color-text-faint)]">{p.status.replace(/-/g, " ")}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      </div>
    </Page>
  );
}

function Row({ label, value, tone, icon }: { label: string; value: string; tone?: "ai"; icon?: any }) {
  const c = tone === "ai" ? "text-[var(--color-ai)]" : "text-[var(--color-text)]";
  return (
    <div className="flex items-center justify-between">
      <span className="text-[var(--color-text-soft)] flex items-center gap-1.5">{icon}{label}</span>
      <span className={`font-medium tnum ${c}`}>{value}</span>
    </div>
  );
}