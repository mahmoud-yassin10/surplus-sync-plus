import { describe, expect, it } from "vitest";
import {
  applyAttendanceCorrection,
  buildForecastView,
  buildRecommendationKey,
  computePreventedImpact,
  computeShortage,
  computeWaste,
  forecastViewFromState,
  SAFETY_FLOOR,
  syncHorizonFocusDay,
} from "../forecast";
import { FORECAST_THURSDAY, HORIZON_DAYS } from "../mock";
import { INITIAL } from "../store";

describe("forecast", () => {
  it("enforces safety floor constant", () => {
    expect(SAFETY_FLOOR).toBe(540);
  });

  it("computes shortage and waste relative to attendance", () => {
    expect(computeWaste(730, 528)).toBe(202);
    expect(computeWaste(575, 540)).toBe(35);
    expect(computeShortage(562)).toBeLessThan(computeShortage(500));
  });

  it("builds deterministic recommendation keys", () => {
    const key = buildRecommendationKey(FORECAST_THURSDAY);
    expect(key).toBe("2026-03-12|ssp-forecast-1.0|528|562");
    const corrected = applyAttendanceCorrection(FORECAST_THURSDAY);
    expect(buildRecommendationKey(corrected)).toBe("2026-03-12|ssp-forecast-1.0|540|575");
  });

  it("baseline and corrected views differ but are internally consistent", () => {
    const baseline = buildForecastView({
      forecast: FORECAST_THURSDAY,
      currentPlan: 730,
      approvedRecommendationKey: null,
      attendanceCorrected: false,
    });
    const correctedForecast = applyAttendanceCorrection(FORECAST_THURSDAY);
    const corrected = buildForecastView({
      forecast: correctedForecast,
      currentPlan: 730,
      approvedRecommendationKey: null,
      attendanceCorrected: true,
    });

    expect(baseline.expectedAttendance).toBe(528);
    expect(corrected.expectedAttendance).toBe(540);
    expect(baseline.recommendedPrep).toBe(562);
    expect(corrected.recommendedPrep).toBe(575);
    expect(baseline.focusDateLong).toBe("Thursday Mar 12, 2026");
    expect(corrected.focusDateLong).toBe("Thursday Mar 12, 2026");
    expect(baseline.recommendationKey).not.toBe(corrected.recommendationKey);

    const sspBaseline = baseline.scenarioRows.find((r) => r.id === "ssp")!;
    expect(sspBaseline.meals).toBe(562);
    expect(sspBaseline.waste).toBe(computeWaste(562, 528));

    const sspCorrected = corrected.scenarioRows.find((r) => r.id === "ssp")!;
    expect(sspCorrected.meals).toBe(575);
    expect(sspCorrected.waste).toBe(computeWaste(575, 540));
  });

  it("syncs horizon focus day from live forecast", () => {
    const corrected = applyAttendanceCorrection(FORECAST_THURSDAY);
    const synced = syncHorizonFocusDay(HORIZON_DAYS, corrected, 730);
    const thursday = synced.find((d) => d.date === "2026-03-12")!;
    expect(thursday.attendance).toBe(540);
    expect(thursday.recommendedPrep).toBe(575);
    expect(thursday.preventable).toBe(155);
  });

  it("forecastViewFromState matches store baseline", () => {
    const view = forecastViewFromState(INITIAL);
    expect(view.expectedAttendance).toBe(INITIAL.forecast.expectedAttendance);
    expect(view.recommendedPrep).toBe(INITIAL.forecast.recommendedPrep);
    expect(view.preventableSurplus).toBe(INITIAL.forecast.preventableSurplus);
  });

  it("computePreventedImpact returns zero when plan not reduced", () => {
    expect(computePreventedImpact(730, 730)).toEqual({ preventedMeals: 0, costSaved: 0 });
    expect(computePreventedImpact(730, 562).preventedMeals).toBe(168);
  });
});
