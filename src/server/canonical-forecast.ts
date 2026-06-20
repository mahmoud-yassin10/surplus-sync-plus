import { DEMO_FOCUS_DATE } from "../lib/demo-date";
import { applyAttendanceCorrection } from "../lib/forecast";
import { FORECAST_THURSDAY } from "../lib/mock";
import type { Forecast } from "../lib/types";
import type { MlForecastFeatures } from "./ml-schemas";
import { mlForecastFeaturesSchema } from "./ml-schemas";

export const CANONICAL_SCHOOL_ID = "lhphs";

export function isCanonicalForecastRequest(date: string, schoolId: string): boolean {
  return date === DEMO_FOCUS_DATE && schoolId === CANONICAL_SCHOOL_ID;
}

/** Locked canonical ML feature payload for Thursday Mar 12, 2026. */
export function canonicalMlFeatures(schoolId = CANONICAL_SCHOOL_ID): MlForecastFeatures {
  return mlForecastFeaturesSchema.parse({
    school_id: schoolId,
    date: DEMO_FOCUS_DATE,
    enrolled: 820,
    eligible: 760,
    normal_prep: 730,
    expected_attendance: 528,
    is_exam: true,
    trip_students: 112,
    early_dismissal: true,
    rain_probability: 0.78,
    rain_inches: 1.08,
    temperature_f: 46,
    menu_name: "Chicken & rice",
    menu_popularity: 1.061,
    recent_attendance_7d: 708,
    recent_attendance_14d: 706,
  });
}

export function canonicalAttendanceCorrectionChanges(): Record<string, number> {
  return { trip_students: 0, expected_attendance: 540 };
}

export function localCanonicalForecast(): Forecast {
  return { ...FORECAST_THURSDAY };
}

export function localCanonicalCorrectedForecast(): Forecast {
  return applyAttendanceCorrection(localCanonicalForecast());
}

export function isApprovedCorrectionForecast(forecast: Forecast): boolean {
  return forecast.expectedAttendance === 540 && forecast.recommendedPrep === 575;
}
