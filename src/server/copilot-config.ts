export type CopilotConfigStatus = "ready" | "missing_url" | "missing_token";

function readTimeoutMs(): number {
  const raw = process.env.COPILOT_REQUEST_TIMEOUT_MS;
  const parsed = raw ? Number.parseInt(raw, 10) : 10_000;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 10_000;
}

export const copilotConfig = {
  get status(): CopilotConfigStatus {
    if (!process.env.COPILOT_SERVICE_URL?.trim()) return "missing_url";
    if (!process.env.COPILOT_SERVICE_TOKEN?.trim()) return "missing_token";
    return "ready";
  },

  get isConfigured(): boolean {
    return this.status === "ready";
  },

  get requestTimeoutMs(): number {
    return readTimeoutMs();
  },
};

/** Server-only — never import from client bundles. */
export function requireCopilotServiceUrl(): string {
  const url = process.env.COPILOT_SERVICE_URL?.trim();
  if (!url) {
    throw new Error("COPILOT_SERVICE_URL is not configured");
  }
  return url.replace(/\/$/, "");
}

/** Server-only — never log or expose this value. */
export function requireCopilotServiceToken(): string {
  const token = process.env.COPILOT_SERVICE_TOKEN?.trim();
  if (!token) {
    throw new Error("COPILOT_SERVICE_TOKEN is not configured");
  }
  return token;
}
