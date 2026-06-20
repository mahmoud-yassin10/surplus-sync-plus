import { describe, expect, it } from "vitest";
import {
  applyAttendanceCorrection,
  buildForecastView,
  buildRecommendationKey,
  CARBON_LEDGER_SOURCES,
  computePreventedImpact,
  computeShortage,
  computeWaste,
  estimateCarbonKgForMeals,
  estimateCarbonLedger,
  forecastViewFromState,
  impactCategoryDisclosures,
  preventedMealsDerivation,
  preventedMealsDescription,
  shortageProbabilityForPrep,
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

  it("exposes the same shortage probability for the 562-meal recommendation across forecast views", () => {
    const view = buildForecastView({
      forecast: FORECAST_THURSDAY,
      currentPlan: 730,
      approvedRecommendationKey: null,
      attendanceCorrected: false,
    });
    const expected = shortageProbabilityForPrep(562);
    expect((expected * 100).toFixed(1)).toBe("4.1");
    expect(view.shortageProb).toBe(expected);
    expect(view.scenarioRows.find((r) => r.id === "ssp")!.shortage).toBe(expected);
    expect(forecastViewFromState(INITIAL).shortageProb).toBe(expected);
  });

  it("uses proposed wording before recommendation approval and approved wording after", () => {
    const pending = buildForecastView({
      forecast: FORECAST_THURSDAY,
      currentPlan: 730,
      approvedRecommendationKey: null,
      attendanceCorrected: false,
    });
    expect(preventedMealsDerivation(pending)).toContain("proposed AI recommendation");
    expect(preventedMealsDerivation(pending)).not.toContain("approved AI recommendation");
    expect(preventedMealsDescription(pending)).toContain("proposed AI recommendation");

    const approved = buildForecastView({
      forecast: FORECAST_THURSDAY,
      currentPlan: 562,
      approvedRecommendationKey: buildRecommendationKey(FORECAST_THURSDAY),
      attendanceCorrected: false,
    });
    expect(preventedMealsDerivation(approved)).toContain("approved AI recommendation");
    expect(preventedMealsDescription(approved)).toContain("approved AI recommendation");
  });

  it("discloses mutually exclusive impact categories", () => {
    const view = buildForecastView({
      forecast: FORECAST_THURSDAY,
      currentPlan: 562,
      approvedRecommendationKey: buildRecommendationKey(FORECAST_THURSDAY),
      attendanceCorrected: false,
    });
    const disclosures = impactCategoryDisclosures(view);

    expect(disclosures.map((row) => row.title)).toEqual([
      "Prevented",
      "Recovered",
      "Nonrecoverable",
      "Forecast accuracy",
      "Carbon estimate",
    ]);
    expect(disclosures.find((row) => row.title === "Prevented")?.desc).toContain("before service");
    expect(disclosures.find((row) => row.title === "Recovered")?.desc).toContain("Observed");
    expect(disclosures.find((row) => row.title === "Nonrecoverable")?.desc).toContain("Observed");
    expect(disclosures.find((row) => row.title === "Carbon estimate")?.desc).toContain("Estimated");
  });

  it("computes a sourced estimated carbon ledger without changing meal counts", () => {
    expect(estimateCarbonKgForMeals(1)).toBe(1);
    expect(CARBON_LEDGER_SOURCES).toHaveLength(2);

    const ledger = estimateCarbonLedger({
      ...INITIAL.impact,
      preventedMeals: 155,
      recoveredMeals: 64,
    });

    expect(ledger.basisMeals).toBe(219);
    expect(ledger.avoidedKgCO2e).toBe(219);
    expect(ledger.methodology).toContain("estimate");
  });
});
