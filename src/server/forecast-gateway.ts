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
import type { MlForecastFeaturesInput } from "../lib/forecast-gateway-types";

export class ForecastGatewayError extends Error {
  constructor(
    public readonly code:
      | "ML_UNAVAILABLE"
      | "ML_TIMEOUT"
      | "ML_INVALID_RESPONSE"
      | "ML_URL_ABSENT"
      | "FALLBACK_DISABLED"
      | "NONCANONICAL_UNAVAILABLE"
      | "NONCANONICAL_FEATURES_REQUIRED"
      | "BAD_REQUEST",
    message: string,
    public readonly status = 503,
    public readonly provenance?: ForecastProvenance,
  ) {
    super(message);
    this.name = "ForecastGatewayError";
  }
}

function assertFeaturesMatchRequest(
  features: MlForecastFeaturesInput,
  date: string,
  schoolId: string,
): void {
  if (features.school_id !== schoolId || features.date !== date) {
    throw new ForecastGatewayError(
      "BAD_REQUEST",
      "features.school_id and features.date must match schoolId and date",
      400,
    );
  }
}

export function resolveForecastFeatures(
  date: string,
  schoolId: string,
  features: MlForecastFeaturesInput | undefined,
): MlForecastFeaturesInput {
  if (isCanonicalForecastRequest(date, schoolId)) {
    return canonicalMlFeatures(schoolId);
  }
  if (!features) {
    throw new ForecastGatewayError(
      "NONCANONICAL_FEATURES_REQUIRED",
      "Noncanonical forecast requests must include a complete validated features object",
      422,
    );
  }
  assertFeaturesMatchRequest(features, date, schoolId);
  return features;
}

export function resolveWhatIfRequest(
  date: string,
  schoolId: string,
  features: MlForecastFeaturesInput | undefined,
  changes: Record<string, number | boolean | string> | undefined,
): { base: MlForecastFeaturesInput; changes: Record<string, number | boolean | string> } {
  if (isCanonicalForecastRequest(date, schoolId)) {
    return {
      base: canonicalMlFeatures(schoolId),
      changes: canonicalAttendanceCorrectionChanges(),
    };
  }
  if (!features || !changes) {
    throw new ForecastGatewayError(
      "NONCANONICAL_FEATURES_REQUIRED",
      "Noncanonical what-if requests must include explicit base features and changes",
      422,
    );
  }
  assertFeaturesMatchRequest(features, date, schoolId);
  return { base: features, changes };
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
  suppliedFeatures?: MlForecastFeaturesInput,
): Promise<{ forecast: Forecast; provenance: ForecastProvenance }> {
  const canonical = isCanonicalForecastRequest(date, schoolId);
  const features = resolveForecastFeatures(date, schoolId, suppliedFeatures);
  try {
    const { data } = await postMlForecast(features);
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
  suppliedFeatures?: MlForecastFeaturesInput,
  suppliedChanges?: Record<string, number | boolean | string>,
): Promise<{ forecast: Forecast; provenance: ForecastProvenance }> {
  const canonical = isCanonicalForecastRequest(date, schoolId);
  const { base, changes } = resolveWhatIfRequest(
    date,
    schoolId,
    suppliedFeatures,
    suppliedChanges,
  );

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
