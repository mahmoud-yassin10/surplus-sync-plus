import { describe, expect, it } from "vitest";
import { buildCopilotReply, forecastViewFromState, syncHorizonFocusDay } from "../forecast";
import { HORIZON_DAYS } from "../mock";
import { INITIAL, reducer } from "../store";
import type { PickupStatus } from "../types";

const STAGES: PickupStatus[] = [
  "driver-assigned",
  "en-route",
  "arrived",
  "collected",
  "delivered",
  "distribution-confirmed",
];

function runGuidedWorkflow() {
  let state = { ...INITIAL };
  const steps: Array<() => void> = [
    () => {},
    () => {},
    () => {},
    () => { state = reducer(state, { type: "CORRECT_ATTENDANCE" }); },
    () => { state = reducer(state, { type: "SEND_PROVISIONAL_ALERTS" }); },
    () => { state = reducer(state, { type: "PARTNER_RESERVE", partnerId: "p1", meals: 95 }); },
    () => {
      state = reducer(state, { type: "CONFIRM_SURPLUS", meals: 64 });
      state = reducer(state, { type: "COMPLETE_CHECKLIST" });
      state = reducer(state, { type: "SELECT_PARTNER", partnerId: "p1", meals: 64 });
    },
    () => {
      const pickupId = state.pickups[0].id;
      for (const status of STAGES) {
        state = reducer(state, { type: "ADVANCE_PICKUP", pickupId, status });
      }
    },
    () => {},
  ];
  steps.forEach((step) => step());
  return state;
}

describe("guided demo workflow", () => {
  it("completes nine-step flow with consistent forecast surfaces", () => {
    const final = runGuidedWorkflow();
    const view = forecastViewFromState(final);
    const horizon = syncHorizonFocusDay(HORIZON_DAYS, final.forecast, final.currentPlan);
    const thursday = horizon.find((d) => d.date === "2026-03-12")!;

    expect(view.expectedAttendance).toBe(540);
    expect(view.recommendedPrep).toBe(575);
    expect(thursday.attendance).toBe(540);
    expect(thursday.recommendedPrep).toBe(575);
    expect(view.focusDateLong).toBe("Thursday Mar 12, 2026");

    const copilot = buildCopilotReply("What happens if attendance is 540?", view);
    expect(copilot.body).toContain("575");
    expect(copilot.body).toContain("155");
  });

  it("records prevented and recovered impact once each", () => {
    const final = runGuidedWorkflow();
    expect(final.impact.recoveredMeals).toBe(64);
    expect(final.impact.pickupsCompleted).toBe(1);
    expect(final.matches.find((m) => m.partnerId === "p1")?.state).toBe("confirmed");
  });

  it("baseline surfaces agree before correction", () => {
    const view = forecastViewFromState(INITIAL);
    const horizon = syncHorizonFocusDay(HORIZON_DAYS, INITIAL.forecast, INITIAL.currentPlan);
    const thursday = horizon.find((d) => d.date === "2026-03-12")!;
    expect(view.expectedAttendance).toBe(thursday.attendance);
    expect(view.recommendedPrep).toBe(thursday.recommendedPrep);
    expect(view.preventableSurplus).toBe(thursday.preventable);
  });

  it("provisional reserve works before surplus confirmation", () => {
    let state = reducer(INITIAL, { type: "PARTNER_RESERVE", partnerId: "p1", meals: 95 });
    expect(state.surplusConfirmed).toBeNull();
    expect(state.matches[0].state).toBe("reserved");
  });
});
