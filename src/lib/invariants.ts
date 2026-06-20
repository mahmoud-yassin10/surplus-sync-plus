import type { Forecast, PickupStatus } from "./types";
import { SAFETY_FLOOR } from "./forecast";

export type InvariantResult = { ok: true } | { ok: false; reason: string };

const STAGE_ORDER: PickupStatus[] = [
  "alert-sent",
  "capacity-reserved",
  "surplus-confirmed",
  "partner-selected",
  "driver-assigned",
  "en-route",
  "arrived",
  "collected",
  "delivered",
  "distribution-confirmed",
];

export function stageIndex(status: PickupStatus): number {
  return STAGE_ORDER.indexOf(status);
}

export function assertPlanAboveFloor(meals: number): InvariantResult {
  if (meals < SAFETY_FLOOR) {
    return { ok: false, reason: `Preparation plan ${meals} is below the ${SAFETY_FLOOR}-meal safety floor.` };
  }
  return { ok: true };
}

export function assertCanSelectPartner(surplusConfirmed: number | null, checklistComplete: boolean): InvariantResult {
  if (surplusConfirmed == null) {
    return { ok: false, reason: "Surplus must be confirmed before selecting a partner." };
  }
  if (!checklistComplete) {
    return { ok: false, reason: "Recovery eligibility checklist must be complete before partner selection." };
  }
  return { ok: true };
}

export function assertCanOverridePartner(
  surplusConfirmed: number | null,
  checklistComplete: boolean,
  hasPickup: boolean,
): InvariantResult {
  if (!hasPickup) {
    return { ok: false, reason: "No active pickup to override." };
  }
  return assertCanSelectPartner(surplusConfirmed, checklistComplete);
}

export function assertCanAdvanceBeyondSurplusConfirmed(
  nextStatus: PickupStatus,
  surplusConfirmed: number | null,
  checklistComplete: boolean,
): InvariantResult {
  if (stageIndex(nextStatus) <= stageIndex("surplus-confirmed")) {
    return { ok: true };
  }
  if (surplusConfirmed == null) {
    return { ok: false, reason: "Surplus must be confirmed before routing beyond surplus-confirmed." };
  }
  if (!checklistComplete) {
    return { ok: false, reason: "Checklist must be complete before routing beyond surplus-confirmed." };
  }
  return { ok: true };
}

export function assertMonotonicPickupAdvance(current: PickupStatus, next: PickupStatus): InvariantResult {
  const cur = stageIndex(current);
  const nxt = stageIndex(next);
  if (nxt !== cur + 1) {
    return { ok: false, reason: `Pickup can only advance one stage at a time (${current} → ${next}).` };
  }
  return { ok: true };
}

export function assertCanApplyRecommendation(forecast: Forecast): InvariantResult {
  return assertPlanAboveFloor(forecast.recommendedPrep);
}
