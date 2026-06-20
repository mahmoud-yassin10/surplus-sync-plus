import { createFileRoute } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { Map as MapIcon, Network, Send, Snowflake, Truck } from "lucide-react";
import { Page, Section } from "../components/shell/AppShell";
import { NetworkMap } from "../components/recovery/NetworkMap";
import { RecoveryGeoMap } from "../components/recovery/RecoveryGeoMap";
import { useStore } from "../lib/store";

export const Route = createFileRoute("/recovery")({
  head: () => ({ meta: [{ title: "Recovery network — SurplusSync Plus" }] }),
  component: Recovery,
});

function Recovery() {
  const { state, dispatch } = useStore();
  const [selected, setSelected] = useState<string | undefined>("p1");
  const [mapMode, setMapMode] = useState<"live" | "schematic">("live");
  const partner = state.partners.find((p) => p.id === selected);
  const alertsSent = state.messages.filter((m) => m.kind === "alert").length;

  return (
    <Page
      kicker="Recovery network"
      title="Partner readiness · 5 organizations"
      actions={
        <button
          onClick={() => dispatch({ type: "SEND_PROVISIONAL_ALERTS" })}
          disabled={alertsSent > 0}
          className="press text-[12px] px-3 py-1.5 rounded-md bg-[var(--color-ai)] text-white flex items-center gap-1.5 disabled:opacity-50 shadow-[0_4px_14px_-8px_var(--color-ai)]"
        >
          <Send size={12} />{" "}
          {alertsSent > 0 ? "Provisional alerts sent" : "Send provisional alerts"}
        </button>
      }
    >
      <div className="grid lg:grid-cols-[1.5fr_1fr] gap-5">
        <Section
          title="Operational map"
          hint="Live Chicago network · flowing arcs trace active recovery routes"
          right={
            <div className="flex items-center gap-0.5 rounded-md border border-[var(--color-line)] p-0.5 bg-[var(--color-surface-2)]">
              <ModeBtn
                active={mapMode === "live"}
                onClick={() => setMapMode("live")}
                icon={<MapIcon size={12} />}
                label="Live"
              />
              <ModeBtn
                active={mapMode === "schematic"}
                onClick={() => setMapMode("schematic")}
                icon={<Network size={12} />}
                label="Schematic"
              />
            </div>
          }
        >
          <div className="p-4">
            {mapMode === "live" ? (
              <RecoveryGeoMap onSelect={setSelected} selectedId={selected} />
            ) : (
              <NetworkMap onSelect={setSelected} selectedId={selected} />
            )}
          </div>
        </Section>

        <Section title={partner?.name ?? "Select a partner"}>
          {partner && (
            <div className="p-4 space-y-3 text-[12.5px]">
              <div className="flex items-center gap-2 text-[var(--color-text-soft)]">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${partner.status === "available" ? "bg-[var(--color-success)]" : partner.status === "limited" ? "bg-[var(--color-warning)]" : "bg-[var(--color-text-faint)]"}`}
                />
                <span className="capitalize">{partner.status}</span>
                <span className="ml-auto text-[var(--color-text-faint)]">
                  {partner.distanceMi} mi
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 stagger-fast">
                <Cell label="Capacity" value={`${partner.capacity} meals`} />
                <Cell label="Pickup window" value={`${partner.windowStart}–${partner.windowEnd}`} />
                <Cell
                  label="Refrigerated"
                  value={partner.refrigerated ? "Yes" : "No"}
                  icon={<Snowflake size={11} />}
                />
                <Cell
                  label="Own vehicle"
                  value={partner.vehicle ? "Yes" : "No"}
                  icon={<Truck size={11} />}
                />
              </div>
              <div className="rounded-md bg-[var(--color-surface-2)] p-3 text-[11.5px]">
                <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-faint)] mb-1">
                  Accepts
                </div>
                {partner.accepts.join(" · ")}
              </div>
              {partner.notes && (
                <p className="text-[11.5px] text-[var(--color-text-soft)]">{partner.notes}</p>
              )}
              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  onClick={() =>
                    dispatch({
                      type: "PARTNER_RESERVE",
                      partnerId: partner.id,
                      meals: Math.min(95, partner.capacity),
                    })
                  }
                  className="press text-[12px] px-3 py-2 rounded-md bg-[var(--color-ink)] text-white"
                >
                  Reserve tentative capacity
                </button>
                <button
                  onClick={() => dispatch({ type: "PARTNER_DECLINE", partnerId: partner.id })}
                  className="press text-[12px] px-3 py-2 rounded-md border border-[var(--color-line)] hover:bg-[var(--color-surface-2)]"
                >
                  Mark unavailable
                </button>
              </div>
            </div>
          )}
        </Section>

        <div className="lg:col-span-2">
          <Section title="Partner roster" hint="Filter by availability and compatibility">
            <div className="overflow-x-auto">
              <table className="w-full text-[12.5px] min-w-[640px]">
                <thead className="text-[var(--color-text-faint)] uppercase text-[9.5px] tracking-wider border-b border-[var(--color-line)]">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">Partner</th>
                    <th className="text-left px-4 py-2 font-medium">Status</th>
                    <th className="text-right px-4 py-2 font-medium">Capacity</th>
                    <th className="text-left px-4 py-2 font-medium">Window</th>
                    <th className="text-left px-4 py-2 font-medium">Accepts</th>
                    <th className="text-left px-4 py-2 font-medium">Transport</th>
                  </tr>
                </thead>
                <tbody>
                  {state.partners.map((p) => (
                    <tr
                      key={p.id}
                      className={`border-b border-[var(--color-line)] last:border-0 cursor-pointer hover:bg-[var(--color-surface-2)]/40 ${selected === p.id ? "bg-[var(--color-ai-soft)]/30" : ""}`}
                      onClick={() => setSelected(p.id)}
                    >
                      <td className="px-4 py-2.5 text-[var(--color-text)]">{p.name}</td>
                      <td className="px-4 py-2.5">
                        <StatusPill status={p.status} />
                      </td>
                      <td className="px-4 py-2.5 text-right tnum">{p.capacity}</td>
                      <td className="px-4 py-2.5 tnum text-[var(--color-text-soft)]">
                        {p.windowStart}–{p.windowEnd}
                      </td>
                      <td className="px-4 py-2.5 text-[var(--color-text-soft)]">
                        {p.accepts.join(", ")}
                      </td>
                      <td className="px-4 py-2.5 text-[var(--color-text-soft)]">
                        {[p.refrigerated && "refrigerated", p.vehicle && "vehicle"]
                          .filter(Boolean)
                          .join(", ") || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        </div>
      </div>
    </Page>
  );
}

function ModeBtn({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`press flex items-center gap-1 text-[11px] px-2 py-1 rounded transition-colors ${
        active
          ? "bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm"
          : "text-[var(--color-text-faint)] hover:text-[var(--color-text-soft)]"
      }`}
    >
      {icon} {label}
    </button>
  );
}

function Cell({ label, value, icon }: { label: string; value: string; icon?: any }) {
  return (
    <div className="hover-lift rounded border border-[var(--color-line)] p-2.5">
      <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-faint)] flex items-center gap-1">
        {icon}
        {label}
      </div>
      <div className="text-[13px] mt-0.5 font-medium">{value}</div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    available: "bg-[var(--color-success-soft)] text-[var(--color-success)]",
    limited: "bg-[var(--color-warning-soft)] text-[var(--color-warning)]",
    unavailable: "bg-[var(--color-surface-2)] text-[var(--color-text-faint)]",
    closed: "bg-[var(--color-surface-2)] text-[var(--color-text-faint)]",
  };
  return <span className={`text-[10.5px] px-1.5 py-0.5 rounded ${map[status]}`}>{status}</span>;
}
