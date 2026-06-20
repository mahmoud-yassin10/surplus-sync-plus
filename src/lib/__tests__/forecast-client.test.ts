import { describe, expect, it, vi, beforeEach } from "vitest";
import { HttpForecastProvider, LocalForecastProvider, resetForecastBootstrapForTests } from "../forecast-client";
import { DEMO_FOCUS_DATE } from "../demo-date";
import { INITIAL, reducer } from "../store";
import { buildRecommendationKey } from "../forecast";

describe("forecast-client", () => {
  beforeEach(() => {
    resetForecastBootstrapForTests();
  });

  it("local provider returns focus forecast offline", async () => {
    const provider = new LocalForecastProvider();
    const { forecast } = await provider.getForecast(DEMO_FOCUS_DATE);
    expect(forecast.expectedAttendance).toBe(528);
    const horizon = await provider.getHorizon();
    expect(horizon.length).toBeGreaterThan(0);
  });

  it("http provider calls only the SurplusSync gateway", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo) => {
      const url = String(input);
      expect(url).toMatch(/^\/api\/forecast/);
      expect(url).not.toContain("8000");
      expect(url).not.toContain("/v1/");
      return new Response(
        JSON.stringify({
          forecast: {
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
            menu: [],
            influences: [],
            similarDays: [],
          },
          provenance: {
            source: "ml",
            mlReachable: true,
            fallbackUsed: false,
            decisionStatus: "PROPOSED",
            approvalRequired: true,
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = new HttpForecastProvider();
    const { forecast, provenance } = await provider.getForecast(DEMO_FOCUS_DATE);
    expect(forecast.recommendedPrep).toBe(562);
    expect(provenance.source).toBe("ml");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/forecast",
      expect.objectContaining({ method: "POST" }),
    );
    vi.unstubAllGlobals();
  });

  it("http what-if uses gateway route", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo) => {
      expect(String(input)).toBe("/api/forecast/what-if");
      return new Response(
        JSON.stringify({
          forecast: {
            date: DEMO_FOCUS_DATE,
            expectedAttendance: 540,
            intervalLow: 512,
            intervalHigh: 568,
            recommendedPrep: 575,
            shortageProb: 0.016,
            largeSurplusProb: 0.12,
            preventableSurplus: 155,
            risk: "high",
            dataQuality: "high",
            modelVersion: "ssp-forecast-1.0",
            menu: [],
            influences: [],
            similarDays: [],
          },
          provenance: {
            source: "ml",
            mlReachable: true,
            fallbackUsed: false,
            decisionStatus: "PROPOSED",
            approvalRequired: true,
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    });
    vi.stubGlobal("fetch", fetchMock);
    const provider = new HttpForecastProvider();
    const { forecast } = await provider.getAttendanceWhatIf(DEMO_FOCUS_DATE);
    expect(forecast.expectedAttendance).toBe(540);
    vi.unstubAllGlobals();
  });
});

describe("forecast store integration", () => {
  it("SET_FORECAST keeps approval when recommendation key unchanged", () => {
    const approved = reducer(INITIAL, { type: "APPLY_RECOMMENDATION" });
    const key = buildRecommendationKey(approved.forecast);
    expect(approved.approvedRecommendationKey).toBe(key);

    const refreshed = reducer(approved, {
      type: "SET_FORECAST",
      forecast: { ...approved.forecast },
      provenance: {
        source: "ml",
        mlReachable: true,
        fallbackUsed: false,
        decisionStatus: "PROPOSED",
        approvalRequired: true,
      },
    });
    expect(refreshed.approvedRecommendationKey).toBe(key);
    expect(refreshed.forecastLoadStatus).toBe("ready");
  });

  it("SET_FORECAST clears approval when recommendation changes", () => {
    const approved = reducer(INITIAL, { type: "APPLY_RECOMMENDATION" });
    const changed = reducer(approved, {
      type: "SET_FORECAST",
      forecast: { ...approved.forecast, recommendedPrep: 575, expectedAttendance: 540 },
      provenance: {
        source: "ml",
        mlReachable: true,
        fallbackUsed: false,
        decisionStatus: "PROPOSED",
        approvalRequired: true,
      },
    });
    expect(changed.approvedRecommendationKey).toBeNull();
  });

  it("APPLY_RECOMMENDATION idempotency remains intact after SET_FORECAST", () => {
    let state = reducer(INITIAL, {
      type: "SET_FORECAST",
      forecast: INITIAL.forecast,
      provenance: {
        source: "ml",
        mlReachable: true,
        fallbackUsed: false,
        decisionStatus: "PROPOSED",
        approvalRequired: true,
      },
    });
    state = reducer(state, { type: "APPLY_RECOMMENDATION" });
    const once = state;
    state = reducer(state, { type: "APPLY_RECOMMENDATION" });
    expect(state).toBe(once);
  });
});
