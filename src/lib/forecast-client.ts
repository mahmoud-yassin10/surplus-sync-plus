import type { Forecast, HorizonDay } from "./types";
import { FORECAST_THURSDAY, HORIZON_DAYS } from "./mock";

/** Typed boundary for forecast data — local mock today, HTTP placeholder for Python service. */
export interface ForecastProvider {
  getForecast(date: string): Promise<Forecast>;
  getHorizon(): Promise<HorizonDay[]>;
}

export class LocalForecastProvider implements ForecastProvider {
  async getForecast(date: string): Promise<Forecast> {
    if (date === FORECAST_THURSDAY.date) return { ...FORECAST_THURSDAY };
    const day = HORIZON_DAYS.find((d) => d.date === date);
    if (!day) throw new Error(`No local forecast for ${date}`);
    return {
      date: day.date,
      expectedAttendance: day.attendance,
      intervalLow: day.intervalLow,
      intervalHigh: day.intervalHigh,
      recommendedPrep: day.recommendedPrep,
      shortageProb: 0.016,
      largeSurplusProb: 0.12,
      preventableSurplus: day.preventable,
      risk: day.risk,
      dataQuality: "high",
      modelVersion: "ssp-forecast-1.0",
      menu: FORECAST_THURSDAY.menu,
      influences: FORECAST_THURSDAY.influences,
      similarDays: FORECAST_THURSDAY.similarDays,
    };
  }

  async getHorizon(): Promise<HorizonDay[]> {
    return HORIZON_DAYS.map((d) => ({ ...d }));
  }
}

/** Placeholder for the Python ML forecast service — not enabled in this pass. */
export class HttpForecastProvider implements ForecastProvider {
  constructor(private readonly baseUrl: string) {}

  async getForecast(_date: string): Promise<Forecast> {
    void this.baseUrl;
    throw new Error("HTTP forecast provider is not enabled. Use LocalForecastProvider for offline demo.");
  }

  async getHorizon(): Promise<HorizonDay[]> {
    void this.baseUrl;
    throw new Error("HTTP forecast provider is not enabled. Use LocalForecastProvider for offline demo.");
  }
}

export const defaultForecastProvider: ForecastProvider = new LocalForecastProvider();
