import { describe, expect, it } from "vitest";
import { buildRecommendationKey } from "../forecast";
import { INITIAL, hydrateState, reducer } from "../store";

describe("localStorage persistence", () => {
  it("migrates ssp_state_v1 approvedRecommendation boolean to recommendation key", () => {
    const legacy = {
      ...INITIAL,
      approvedRecommendation: true,
      approvedRecommendationKey: undefined,
    };
    delete (legacy as { approvedRecommendationKey?: string | null }).approvedRecommendationKey;
    const hydrated = hydrateState(JSON.stringify(legacy));
    expect(hydrated.approvedRecommendationKey).toBe(buildRecommendationKey(INITIAL.forecast));
    expect(
      (hydrated as { approvedRecommendation?: boolean }).approvedRecommendation,
    ).toBeUndefined();
  });

  it("does not crash on malformed persisted state", () => {
    expect(hydrateState("{not-json")).toEqual(INITIAL);
  });

  it("round-trips workflow state through reducer actions", () => {
    let state = reducer(INITIAL, { type: "CORRECT_ATTENDANCE" });
    state = reducer(state, { type: "CONFIRM_SURPLUS", meals: 64 });
    state = reducer(state, { type: "COMPLETE_CHECKLIST" });
    const serialized = JSON.stringify(state);
    const restored = hydrateState(serialized);
    expect(restored.attendanceCorrected).toBe(true);
    expect(restored.surplusConfirmed).toBe(64);
    expect(restored.checklistComplete).toBe(true);
    expect(restored.forecast.expectedAttendance).toBe(540);
  });
});
