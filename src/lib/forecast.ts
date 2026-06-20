import type { Forecast, ForecastView, HorizonDay, RecoveryPartner } from "./types";
import {
  DEMO_FOCUS_DATE,
  formatFocusDateLong,
  formatFocusDateShort,
  formatFocusDateSlash,
} from "./demo-date";
import { SCHOOL } from "./mock";

export const SAFETY_FLOOR = 540;
export const MEAL_UNIT_COST = 3.4;

export const SCENARIO_PLANS = [
  { id: "current", label: "Current school plan", meals: SCHOOL.normalPrep },
  { id: "hist", label: "Recent historical average", meals: 698 },
  { id: "weekday", label: "Same-weekday average", meals: 712 },
  { id: "rules", label: "Calendar-rule plan", meals: 620 },
] as const;

export function buildRecommendationKey(forecast: Forecast): string {
  return `${forecast.date}|${forecast.modelVersion}|${forecast.expectedAttendance}|${forecast.recommendedPrep}`;
}

export function computeShortage(meals: number): number {
  if (meals >= 600) return Math.max(0.001, 0.02 - (meals - 600) / 8000);
  if (meals >= SAFETY_FLOOR) return 0.02 + (600 - meals) / 1800;
  return 0.5 + Math.min(0.49, (SAFETY_FLOOR - meals) / 80);
}

/** Canonical shortage probability for a preparation plan (used across all forecast surfaces). */
export function shortageProbabilityForPrep(meals: number): number {
  return computeShortage(meals);
}

export function computeWaste(meals: number, expectedAttendance: number): number {
  return Math.max(0, meals - expectedAttendance);
}

export function computePreventableSurplus(currentPlan: number, recommendedPrep: number): number {
  return Math.max(0, currentPlan - recommendedPrep);
}

export function computeSafetyBuffer(recommendedPrep: number, intervalHigh: number): number {
  return recommendedPrep - intervalHigh;
}

export function computeMaxSafeReduction(baselinePrep: number, safetyFloor = SAFETY_FLOOR): number {
  return baselinePrep - safetyFloor;
}

export function computePlanDelta(currentPlan: number, recommendedPrep: number): number {
  return currentPlan - recommendedPrep;
}

export function computePreventedImpact(
  baselinePrep: number,
  approvedPlan: number,
): { preventedMeals: number; costSaved: number } {
  const preventedMeals = Math.max(0, baselinePrep - approvedPlan);
  return { preventedMeals, costSaved: preventedMeals * MEAL_UNIT_COST };
}

export type ImpactCategoryDisclosure = {
  title: "Prevented" | "Recovered" | "Nonrecoverable" | "Forecast accuracy";
  desc: string;
};

export function applyAttendanceCorrection(forecast: Forecast): Forecast {
  return {
    ...forecast,
    expectedAttendance: 540,
    intervalLow: 512,
    intervalHigh: 568,
    recommendedPrep: 575,
    preventableSurplus: 155,
    shortageProb: shortageProbabilityForPrep(575),
    influences: forecast.influences.map((i) =>
      i.factor.startsWith("Grade 10 field trip")
        ? { ...i, magnitude: 0, note: "Trip cancelled — input removed" }
        : i,
    ),
  };
}

export function syncHorizonFocusDay(
  horizon: HorizonDay[],
  forecast: Forecast,
  currentPlan: number,
): HorizonDay[] {
  return horizon.map((day) =>
    day.date === forecast.date
      ? {
          ...day,
          attendance: forecast.expectedAttendance,
          intervalLow: forecast.intervalLow,
          intervalHigh: forecast.intervalHigh,
          recommendedPrep: forecast.recommendedPrep,
          currentPlan,
          preventable: forecast.preventableSurplus,
          risk: forecast.risk,
        }
      : day,
  );
}

export function computePickupEta(partner: RecoveryPartner): string {
  const baseMinutes = 14 * 60;
  const total = baseMinutes + partner.responseMins;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export interface ForecastViewInput {
  forecast: Forecast;
  currentPlan: number;
  approvedRecommendationKey: string | null;
  attendanceCorrected: boolean;
  baselinePrep?: number;
}

export function buildForecastView(input: ForecastViewInput): ForecastView {
  const { forecast, currentPlan, approvedRecommendationKey, attendanceCorrected } = input;
  const baselinePrep = input.baselinePrep ?? SCHOOL.normalPrep;
  const recommendationKey = buildRecommendationKey(forecast);
  const scenarioRows = [
    ...SCENARIO_PLANS.map((s) => ({
      id: s.id,
      label: s.label,
      meals: s.meals,
      shortage: computeShortage(s.meals),
      waste: computeWaste(s.meals, forecast.expectedAttendance),
    })),
    {
      id: "ssp",
      label: "SurplusSync Plus plan",
      meals: forecast.recommendedPrep,
      shortage: computeShortage(forecast.recommendedPrep),
      waste: computeWaste(forecast.recommendedPrep, forecast.expectedAttendance),
    },
  ];

  return {
    date: forecast.date,
    focusDateLong: formatFocusDateLong(),
    focusDateShort: formatFocusDateShort(),
    focusDateSlash: formatFocusDateSlash(),
    expectedAttendance: forecast.expectedAttendance,
    intervalLow: forecast.intervalLow,
    intervalHigh: forecast.intervalHigh,
    intervalLabel: `${forecast.intervalLow}–${forecast.intervalHigh}`,
    recommendedPrep: forecast.recommendedPrep,
    currentPlan,
    baselinePrep,
    preventableSurplus: forecast.preventableSurplus,
    shortageProb: shortageProbabilityForPrep(forecast.recommendedPrep),
    largeSurplusProb: forecast.largeSurplusProb,
    safetyFloor: SAFETY_FLOOR,
    safetyBuffer: computeSafetyBuffer(forecast.recommendedPrep, forecast.intervalHigh),
    maxSafeReduction: computeMaxSafeReduction(baselinePrep),
    planDelta: computePlanDelta(currentPlan, forecast.recommendedPrep),
    risk: forecast.risk,
    modelVersion: forecast.modelVersion,
    recommendationKey,
    approvedForCurrentRecommendation: approvedRecommendationKey === recommendationKey,
    attendanceCorrected,
    scenarioRows,
    influences: forecast.influences,
    similarDays: forecast.similarDays,
    menu: forecast.menu,
    dataQuality: forecast.dataQuality,
  };
}

export type CopilotReply = {
  kind: "fact" | "prediction" | "explanation" | "simulation" | "action";
  title: string;
  body: string;
  evidence?: string[];
  proposal?: {
    before: string;
    after: string;
    consequences: string;
    reversible: boolean;
    actionType: "SEND_PROVISIONAL_ALERTS";
  };
};

export function buildCopilotReply(prompt: string, view: ForecastView): CopilotReply {
  if (prompt.startsWith("Why")) {
    return {
      kind: "explanation",
      title: `${view.focusDateShort} is High risk because four downward inputs stack on one popular menu`,
      body: `Combined predicted attendance drop on ${view.focusDateLong}. Confidence is high — three similar exam days in the last six months show comparable swings.`,
      evidence: view.influences.map(
        (i) => `${i.factor} · ${i.direction === "down" ? "−" : "+"}${i.magnitude}`,
      ),
    };
  }
  if (prompt.includes("540")) {
    const simPrep = view.attendanceCorrected ? view.recommendedPrep : 575;
    const simPreventable = view.attendanceCorrected ? view.preventableSurplus : 155;
    const baselinePreventable = view.attendanceCorrected ? 155 : view.preventableSurplus;
    return {
      kind: "simulation",
      title: "Simulating attendance = 540 (no records changed)",
      body: `Recommended preparation shifts to ${simPrep} meals. Shortage probability stays under ${(view.shortageProb * 100 + 0.4).toFixed(1)}%. Preventable surplus drops from ${baselinePreventable} to ${simPreventable} meals.`,
      evidence: [
        `Safety floor ${view.safetyFloor} still respected`,
        "Menu mix unchanged",
        `Cost saving ≈ $${Math.round(computePreventedImpact(view.baselinePrep, simPrep).costSaved)}`,
      ],
    };
  }
  if (prompt.startsWith("Which inputs")) {
    return {
      kind: "explanation",
      title: `Top influential inputs for ${view.focusDateShort}`,
      body: "Ordered by magnitude. These are influential inputs, not causes — the model reports correlation strength with historical attendance drops.",
      evidence: view.influences.map(
        (i) => `${i.factor.split(" ")[0]} ${i.magnitude} · ${i.direction}`,
      ),
    };
  }
  if (prompt.startsWith("Compare")) {
    return {
      kind: "fact",
      title: "Three similar days in the last six months",
      body: "All combined exams with another large attendance event. Actual attendance fell within the predicted interval each time.",
      evidence: view.similarDays.map((d) => `${d.date} · ${d.attendance} actual`),
    };
  }
  if (prompt.toLowerCase().includes("packaged")) {
    return {
      kind: "fact",
      title: `Partners accepting packaged meals on ${view.focusDateSlash}`,
      body: "Filtered by accepted food category, distance, and current availability.",
      evidence: [
        "Metro Community Food Bank · 120 meals · refrigerated van",
        "Harbor Family Shelter · 70 meals · no vehicle",
        "Neighborhood Community Kitchen · 180 meals · refrigerated storage",
        "Westside Senior Center · 40 meals · volunteer driver (limited)",
      ],
    };
  }
  if (prompt.toLowerCase().includes("draft")) {
    return {
      kind: "action",
      title: "Proposed action: send provisional surplus alert",
      body: "Sends a provisional alert (not a confirmed donation) to all available partners that accept packaged meals.",
      proposal: {
        before: "0 alerts sent",
        after: "3 partners notified",
        consequences:
          "Partners may reserve tentative capacity. No commitment until you confirm actual surplus after service.",
        reversible: true,
        actionType: "SEND_PROVISIONAL_ALERTS",
      },
    };
  }
  return {
    kind: "explanation",
    title: "Prevented vs recoverable vs nonrecoverable",
    body: "Prevented = meals never prepared because the plan changed before service. Recoverable = safe untouched meals after service. Nonrecoverable = food that cannot be redistributed. The same quantity is never counted twice.",
  };
}

export function forecastViewFromState(state: {
  forecast: Forecast;
  currentPlan: number;
  approvedRecommendationKey: string | null;
  attendanceCorrected: boolean;
}): ForecastView {
  return buildForecastView({
    forecast: state.forecast,
    currentPlan: state.currentPlan,
    approvedRecommendationKey: state.approvedRecommendationKey,
    attendanceCorrected: state.attendanceCorrected,
  });
}

export function isFocusForecast(forecast: Forecast): boolean {
  return forecast.date === DEMO_FOCUS_DATE;
}

export function recommendationStatusLabel(approved: boolean): string {
  return approved ? "approved AI recommendation" : "proposed AI recommendation";
}

export function preventedMealsDerivation(view: ForecastView): string {
  const label = recommendationStatusLabel(view.approvedForCurrentRecommendation);
  return `${view.baselinePrep} baseline − ${label} (${view.recommendedPrep} meals)`;
}

export function preventedMealsDescription(view: ForecastView): string {
  const label = recommendationStatusLabel(view.approvedForCurrentRecommendation);
  return `Difference between the baseline ${view.baselinePrep}-meal plan and the ${label} (${view.recommendedPrep} meals). Counted only when a human approves a reduced plan before service.`;
}

export function impactCategoryDisclosures(view: ForecastView): ImpactCategoryDisclosure[] {
  return [
    { title: "Prevented", desc: preventedMealsDescription(view) },
    {
      title: "Recovered",
      desc: "Observed meals confirmed safe after service and successfully distributed by a verified partner.",
    },
    {
      title: "Nonrecoverable",
      desc: "Observed surplus that fails the human-completed eligibility checklist or expires before pickup.",
    },
    {
      title: "Forecast accuracy",
      desc: "Rolling 30-day mean absolute percentage error of attendance prediction. Updated nightly.",
    },
  ];
}
