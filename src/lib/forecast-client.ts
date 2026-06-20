import type { Forecast, HorizonDay } from "./types";
import type {
  ForecastProvenance,
  GatewayHealth,
} from "./forecast-gateway-types";
import {
  gatewayErrorSchema,
  gatewayForecastPayloadSchema,
  gatewayHealthSchema,
} from "./forecast-gateway-types";
import { z } from "zod";
import { DEMO_FOCUS_DATE } from "./demo-date";
import { applyAttendanceCorrection } from "./forecast";
import { FORECAST_THURSDAY, HORIZON_DAYS } from "./mock";

type ForecastResult = { forecast: Forecast; provenance: ForecastProvenance };

export type { ForecastProvenance };

export class ForecastClientError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 503,
    public readonly provenance?: ForecastProvenance,
  ) {
    super(message);
    this.name = "ForecastClientError";
  }
}

/** Typed boundary for forecast data — browser calls the SurplusSync gateway only. */
export interface ForecastProvider {
  getForecast(date: string): Promise<ForecastResult>;
  getAttendanceWhatIf(date: string): Promise<ForecastResult>;
  getHealth(): Promise<GatewayHealth>;
  getHorizon(): Promise<HorizonDay[]>;
}

async function readGatewayJson<T>(response: Response, schema: z.ZodType<T>): Promise<T> {
  const json: unknown = await response.json();
  return schema.parse(json);
}

export class LocalForecastProvider implements ForecastProvider {
  async getForecast(date: string): Promise<ForecastResult> {
    if (date === FORECAST_THURSDAY.date) {
      return {
        forecast: { ...FORECAST_THURSDAY },
        provenance: {
          source: "local-canonical-fallback",
          mlReachable: false,
          fallbackUsed: true,
          decisionStatus: "PROPOSED",
          approvalRequired: true,
        },
      };
    }
    const day = HORIZON_DAYS.find((d) => d.date === date);
    if (!day) throw new ForecastClientError("NONCANONICAL_UNAVAILABLE", `No local forecast for ${date}`);
    const forecast: Forecast = {
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
    return {
      forecast,
      provenance: {
        source: "local-canonical-fallback",
        mlReachable: false,
        fallbackUsed: true,
        decisionStatus: "PROPOSED",
        approvalRequired: true,
      },
    };
  }

  async getAttendanceWhatIf(date: string): Promise<ForecastResult> {
    const base = await this.getForecast(date);
    return {
      forecast: applyAttendanceCorrection(base.forecast),
      provenance: base.provenance,
    };
  }

  async getHealth(): Promise<GatewayHealth> {
    return {
      status: "degraded",
      mlServiceReachable: false,
      mlModelLoaded: false,
      fallbackEnabled: true,
      mlServiceConfigured: false,
      gateway: "surplussync-plus",
    };
  }

  async getHorizon(): Promise<HorizonDay[]> {
    return HORIZON_DAYS.map((d) => ({ ...d }));
  }
}

export class HttpForecastProvider implements ForecastProvider {
  constructor(private readonly gatewayBase = "") {}

  private url(path: string): string {
    return `${this.gatewayBase}${path}`;
  }

  async getForecast(date: string): Promise<ForecastResult> {
    const response = await fetch(this.url("/api/forecast"), {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ date, schoolId: "lhphs" }),
    });
    if (!response.ok) {
      const err = await readGatewayJson(response, gatewayErrorSchema).catch(() => null);
      throw new ForecastClientError(
        err?.error.code ?? "ML_UNAVAILABLE",
        err?.error.message ?? `Forecast gateway error (${response.status})`,
        response.status,
        err?.provenance,
      );
    }
    const payload = await readGatewayJson(response, gatewayForecastPayloadSchema);
    return payload as ForecastResult;
  }

  async getAttendanceWhatIf(date: string): Promise<ForecastResult> {
    const response = await fetch(this.url("/api/forecast/what-if"), {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ date, schoolId: "lhphs", scenario: "attendance-trip-cancelled" }),
    });
    if (!response.ok) {
      const err = await readGatewayJson(response, gatewayErrorSchema).catch(() => null);
      throw new ForecastClientError(
        err?.error.code ?? "ML_UNAVAILABLE",
        err?.error.message ?? `What-if gateway error (${response.status})`,
        response.status,
        err?.provenance,
      );
    }
    const payload = await readGatewayJson(response, gatewayForecastPayloadSchema);
    return payload as ForecastResult;
  }

  async getHealth(): Promise<GatewayHealth> {
    const response = await fetch(this.url("/api/forecast/health"), {
      method: "GET",
      headers: { accept: "application/json" },
    });
    return readGatewayJson(response, gatewayHealthSchema);
  }

  async getHorizon(): Promise<HorizonDay[]> {
    return new LocalForecastProvider().getHorizon();
  }
}

export function createForecastProvider(): ForecastProvider {
  if (typeof window === "undefined") {
    return new LocalForecastProvider();
  }
  return new HttpForecastProvider();
}

export const defaultForecastProvider: ForecastProvider = createForecastProvider();

let inflightBootstrap: Promise<void> | null = null;

/** Single-flight forecast hydration for the focus day — avoids duplicate gateway calls. */
export function bootstrapFocusForecast(
  provider: ForecastProvider,
  date: string,
  attendanceCorrected: boolean,
  onResult: (result: {
    forecast: Forecast;
    provenance: ForecastProvenance;
  }) => void,
  onError: (message: string) => void,
): Promise<void> {
  if (inflightBootstrap) return inflightBootstrap;

  inflightBootstrap = (async () => {
    try {
      const result = attendanceCorrected
        ? await provider.getAttendanceWhatIf(date)
        : await provider.getForecast(date);
      onResult(result);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Forecast unavailable");
    } finally {
      inflightBootstrap = null;
    }
  })();

  return inflightBootstrap;
}

export function resetForecastBootstrapForTests() {
  inflightBootstrap = null;
}

export const FOCUS_FORECAST_DATE = DEMO_FOCUS_DATE;
