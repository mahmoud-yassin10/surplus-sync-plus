import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronRight, ShieldAlert, Truck } from "lucide-react";
import { Page, Section } from "../components/shell/AppShell";
import { ApprovalGate } from "../components/approval/ApprovalGate";
import { useStore } from "../lib/store";
import { canPerform } from "../lib/permissions";
import type { PickupStatus } from "../lib/types";

export const Route = createFileRoute("/pickups")({
  head: () => ({ meta: [{ title: "Pickups — SurplusSync Plus" }] }),
  component: Pickups,
});

const STAGES: { id: PickupStatus; label: string }[] = [
  { id: "alert-sent", label: "Alert sent" },
  { id: "capacity-reserved", label: "Capacity reserved" },
  { id: "surplus-confirmed", label: "Surplus confirmed" },
  { id: "partner-selected", label: "Partner selected" },
  { id: "driver-assigned", label: "Driver assigned" },
  { id: "en-route", label: "En route" },
  { id: "arrived", label: "Arrived" },
  { id: "collected", label: "Collected" },
  { id: "delivered", label: "Delivered" },
  { id: "distribution-confirmed", label: "Distribution confirmed" },
];

const CHECKLIST = [
  "All meals untouched",
  "Packaging intact and acceptable",
  "Preparation time recorded",
  "Holding temperature documented",
  "Allergens listed on package",
  "Partner accepts category",
  "Pickup deadline within safe window",
];

function nextStage(s: PickupStatus): PickupStatus | null {
  const i = STAGES.findIndex((x) => x.id === s);
  return i >= 0 && i < STAGES.length - 1 ? STAGES[i + 1].id : null;
}

function Pickups() {
  const { state, dispatch } = useStore();
  const [surplus, setSurplus] = useState(64);
  const [checks, setChecks] = useState<Set<string>>(new Set());
  const pickup = state.pickups[0];
  const partner = pickup ? state.partners.find((p) => p.id === pickup.partnerId) : null;
  const canManage = canPerform(state.role, "CONFIRM_SURPLUS");
  const canAssign = canPerform(state.role, "SELECT_PARTNER");
  const canOverride = canPerform(state.role, "OVERRIDE_PARTNER");
  const canAdvance = canPerform(state.role, "ADVANCE_PICKUP");
  const checklistDone = state.checklistComplete || checks.size === CHECKLIST.length;

  return (
    <Page kicker="Pickups & confirmation" title="Same-day surplus confirmation">
      <div className="grid lg:grid-cols-[1fr_1fr] gap-5">
        <Section
          title="Confirm safe surplus"
          hint="After service · qualified human must complete the eligibility checklist"
        >
          <div className="p-4 space-y-4">
            <div className="rounded-md border border-[var(--color-critical)]/30 bg-[var(--color-critical-soft)]/40 p-3 text-[11.5px] text-[var(--color-critical)] flex gap-2">
              <ShieldAlert size={14} className="mt-0.5 shrink-0" />
              <span>
                The AI does not certify food safety. A qualified human must complete and approve
                this checklist before any surplus is routed.
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-[12px] stagger-fast">
              <Field label="Actual attendance" value="541" />
              <Field label="Meals served" value="498" />
              <Field
                label="Untouched packaged"
                value={`${surplus}`}
                editable
                onChange={setSurplus}
              />
              <Field label="Category" value="Packaged" />
              <Field label="Prepared at" value="10:42" />
              <Field label="Holding temp" value="< 40°F" />
              <Field label="Pickup deadline" value="15:30" />
            </div>

            <div>
              <div className="text-[10.5px] uppercase tracking-wider text-[var(--color-text-faint)] mb-2">
                Recovery eligibility checklist
              </div>
              <ul className="space-y-1.5">
                {CHECKLIST.map((c) => {
                  const done = state.checklistComplete || checks.has(c);
                  return (
                    <li key={c}>
                      <label className="flex items-start gap-2 text-[12px] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={done}
                          disabled={state.checklistComplete}
                          onChange={(e) => {
                            const next = new Set(checks);
                            if (e.target.checked) next.add(c);
                            else next.delete(c);
                            setChecks(next);
                          }}
                          className="mt-0.5 accent-[var(--color-success)]"
                        />
                        <span
                          className={
                            done ? "text-[var(--color-text)]" : "text-[var(--color-text-soft)]"
                          }
                        >
                          {c}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="flex gap-2 flex-wrap">
              <button
                disabled={!canManage || state.surplusConfirmed != null}
                onClick={() => dispatch({ type: "CONFIRM_SURPLUS", meals: surplus })}
                className="press text-[12px] px-3 py-2 rounded-md bg-[var(--color-success)] text-white disabled:opacity-40 flex items-center gap-1.5"
              >
                <CheckCircle2 size={12} /> Confirm {surplus} recoverable meals
              </button>
              <button
                disabled={!canManage || state.checklistComplete || !checklistDone}
                onClick={() => dispatch({ type: "COMPLETE_CHECKLIST" })}
                className="press text-[12px] px-3 py-2 rounded-md border border-[var(--color-line)] hover:bg-[var(--color-surface-2)] disabled:opacity-40"
              >
                Complete checklist
              </button>
              {state.checklistComplete && state.surplusConfirmed != null && !pickup && (
                <button
                  disabled={!canAssign}
                  onClick={() =>
                    dispatch({
                      type: "SELECT_PARTNER",
                      partnerId: "p1",
                      meals: state.surplusConfirmed!,
                    })
                  }
                  className="press text-[12px] px-3 py-2 rounded-md bg-[var(--color-ink)] text-white disabled:opacity-40"
                >
                  Assign Metro Community Food Bank
                </button>
              )}
            </div>
          </div>
        </Section>

        <Section title="Partner ranking" hint="AI proposes; human can override">
          <div className="p-4 space-y-3 stagger-fast">
            <PartnerRow
              rank={1}
              name="Metro Community Food Bank"
              reason="Refrigerated van · 18 min response · 120 cap"
              picked={!!pickup && pickup.partnerId === "p1"}
            />
            <PartnerRow
              rank={2}
              name="Neighborhood Community Kitchen"
              reason="Higher capacity but 42 min response"
              picked={!!pickup && pickup.partnerId === "p3"}
            />
            <PartnerRow
              rank={3}
              name="Harbor Family Shelter"
              reason="No vehicle — requires school delivery"
            />

            {state.surplusConfirmed != null && pickup && (
              <ApprovalGate
                title="Override AI partner ranking?"
                who="Cafeteria Manager"
                before="AI top choice: Metro Community Food Bank"
                after="Override to Neighborhood Community Kitchen"
                consequences={`Routes ${pickup.meals} meals to a partner with a longer pickup window but higher capacity for surplus growth.`}
                reversible
                status={pickup.partnerId === "p3" ? "approved" : "pending"}
                allowed={canOverride && state.checklistComplete}
                onApprove={() =>
                  dispatch({
                    type: "OVERRIDE_PARTNER",
                    partnerId: "p3",
                    previousId: pickup.partnerId,
                    reason: "Larger absorber, longer holding capacity",
                  })
                }
              />
            )}
          </div>
        </Section>

        <div className="lg:col-span-2">
          <Section
            title="Pickup timeline"
            hint={
              pickup
                ? `${partner?.name} · ${pickup.meals} meals · ETA ${pickup.eta}`
                : "No active pickup yet"
            }
          >
            <div className="p-5">
              {!pickup ? (
                <div className="text-center py-10 text-[12.5px] text-[var(--color-text-faint)]">
                  <Truck size={20} className="mx-auto mb-2 opacity-50" />
                  Confirm safe surplus and complete checklist to create a pickup.
                </div>
              ) : (
                <Timeline
                  status={pickup.status}
                  onAdvance={() => {
                    const ns = nextStage(pickup.status);
                    if (ns) dispatch({ type: "ADVANCE_PICKUP", pickupId: pickup.id, status: ns });
                  }}
                  canAdvance={canAdvance}
                />
              )}
            </div>
          </Section>
        </div>
      </div>
    </Page>
  );
}

function Field({
  label,
  value,
  editable,
  onChange,
}: {
  label: string;
  value: string;
  editable?: boolean;
  onChange?: (n: number) => void;
}) {
  return (
    <div className={`hover-lift rounded border p-2.5 ${editable ? "border-[var(--color-ai)]/40 bg-[var(--color-ai-soft)]/20" : "border-[var(--color-line)]"}`}>
      <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-faint)]">
        {label}
      </div>
      {editable ? (
        <input
          type="number"
          value={value}
          onChange={(e) => onChange?.(Number(e.target.value))}
          className="text-[14px] tnum font-medium bg-transparent outline-none w-full mt-0.5"
        />
      ) : (
        <div className="text-[14px] tnum font-medium mt-0.5">{value}</div>
      )}
    </div>
  );
}

function PartnerRow({
  rank,
  name,
  reason,
  picked,
}: {
  rank: number;
  name: string;
  reason: string;
  picked?: boolean;
}) {
  return (
    <div
      className={`hover-lift flex items-start gap-3 rounded border p-2.5 ${picked ? "border-[var(--color-success)]/30 bg-[var(--color-success-soft)]/30" : "border-[var(--color-line)]"}`}
    >
      <div className="h-6 w-6 rounded-full bg-[var(--color-ink)] text-white flex items-center justify-center text-[11px] font-semibold tnum shrink-0">
        {rank}
      </div>
      <div className="min-w-0">
        <div className="text-[12.5px] font-medium">{name}</div>
        <div className="text-[11px] text-[var(--color-text-faint)]">{reason}</div>
      </div>
      {picked && <CheckCircle2 size={14} className="ml-auto text-[var(--color-success)] mt-0.5" />}
    </div>
  );
}

function Timeline({
  status,
  onAdvance,
  canAdvance,
}: {
  status: PickupStatus;
  onAdvance: () => void;
  canAdvance: boolean;
}) {
  const idx = STAGES.findIndex((s) => s.id === status);
  return (
    <div>
      <ol className="grid grid-cols-2 md:grid-cols-5 gap-1.5 stagger-fast">
        {STAGES.map((s, i) => {
          const past = i < idx;
          const current = i === idx;
          return (
            <li
              key={s.id}
              className={`rounded-md border p-2.5 text-[11px] transition-colors ${
                past
                  ? "border-[var(--color-success)]/30 bg-[var(--color-success-soft)]/30 text-[var(--color-success)]"
                  : current
                    ? "border-[var(--color-ai)] bg-[var(--color-ai-soft)]/40 text-[var(--color-ai)]"
                    : "border-[var(--color-line)] text-[var(--color-text-faint)]"
              }`}
            >
              <div className="flex items-center gap-1 text-[9.5px] uppercase tracking-wider opacity-70">
                Stage {i + 1}
                {current && (
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-ai)] pulse-dot" />
                )}
              </div>
              <div className="text-[12px] font-medium mt-0.5">{s.label}</div>
            </li>
          );
        })}
      </ol>
      <div className="mt-4 flex gap-2">
        {status !== "distribution-confirmed" && (
          <button
            onClick={onAdvance}
            disabled={!canAdvance}
            className="press text-[12px] px-3 py-2 rounded-md bg-[var(--color-ink)] text-white flex items-center gap-1.5 disabled:opacity-40"
          >
            Advance to next stage <ChevronRight size={12} />
          </button>
        )}
        {status === "distribution-confirmed" && (
          <span className="text-[12px] px-3 py-2 rounded-md bg-[var(--color-success-soft)] text-[var(--color-success)] flex items-center gap-1.5">
            <CheckCircle2 size={12} /> Pickup complete · recorded in Impact Ledger
          </span>
        )}
      </div>
      {status === "en-route" && (
        <div className="mt-3 text-[11.5px] text-[var(--color-text-soft)] flex items-center gap-1.5">
          <AlertTriangle size={11} /> Refrigerated van · driver: Lou Park · live ETA 14:25
        </div>
      )}
    </div>
  );
}
