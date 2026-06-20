/** Server-only ML gateway configuration — never import from client bundles. */

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  return value === "" ? undefined : value;
}

function readBool(name: string, defaultValue: boolean): boolean {
  const raw = readEnv(name);
  if (raw == null) return defaultValue;
  return raw === "1" || raw.toLowerCase() === "true";
}

function readInt(name: string, defaultValue: number): number {
  const raw = readEnv(name);
  if (raw == null) return defaultValue;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : defaultValue;
}

export const mlConfig = {
  get serviceUrl(): string | undefined {
    return readEnv("ML_SERVICE_URL");
  },
  get requestTimeoutMs(): number {
    return readInt("ML_REQUEST_TIMEOUT_MS", 5000);
  },
  get allowForecastFallback(): boolean {
    return readBool("ALLOW_FORECAST_FALLBACK", true);
  },
} as const;
