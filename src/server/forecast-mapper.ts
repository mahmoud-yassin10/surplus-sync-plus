import type { Forecast } from "../lib/types";
import { shortageProbabilityForPrep } from "../lib/forecast";
import { FORECAST_THURSDAY } from "../lib/mock";
import type { MlForecastResponse } from "./ml-schemas";

export class MlClientError extends Error {
  constructor(
    public readonly code: "ML_UNAVAILABLE" | "ML_TIMEOUT" | "ML_INVALID_RESPONSE" | "ML_URL_ABSENT",
    message: string,
    public readonly status = 503,
  ) {
    super(message);
    this.name = "MlClientError";
  }
}

export function mlResponseToForecast(ml: MlForecastResponse): Forecast {
  const baseline = FORECAST_THURSDAY;
  return {
    date: ml.date,
    expectedAttendance: ml.expectedAttendance,
    intervalLow: ml.intervalLow,
    intervalHigh: ml.intervalHigh,
    recommendedPrep: ml.recommendedPrep,
    shortageProb: ml.shortageProb ?? shortageProbabilityForPrep(ml.recommendedPrep),
    largeSurplusProb: ml.largeSurplusProb ?? baseline.largeSurplusProb,
    preventableSurplus: ml.preventableSurplus,
    risk: ml.risk ?? baseline.risk,
    dataQuality: ml.dataQuality ?? baseline.dataQuality,
    modelVersion: ml.modelVersion ?? baseline.modelVersion,
    menu: ml.menu ?? baseline.menu,
    influences: ml.influences ?? baseline.influences,
    similarDays: ml.similarDays ?? baseline.similarDays,
  };
}
