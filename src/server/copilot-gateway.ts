import {
  copilotConfig,
  requireCopilotServiceToken,
  requireCopilotServiceUrl,
} from "./copilot-config";
import {
  copilotBackendSessionStateSchema,
  copilotMessageResponseSchema,
  copilotReconciliationResponseSchema,
  copilotStructuredResponseSchema,
  type ReconciliationSnapshot,
} from "../lib/copilot-contracts";
import { z } from "zod";

export const COPILOT_SESSION_COOKIE = "ssp_copilot_session";

export class CopilotGatewayError extends Error {
  constructor(
    public readonly code:
      | "COPILOT_UNAVAILABLE"
      | "COPILOT_TIMEOUT"
      | "COPILOT_INVALID_RESPONSE"
      | "COPILOT_UPSTREAM_ERROR"
      | "COPILOT_SESSION_LOST"
      | "COPILOT_CONFLICT"
      | "BAD_REQUEST",
    message: string,
    public readonly status = 503,
  ) {
    super(message);
    this.name = "CopilotGatewayError";
  }
}

export function getSessionIdFromRequest(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader.match(/(?:^|;\s*)ssp_copilot_session=([^;]+)/);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

export function sessionCookieHeader(sessionId: string): string {
  return `ssp_copilot_session=${encodeURIComponent(sessionId)}; Path=/; HttpOnly; SameSite=Lax`;
}

export function clearSessionCookieHeader(): string {
  return "ssp_copilot_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0";
}

function withSessionCookie(response: Response, sessionId: string | null, clear = false): Response {
  const headers = new Headers(response.headers);
  if (clear) {
    headers.append("Set-Cookie", clearSessionCookieHeader());
  } else if (sessionId) {
    headers.append("Set-Cookie", sessionCookieHeader(sessionId));
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function assertConfigured(): void {
  if (!copilotConfig.isConfigured) {
    throw new CopilotGatewayError(
      "COPILOT_UNAVAILABLE",
      copilotConfig.status === "missing_url"
        ? "Copilot service URL is not configured"
        : "Copilot service token is not configured",
      503,
    );
  }
}

async function upstreamFetch(
  path: string,
  init: RequestInit & { authenticated?: boolean } = {},
): Promise<Response> {
  assertConfigured();
  const baseUrl = requireCopilotServiceUrl();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), copilotConfig.requestTimeoutMs);
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (init.authenticated) {
    headers.set("Authorization", `Bearer ${requireCopilotServiceToken()}`);
  }
  try {
    return await fetch(`${baseUrl}${path}`, {
      ...init,
      headers,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new CopilotGatewayError("COPILOT_TIMEOUT", "Copilot service request timed out", 504);
    }
    throw new CopilotGatewayError("COPILOT_UNAVAILABLE", "Copilot service is unreachable", 503);
  } finally {
    clearTimeout(timeout);
  }
}

async function readUpstreamJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new CopilotGatewayError(
      "COPILOT_INVALID_RESPONSE",
      "Copilot service returned malformed JSON",
      502,
    );
  }
}

function sanitizeUpstreamError(status: number, body: unknown): CopilotGatewayError {
  const parsed = z.object({ error: z.string().optional() }).safeParse(body);
  const upstreamMessage = parsed.success ? parsed.data.error : undefined;
  if (status === 404) {
    return new CopilotGatewayError("COPILOT_SESSION_LOST", "Copilot session was not found", 404);
  }
  if (status === 409) {
    return new CopilotGatewayError(
      "COPILOT_CONFLICT",
      upstreamMessage ?? "Proposal state conflict",
      409,
    );
  }
  if (status >= 400 && status < 500) {
    return new CopilotGatewayError(
      "COPILOT_UPSTREAM_ERROR",
      upstreamMessage ?? "Copilot request was rejected",
      status,
    );
  }
  return new CopilotGatewayError(
    "COPILOT_UPSTREAM_ERROR",
    upstreamMessage ?? "Copilot service error",
    status >= 500 ? 502 : status,
  );
}

async function expectUpstreamJson<T>(
  response: Response,
  schema: z.ZodType<T>,
): Promise<T> {
  const body = await readUpstreamJson(response);
  if (!response.ok) {
    throw sanitizeUpstreamError(response.status, body);
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new CopilotGatewayError(
      "COPILOT_INVALID_RESPONSE",
      "Copilot service returned an unexpected payload",
      502,
    );
  }
  return parsed.data;
}

const createSessionUpstreamSchema = z.object({
  sessionId: z.string().uuid(),
  state: copilotBackendSessionStateSchema,
});

const copilotTurnUpstreamSchema = z.object({
  result: copilotStructuredResponseSchema,
  state: copilotBackendSessionStateSchema,
  mode: z.enum(["GEMINI_LIVE", "MOCK_FALLBACK"]),
  warning: z.string().optional(),
});

const proposalActionUpstreamSchema = z.object({
  state: copilotBackendSessionStateSchema,
});

const configUpstreamSchema = z.object({
  hasGeminiApiKey: z.boolean(),
});

export function deriveMlSource(
  state: z.infer<typeof copilotBackendSessionStateSchema> | undefined,
): "live-ml" | "canonical-fallback" | "session-state" {
  const source = state?.forecast?.provenance?.source;
  if (source === "ml") return "live-ml";
  if (source === "local-canonical-fallback") return "canonical-fallback";
  return "session-state";
}

export async function upstreamCreateSession(
  role: ReconciliationSnapshot["role"],
): Promise<string> {
  const response = await upstreamFetch("/api/session", {
    method: "POST",
    body: JSON.stringify({ role }),
  });
  const data = await expectUpstreamJson(response, createSessionUpstreamSchema);
  return data.sessionId;
}

export async function upstreamReconcile(
  sessionId: string,
  snapshot: ReconciliationSnapshot,
): Promise<z.infer<typeof copilotReconciliationResponseSchema>> {
  const response = await upstreamFetch(`/api/integration/session/${sessionId}/reconcile`, {
    method: "POST",
    authenticated: true,
    body: JSON.stringify(snapshot),
  });
  return expectUpstreamJson(response, copilotReconciliationResponseSchema);
}

export async function upstreamUpdateRole(
  sessionId: string,
  role: ReconciliationSnapshot["role"],
): Promise<void> {
  const response = await upstreamFetch(`/api/session/${sessionId}/role`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
  if (!response.ok) {
    const body = await readUpstreamJson(response);
    throw sanitizeUpstreamError(response.status, body);
  }
}

export async function upstreamGetState(
  sessionId: string,
): Promise<z.infer<typeof copilotBackendSessionStateSchema> | null> {
  const response = await upstreamFetch(`/api/session/${sessionId}/state`, { method: "GET" });
  if (response.status === 404) return null;
  const data = await expectUpstreamJson(
    response,
    z.object({ state: copilotBackendSessionStateSchema }),
  );
  return data.state;
}

export async function upstreamSendMessage(
  sessionId: string,
  message: string,
): Promise<z.infer<typeof copilotMessageResponseSchema>> {
  const response = await upstreamFetch("/api/copilot", {
    method: "POST",
    body: JSON.stringify({ sessionId, message }),
  });
  const data = await expectUpstreamJson(response, copilotTurnUpstreamSchema);
  return {
    response: data.result,
    mode: data.mode,
    mlSource: deriveMlSource(data.state),
    sessionState: data.state,
    warning: data.warning,
  };
}

export async function upstreamApproveProposal(
  sessionId: string,
  proposalId: string,
): Promise<z.infer<typeof copilotBackendSessionStateSchema>> {
  const response = await upstreamFetch(
    `/api/session/${sessionId}/proposals/${proposalId}/approve`,
    { method: "POST", body: JSON.stringify({}) },
  );
  const data = await expectUpstreamJson(response, proposalActionUpstreamSchema);
  return data.state;
}

export async function upstreamRejectProposal(
  sessionId: string,
  proposalId: string,
): Promise<z.infer<typeof copilotBackendSessionStateSchema>> {
  const response = await upstreamFetch(
    `/api/session/${sessionId}/proposals/${proposalId}/reject`,
    { method: "POST", body: JSON.stringify({}) },
  );
  const data = await expectUpstreamJson(response, proposalActionUpstreamSchema);
  return data.state;
}

export async function upstreamDeleteSession(sessionId: string): Promise<boolean> {
  const response = await upstreamFetch(`/api/integration/session/${sessionId}`, {
    method: "DELETE",
    authenticated: true,
  });
  if (response.status === 404) return false;
  if (!response.ok) {
    const body = await readUpstreamJson(response);
    throw sanitizeUpstreamError(response.status, body);
  }
  return true;
}

export async function upstreamProbeHealth(): Promise<{
  reachable: boolean;
  geminiLive: boolean;
}> {
  if (!copilotConfig.isConfigured) {
    return { reachable: false, geminiLive: false };
  }
  try {
    const response = await upstreamFetch("/api/config", { method: "GET" });
    if (!response.ok) return { reachable: false, geminiLive: false };
    const data = await expectUpstreamJson(response, configUpstreamSchema);
    return { reachable: true, geminiLive: data.hasGeminiApiKey };
  } catch {
    return { reachable: false, geminiLive: false };
  }
}

async function ensureSessionWithSnapshot(
  request: Request,
  snapshot: ReconciliationSnapshot,
): Promise<{ sessionId: string; created: boolean }> {
  let sessionId = getSessionIdFromRequest(request);
  let created = false;
  if (!sessionId) {
    sessionId = await upstreamCreateSession(snapshot.role);
    created = true;
  }
  await upstreamReconcile(sessionId, snapshot);
  const state = await upstreamGetState(sessionId);
  if (state && state.role !== snapshot.role) {
    await upstreamUpdateRole(sessionId, snapshot.role);
    await upstreamReconcile(sessionId, snapshot);
  }
  return { sessionId, created };
}

export async function gatewayEnsureSession(
  request: Request,
  snapshot: ReconciliationSnapshot,
): Promise<Response> {
  const { sessionId, created } = await ensureSessionWithSnapshot(request, snapshot);
  const json = Response.json({ ready: true as const });
  return created ? withSessionCookie(json, sessionId) : json;
}

export async function gatewayGetState(request: Request): Promise<Response> {
  assertConfigured();
  const sessionId = getSessionIdFromRequest(request);
  if (!sessionId) {
    return Response.json({ state: null, hasSession: false });
  }
  const state = await upstreamGetState(sessionId);
  if (!state) {
    return withSessionCookie(
      Response.json({ state: null, hasSession: false }),
      null,
      true,
    );
  }
  return Response.json({ state, hasSession: true });
}

export async function gatewaySendMessage(
  request: Request,
  message: string,
  snapshot: ReconciliationSnapshot,
): Promise<Response> {
  let sessionId = getSessionIdFromRequest(request);
  let created = false;
  let retried = false;

  async function runTurn(activeSessionId: string) {
    await upstreamReconcile(activeSessionId, snapshot);
    const state = await upstreamGetState(activeSessionId);
    if (state && state.role !== snapshot.role) {
      await upstreamUpdateRole(activeSessionId, snapshot.role);
      await upstreamReconcile(activeSessionId, snapshot);
    }
    return upstreamSendMessage(activeSessionId, message);
  }

  try {
    if (!sessionId) {
      sessionId = await upstreamCreateSession(snapshot.role);
      created = true;
    }
    const result = await runTurn(sessionId);
    const json = Response.json(result);
    return created ? withSessionCookie(json, sessionId) : json;
  } catch (error) {
    if (
      !retried &&
      error instanceof CopilotGatewayError &&
      error.code === "COPILOT_SESSION_LOST"
    ) {
      retried = true;
      sessionId = await upstreamCreateSession(snapshot.role);
      created = true;
      const result = await runTurn(sessionId);
      const json = Response.json(result);
      return withSessionCookie(json, sessionId);
    }
    throw error;
  }
}

export async function gatewayApproveProposal(
  request: Request,
  proposalId: string,
  snapshot: ReconciliationSnapshot,
): Promise<Response> {
  const sessionId = getSessionIdFromRequest(request);
  if (!sessionId) {
    throw new CopilotGatewayError("COPILOT_SESSION_LOST", "No Copilot session cookie", 404);
  }
  await upstreamReconcile(sessionId, snapshot);
  const state = await upstreamGetState(sessionId);
  if (state && state.role !== snapshot.role) {
    await upstreamUpdateRole(sessionId, snapshot.role);
    await upstreamReconcile(sessionId, snapshot);
  }
  const updated = await upstreamApproveProposal(sessionId, proposalId);
  const proposal = updated.proposals.find((p) => p.proposalId === proposalId);
  if (!proposal) {
    throw new CopilotGatewayError("COPILOT_INVALID_RESPONSE", "Approved proposal not found", 502);
  }
  return Response.json({ state: updated, proposal });
}

export async function gatewayRejectProposal(
  request: Request,
  proposalId: string,
  snapshot: ReconciliationSnapshot,
): Promise<Response> {
  const sessionId = getSessionIdFromRequest(request);
  if (!sessionId) {
    throw new CopilotGatewayError("COPILOT_SESSION_LOST", "No Copilot session cookie", 404);
  }
  await upstreamReconcile(sessionId, snapshot);
  const state = await upstreamGetState(sessionId);
  if (state && state.role !== snapshot.role) {
    await upstreamUpdateRole(sessionId, snapshot.role);
    await upstreamReconcile(sessionId, snapshot);
  }
  const updated = await upstreamRejectProposal(sessionId, proposalId);
  const proposal = updated.proposals.find((p) => p.proposalId === proposalId);
  if (!proposal) {
    throw new CopilotGatewayError("COPILOT_INVALID_RESPONSE", "Rejected proposal not found", 502);
  }
  return Response.json({ state: updated, proposal });
}

export async function gatewayReset(request: Request): Promise<Response> {
  const sessionId = getSessionIdFromRequest(request);
  if (sessionId && copilotConfig.isConfigured) {
    try {
      await upstreamDeleteSession(sessionId);
    } catch {
      /* best-effort delete */
    }
  }
  return withSessionCookie(Response.json({ ok: true }), null, true);
}

export async function gatewayHealth(): Promise<Response> {
  const status = copilotConfig.status;
  const configured = copilotConfig.isConfigured;
  const probe = configured ? await upstreamProbeHealth() : { reachable: false, geminiLive: false };
  const healthStatus = !configured
    ? status
    : probe.reachable
      ? "ready"
      : "unreachable";
  return Response.json({
    configured,
    reachable: probe.reachable,
    modes: {
      geminiLive: probe.geminiLive,
      deterministicFallback: true,
    },
    status: healthStatus,
  });
}

export function copilotErrorResponse(error: unknown): Response {
  if (error instanceof CopilotGatewayError) {
    return Response.json(
      { error: { code: error.code, message: error.message } },
      { status: error.status },
    );
  }
  return Response.json(
    { error: { code: "COPILOT_UNAVAILABLE", message: "Copilot request failed" } },
    { status: 503 },
  );
}

export { withSessionCookie };
