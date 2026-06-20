import { z } from "zod";
import { mlConfig } from "./ml-config";
import type { MlForecastFeaturesInput } from "../lib/forecast-gateway-types";
import { mlForecastFeaturesInputSchema } from "../lib/forecast-gateway-types";
import {
  mlForecastResponseSchema,
  mlHealthResponseSchema,
  mlWhatIfRequestSchema,
  type MlForecastResponse,
} from "./ml-schemas";
import { MlClientError } from "./forecast-mapper";

export interface MlFetchResult<T> {
  data: T;
  reachable: boolean;
}

async function fetchMl<T>(
  path: string,
  init: RequestInit,
  parse: (json: unknown) => T,
): Promise<MlFetchResult<T>> {
  const baseUrl = mlConfig.serviceUrl;
  if (!baseUrl) {
    throw new MlClientError("ML_URL_ABSENT", "ML_SERVICE_URL is not configured");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), mlConfig.requestTimeoutMs);

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        ...(init.headers ?? {}),
      },
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new MlClientError(
        "ML_UNAVAILABLE",
        detail || `ML service responded with ${response.status}`,
        response.status,
      );
    }

    const json: unknown = await response.json();
    try {
      return { data: parse(json), reachable: true };
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new MlClientError("ML_INVALID_RESPONSE", "ML service returned malformed forecast payload");
      }
      throw error;
    }
  } catch (error) {
    if (error instanceof MlClientError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new MlClientError("ML_TIMEOUT", `ML request timed out after ${mlConfig.requestTimeoutMs}ms`);
    }
    throw new MlClientError(
      "ML_UNAVAILABLE",
      error instanceof Error ? error.message : "ML service request failed",
    );
  } finally {
    clearTimeout(timeout);
  }
}

export async function postMlForecast(
  features: MlForecastFeaturesInput,
): Promise<MlFetchResult<MlForecastResponse>> {
  const body = mlForecastFeaturesInputSchema.parse(features);
  return fetchMl("/v1/forecast", { method: "POST", body: JSON.stringify(body) }, (json) =>
    mlForecastResponseSchema.parse(json),
  );
}

export async function postMlWhatIf(
  base: MlForecastFeaturesInput,
  changes: Record<string, number | boolean | string>,
): Promise<MlFetchResult<MlForecastResponse>> {
  const body = mlWhatIfRequestSchema.parse({ base, changes });
  return fetchMl("/v1/what-if", { method: "POST", body: JSON.stringify(body) }, (json) =>
    mlForecastResponseSchema.parse(json),
  );
}

export async function getMlHealth(): Promise<MlFetchResult<{ status: string; modelLoaded: boolean }>> {
  const baseUrl = mlConfig.serviceUrl;
  if (!baseUrl) {
    throw new MlClientError("ML_URL_ABSENT", "ML_SERVICE_URL is not configured");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), mlConfig.requestTimeoutMs);

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/health`, {
      method: "GET",
      signal: controller.signal,
      headers: { accept: "application/json" },
    });

    if (!response.ok) {
      throw new MlClientError("ML_UNAVAILABLE", `ML health responded with ${response.status}`, response.status);
    }

    const json: unknown = await response.json();
    const parsed = mlHealthResponseSchema.parse(json);
    return {
      data: { status: parsed.status, modelLoaded: parsed.modelLoaded ?? false },
      reachable: true,
    };
  } catch (error) {
    if (error instanceof MlClientError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new MlClientError("ML_TIMEOUT", `ML health check timed out after ${mlConfig.requestTimeoutMs}ms`);
    }
    throw new MlClientError(
      "ML_UNAVAILABLE",
      error instanceof Error ? error.message : "ML health check failed",
    );
  } finally {
    clearTimeout(timeout);
  }
}
