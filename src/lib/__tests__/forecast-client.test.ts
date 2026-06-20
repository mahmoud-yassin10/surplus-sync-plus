import { describe, expect, it } from "vitest";
import { defaultForecastProvider, HttpForecastProvider, LocalForecastProvider } from "../forecast-client";
import { DEMO_FOCUS_DATE } from "../demo-date";

describe("forecast-client", () => {
  it("local provider returns focus forecast offline", async () => {
    const provider = new LocalForecastProvider();
    const forecast = await provider.getForecast(DEMO_FOCUS_DATE);
    expect(forecast.expectedAttendance).toBe(528);
    const horizon = await provider.getHorizon();
    expect(horizon.length).toBeGreaterThan(0);
  });

  it("http provider is disabled placeholder", async () => {
    const provider = new HttpForecastProvider("http://localhost:8000");
    await expect(provider.getForecast(DEMO_FOCUS_DATE)).rejects.toThrow(/not enabled/i);
  });

  it("exports default local provider", () => {
    expect(defaultForecastProvider).toBeInstanceOf(LocalForecastProvider);
  });
});
