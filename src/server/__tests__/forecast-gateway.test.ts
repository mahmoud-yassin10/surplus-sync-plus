import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEMO_FOCUS_DATE } from "../../lib/demo-date";
import { FORECAST_THURSDAY } from "../../lib/mock";
import {
  gatewayGetAttendanceWhatIf,
  gatewayGetForecast,
  gatewayGetHealth,
} from "../forecast-gateway";

const canonicalMlResponse = {
  date: DEMO_FOCUS_DATE,
  expectedAttendance: 528,
  intervalLow: 497,
  intervalHigh: 557,
  recommendedPrep: 562,
  shortageProb: 0.016,
  largeSurplusProb: 0.12,
  preventableSurplus: 168,
  risk: "high",
  dataQuality: "high",
  modelVersion: "ssp-forecast-1.0",
  menu: FORECAST_THURSDAY.menu,
  influences: FORECAST_THURSDAY.influences,
  similarDays: FORECAST_THURSDAY.similarDays,
  approvalRequired: true,
  decisionStatus: "PROPOSED",
  safetyFloorApplied: true,
};

const correctedMlResponse = {
  ...canonicalMlResponse,
  expectedAttendance: 540,
  intervalLow: 512,
  intervalHigh: 568,
  recommendedPrep: 575,
  preventableSurplus: 155,
};

function mockEnv(overrides: Record<string, string | undefined>) {
  for (const [key, value] of Object.entries(overrides)) {
    if (value == null) delete process.env[key];
    else process.env[key] = value;
  }
}

describe("forecast-gateway", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo, init?: RequestInit) => {
        const url = String(input);
        if (url.endsWith("/health")) {
          return new Response(JSON.stringify({ status: "ok", modelLoaded: true }), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        }
        if (url.endsWith("/v1/forecast")) {
          return new Response(JSON.stringify(canonicalMlResponse), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        }
        if (url.endsWith("/v1/what-if")) {
          return new Response(JSON.stringify(correctedMlResponse), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        }
        return new Response("not found", { status: 404 });
      }),
    );
    mockEnv({
      ML_SERVICE_URL: "http://127.0.0.1:8000",
      ML_REQUEST_TIMEOUT_MS: "5000",
      ALLOW_FORECAST_FALLBACK: "true",
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    mockEnv({
      ML_SERVICE_URL: undefined,
      ML_REQUEST_TIMEOUT_MS: undefined,
      ALLOW_FORECAST_FALLBACK: undefined,
    });
  });

  it("returns canonical forecast through the gateway from ML", async () => {
    const result = await gatewayGetForecast(DEMO_FOCUS_DATE, "lhphs");
    expect(result.provenance.source).toBe("ml");
    expect(result.forecast.expectedAttendance).toBe(528);
    expect(result.forecast.recommendedPrep).toBe(562);
    expect(result.provenance.decisionStatus).toBe("PROPOSED");
  });

  it("returns corrected attendance what-if from ML", async () => {
    const result = await gatewayGetAttendanceWhatIf(DEMO_FOCUS_DATE, "lhphs");
    expect(result.provenance.source).toBe("ml");
    expect(result.forecast.expectedAttendance).toBe(540);
    expect(result.forecast.recommendedPrep).toBe(575);
  });

  it("falls back when ML what-if returns non-corrected canonical values", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo) => {
        const url = String(input);
        if (url.endsWith("/v1/what-if") || url.endsWith("/v1/forecast")) {
          return new Response(JSON.stringify(canonicalMlResponse), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        }
        return new Response("not found", { status: 404 });
      }),
    );
    const result = await gatewayGetAttendanceWhatIf(DEMO_FOCUS_DATE, "lhphs");
    expect(result.provenance.source).toBe("local-canonical-fallback");
    expect(result.forecast.expectedAttendance).toBe(540);
    expect(result.forecast.recommendedPrep).toBe(575);
  });

  it("rejects malformed ML responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ date: DEMO_FOCUS_DATE }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );
    await expect(gatewayGetForecast(DEMO_FOCUS_DATE, "lhphs")).rejects.toMatchObject({
      code: "ML_INVALID_RESPONSE",
    });
  });

  it("uses canonical fallback when ML is unavailable and fallback enabled", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("down", { status: 503 })),
    );
    const result = await gatewayGetForecast(DEMO_FOCUS_DATE, "lhphs");
    expect(result.provenance.source).toBe("local-canonical-fallback");
    expect(result.provenance.fallbackUsed).toBe(true);
    expect(result.forecast.expectedAttendance).toBe(528);
  });

  it("does not fabricate noncanonical fallback", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("down", { status: 503 })),
    );
    await expect(gatewayGetForecast("2026-03-13", "lhphs")).rejects.toMatchObject({
      code: "NONCANONICAL_UNAVAILABLE",
    });
  });

  it("fails canonical when fallback disabled", async () => {
    mockEnv({ ALLOW_FORECAST_FALLBACK: "false" });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("down", { status: 503 })),
    );
    await expect(gatewayGetForecast(DEMO_FOCUS_DATE, "lhphs")).rejects.toMatchObject({
      code: "FALLBACK_DISABLED",
    });
  });

  it("reports unavailable health when ML URL absent", async () => {
    mockEnv({ ML_SERVICE_URL: undefined });
    const health = await gatewayGetHealth();
    expect(health.mlServiceConfigured).toBe(false);
    expect(health.mlServiceReachable).toBe(false);
    expect(health.gateway).toBe("surplussync-plus");
  });

  it("times out slow ML responses and falls back for canonical", async () => {
    mockEnv({ ML_REQUEST_TIMEOUT_MS: "10" });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_input: RequestInfo, init?: RequestInit) => {
        await new Promise((_, reject) => {
          const signal = init?.signal;
          if (signal?.aborted) {
            reject(new DOMException("Aborted", "AbortError"));
            return;
          }
          signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        });
        return new Response("late", { status: 200 });
      }),
    );
    const result = await gatewayGetForecast(DEMO_FOCUS_DATE, "lhphs");
    expect(result.provenance.fallbackUsed).toBe(true);
  });
});
