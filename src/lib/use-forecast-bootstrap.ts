import { useEffect } from "react";
import { DEMO_FOCUS_DATE } from "./demo-date";
import { bootstrapFocusForecast, defaultForecastProvider } from "./forecast-client";
import { useStore } from "./store";

/** Loads the focus-day forecast once through the server gateway. */
export function useForecastBootstrap() {
  const { state, dispatch } = useStore();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (state.forecastLoadStatus === "loading" || state.forecastLoadStatus === "ready") return;

    dispatch({ type: "FORECAST_LOAD_START" });

    void bootstrapFocusForecast(
      defaultForecastProvider,
      DEMO_FOCUS_DATE,
      state.attendanceCorrected,
      ({ forecast, provenance }) => {
        dispatch({ type: "SET_FORECAST", forecast, provenance });
      },
      (message) => {
        dispatch({ type: "FORECAST_LOAD_ERROR", message });
      },
    );
  }, [dispatch, state.attendanceCorrected, state.forecastLoadStatus]);
}
