import { describe, expect, it } from "vitest";
import {
  assertCanAdvanceBeyondSurplusConfirmed,
  assertCanSelectPartner,
  assertPlanAboveFloor,
} from "../invariants";
import { SAFETY_FLOOR } from "../forecast";

describe("invariants", () => {
  it("blocks plans below safety floor", () => {
    expect(assertPlanAboveFloor(SAFETY_FLOOR).ok).toBe(true);
    expect(assertPlanAboveFloor(SAFETY_FLOOR - 1).ok).toBe(false);
  });

  it("allows surplus confirmation without checklist", () => {
    expect(assertCanSelectPartner(64, false).ok).toBe(false);
    expect(assertCanSelectPartner(null, true).ok).toBe(false);
    expect(assertCanSelectPartner(64, true).ok).toBe(true);
  });

  it("blocks routing beyond surplus-confirmed without checklist", () => {
    expect(assertCanAdvanceBeyondSurplusConfirmed("surplus-confirmed", 64, false).ok).toBe(true);
    expect(assertCanAdvanceBeyondSurplusConfirmed("partner-selected", 64, false).ok).toBe(false);
    expect(assertCanAdvanceBeyondSurplusConfirmed("partner-selected", null, true).ok).toBe(false);
    expect(assertCanAdvanceBeyondSurplusConfirmed("partner-selected", 64, true).ok).toBe(true);
  });
});
