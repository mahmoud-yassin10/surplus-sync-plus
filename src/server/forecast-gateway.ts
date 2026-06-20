import type { ForecastProvenance, GatewayHealth } from "../lib/forecast-gateway-types";
import type { Forecast } from "../lib/types";
import { mlConfig } from "./ml-config";
import {
  canonicalAttendanceCorrectionChanges,
  canonicalMlFeatures,
  isApprovedCorrectionForecast,
  isCanonicalForecastRequest,
  localCanonicalCorrectedForecast,
  localCanonicalForecast,
} from "./canonical-forecast";
import { mlResponseToForecast, MlClientError } from "./forecast-mapper";
import { getMlHealth, postMlForecast, postMlWhatIf } from "./ml-client";
import type { MlForecastFeatures } from "./ml-schemas";
import { mlForecastFeaturesSchema } from "./ml-schemas";

export class ForecastGatewayError extends Error {
  constructor(
    public readonly code:
      | "ML_UNAVAILABLE"
      | "ML_TIMEOUT"
      | "ML_INVALID_RESPONSE"
      | "ML_URL_ABSENT"
      | "FALLBACK_DISABLED"
      | "NONCANONICAL_UNAVAILABLE",
    message: string,
    public readonly status = 503,
    public readonly provenance?: ForecastProvenance,
  ) {
    super(message);
    this.name = "ForecastGatewayError";
  }
}

function buildProvenance(
  source: ForecastProvenance["source"],
  opts: { mlReachable: boolean; fallbackUsed: boolean },
): ForecastProvenance {
  return {
    source,
    mlReachable: opts.mlReachable,
    fallbackUsed: opts.fallbackUsed,
    decisionStatus: "PROPOSED",
    approvalRequired: true,
  };
}

function featuresForDate(date: string, schoolId: string): MlForecastFeatures {
  if (isCanonicalForecastRequest(date, schoolId)) {
    return canonicalMlFeatures(schoolId);
  }
  return mlForecastFeaturesSchema.parse({
    school_id: schoolId,
    date,
    menu_name: "Cheese pizza",
    menu_popularity: 1.075,
    recent_attendance_7d: 705,
    recent_attendance_14d: 702,
  });
}

function useCanonicalFallback(
  canonical: boolean,
  pick: () => Forecast,
): { forecast: Forecast; provenance: ForecastProvenance } {
  if (!canonical) {
    throw new ForecastGatewayError(
      "NONCANONICAL_UNAVAILABLE",
      "Forecast unavailable for noncanonical date — ML service did not respond",
      503,
      buildProvenance("local-canonical-fallback", { mlReachable: false, fallbackUsed: false }),
    );
  }
  if (!mlConfig.allowForecastFallback) {
    throw new ForecastGatewayError(
      "FALLBACK_DISABLED",
      "Canonical forecast fallback is disabled and ML service is unavailable",
      503,
      buildProvenance("local-canonical-fallback", { mlReachable: false, fallbackUsed: false }),
    );
  }
  return {
    forecast: pick(),
    provenance: buildProvenance("local-canonical-fallback", { mlReachable: false, fallbackUsed: true }),
  };
}

function fromMlError(error: unknown, canonical: boolean, pick: () => Forecast) {
  if (error instanceof MlClientError) {
    if (error.code === "ML_INVALID_RESPONSE") {
      throw new ForecastGatewayError(error.code, error.message, error.status);
    }
    if (canonical && mlConfig.allowForecastFallback) {
      return useCanonicalFallback(true, pick);
    }
    throw new ForecastGatewayError(
      canonical ? "FALLBACK_DISABLED" : "NONCANONICAL_UNAVAILABLE",
      error.message,
      error.status,
      buildProvenance("local-canonical-fallback", {
        mlReachable: error.code !== "ML_URL_ABSENT",
        fallbackUsed: false,
      }),
    );
  }
  if (error instanceof ForecastGatewayError) throw error;
  throw new ForecastGatewayError("ML_UNAVAILABLE", "Unexpected gateway failure", 503);
}

export async function gatewayGetForecast(
  date: string,
  schoolId: string,
): Promise<{ forecast: Forecast; provenance: ForecastProvenance }> {
  const canonical = isCanonicalForecastRequest(date, schoolId);
  try {
    const { data } = await postMlForecast(featuresForDate(date, schoolId));
    return {
      forecast: mlResponseToForecast(data),
      provenance: buildProvenance("ml", { mlReachable: true, fallbackUsed: false }),
    };
  } catch (error) {
    if (error instanceof MlClientError && error.code === "ML_INVALID_RESPONSE") {
      throw new ForecastGatewayError(error.code, error.message, error.status);
    }
    return fromMlError(error, canonical, localCanonicalForecast);
  }
}

export async function gatewayGetAttendanceWhatIf(
  date: string,
  schoolId: string,
): Promise<{ forecast: Forecast; provenance: ForecastProvenance }> {
  const canonical = isCanonicalForecastRequest(date, schoolId);
  const base = featuresForDate(date, schoolId);
  const changes = canonicalAttendanceCorrectionChanges();

  try {
    const { data } = await postMlWhatIf(base, changes);
    let forecast = mlResponseToForecast(data);
    if (canonical) {
      forecast = {
        ...forecast,
        influences: forecast.influences.map((i) =>
          i.factor.startsWith("Grade 10 field trip") || i.factor.startsWith("Field trip")
            ? { ...i, magnitude: 0, note: "Trip cancelled — input removed" }
            : i,
        ),
      };
      if (!isApprovedCorrectionForecast(forecast)) {
        if (mlConfig.allowForecastFallback) {
          return useCanonicalFallback(true, localCanonicalCorrectedForecast);
        }
        throw new ForecastGatewayError(
          "ML_UNAVAILABLE",
          "ML what-if did not return approved correction values for canonical demo",
          503,
          buildProvenance("ml", { mlReachable: true, fallbackUsed: false }),
        );
      }
    }
    return {
      forecast,
      provenance: buildProvenance("ml", { mlReachable: true, fallbackUsed: false }),
    };
  } catch (error) {
    if (error instanceof MlClientError && error.code === "ML_INVALID_RESPONSE") {
      throw new ForecastGatewayError(error.code, error.message, error.status);
    }
    return fromMlError(error, canonical, localCanonicalCorrectedForecast);
  }
}

export async function gatewayGetHealth(): Promise<GatewayHealth> {
  const fallbackEnabled = mlConfig.allowForecastFallback;
  const mlServiceConfigured = Boolean(mlConfig.serviceUrl);

  if (!mlServiceConfigured) {
    return {
      status: fallbackEnabled ? "degraded" : "unavailable",
      mlServiceReachable: false,
      mlModelLoaded: false,
      fallbackEnabled,
      mlServiceConfigured: false,
      gateway: "surplussync-plus",
    };
  }

  try {
    const { data } = await getMlHealth();
    const ok = data.status === "ok";
    return {
      status: ok ? "ok" : "degraded",
      mlServiceReachable: true,
      mlModelLoaded: data.modelLoaded,
      fallbackEnabled,
      mlServiceConfigured: true,
      gateway: "surplussync-plus",
    };
  } catch {
    return {
      status: fallbackEnabled ? "degraded" : "unavailable",
      mlServiceReachable: false,
      mlModelLoaded: false,
      fallbackEnabled,
      mlServiceConfigured: true,
      gateway: "surplussync-plus",
    };
  }
}
