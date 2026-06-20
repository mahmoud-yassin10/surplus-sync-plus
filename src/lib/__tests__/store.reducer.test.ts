import { describe, expect, it } from "vitest";
import { buildRecommendationKey } from "../forecast";
import { INITIAL, reducer, type State } from "../store";
import type { PickupStatus } from "../types";

function apply(state: State, ...actions: Parameters<typeof reducer>[1][]) {
  return actions.reduce((s, a) => reducer(s, a), state);
}

describe("store reducer", () => {
  it("idempotent APPLY_RECOMMENDATION for same recommendation key", () => {
    const once = apply(INITIAL, { type: "APPLY_RECOMMENDATION" });
    const twice = apply(once, { type: "APPLY_RECOMMENDATION" });
    expect(twice.impact.preventedMeals).toBe(once.impact.preventedMeals);
    expect(twice.impact.costSaved).toBe(once.impact.costSaved);
    expect(twice.currentPlan).toBe(562);
  });

  it("allows new approval after attendance correction changes recommendation key", () => {
    const approved = apply(INITIAL, { type: "APPLY_RECOMMENDATION" });
    const corrected = apply(approved, { type: "CORRECT_ATTENDANCE" });
    expect(corrected.approvedRecommendationKey).toBeNull();
    const reapproved = apply(corrected, { type: "APPLY_RECOMMENDATION" });
    expect(reapproved.currentPlan).toBe(575);
    expect(reapproved.impact.preventedMeals).toBe(168 + 155);
  });

  it("rejects SET_PLAN below safety floor", () => {
    const next = apply(INITIAL, { type: "SET_PLAN", meals: 500 });
    expect(next.currentPlan).toBe(730);
  });

  it("allows PARTNER_RESERVE before surplus confirmation", () => {
    const next = apply(INITIAL, { type: "PARTNER_RESERVE", partnerId: "p1", meals: 95 });
    expect(next.matches).toHaveLength(1);
    expect(next.surplusConfirmed).toBeNull();
  });

  it("blocks SELECT_PARTNER without surplus and checklist", () => {
    const noSurplus = apply(INITIAL, { type: "SELECT_PARTNER", partnerId: "p1", meals: 64 });
    expect(noSurplus.pickups).toHaveLength(0);

    const surplusOnly = apply(INITIAL, { type: "CONFIRM_SURPLUS", meals: 64 });
    const noChecklist = apply(surplusOnly, { type: "SELECT_PARTNER", partnerId: "p1", meals: 64 });
    expect(noChecklist.pickups).toHaveLength(0);

    const ready = apply(
      surplusOnly,
      { type: "COMPLETE_CHECKLIST" },
      { type: "SELECT_PARTNER", partnerId: "p1", meals: 64 },
    );
    expect(ready.pickups).toHaveLength(1);
  });

  it("OVERRIDE_PARTNER updates active pickup and matches", () => {
    const withPickup = apply(
      INITIAL,
      { type: "CONFIRM_SURPLUS", meals: 64 },
      { type: "COMPLETE_CHECKLIST" },
      { type: "SELECT_PARTNER", partnerId: "p1", meals: 64 },
    );
    const overridden = apply(withPickup, {
      type: "OVERRIDE_PARTNER",
      partnerId: "p3",
      previousId: "p1",
      reason: "Larger absorber",
    });
    expect(overridden.pickups[0].partnerId).toBe("p3");
    expect(overridden.matches.find((m) => m.partnerId === "p3")?.state).toBe("confirmed");
    expect(overridden.pickups[0].eta).toBe("14:42");
  });

  it("idempotent pickup distribution impact", () => {
    let state = apply(
      INITIAL,
      { type: "CONFIRM_SURPLUS", meals: 64 },
      { type: "COMPLETE_CHECKLIST" },
      { type: "SELECT_PARTNER", partnerId: "p1", meals: 64 },
    );
    const pickupId = state.pickups[0].id;
    const stages: PickupStatus[] = [
      "driver-assigned",
      "en-route",
      "arrived",
      "collected",
      "delivered",
      "distribution-confirmed",
    ];
    for (const status of stages) {
      state = apply(state, { type: "ADVANCE_PICKUP", pickupId, status });
    }
    const onceImpact = state.impact.recoveredMeals;
    const again = apply(state, { type: "ADVANCE_PICKUP", pickupId, status: "distribution-confirmed" });
    expect(again.impact.recoveredMeals).toBe(onceImpact);
    expect(again.pickups[0].impactRecorded).toBe(true);
  });

  it("denies consequential actions for wrong role", () => {
    const partner = { ...INITIAL, role: "partner" as const };
    const blocked = apply(partner, { type: "APPLY_RECOMMENDATION" });
    expect(blocked.currentPlan).toBe(730);
    expect(blocked.audit[0].action).toContain("Action blocked");
  });

  it("recommendation key matches forecast fields", () => {
    expect(buildRecommendationKey(INITIAL.forecast)).toBe(INITIAL.forecast.date + "|ssp-forecast-1.0|528|562");
  });
});
