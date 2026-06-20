import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearSessionCookieHeader,
  CopilotGatewayError,
  gatewayHealth,
  gatewayReset,
  gatewaySendMessage,
  getSessionIdFromRequest,
  sessionCookieHeader,
} from "../copilot-gateway";
import { buildReconciliationSnapshot } from "../../lib/copilot-snapshot";
import { INITIAL } from "../../lib/store";

const snapshot = buildReconciliationSnapshot(INITIAL);
const sessionId = "22222222-2222-4222-8222-222222222222";

const structuredResponse = {
  answer: "Thursday is high risk.",
  answerType: "EXPLANATION",
  evidence: [],
  provenance: [],
  uncertainty: { level: "LOW", explanation: "Test" },
  limitations: [],
  toolCalls: [],
  proposedActions: [],
  requiresHumanApproval: false,
};

function mockFetch(handler: (url: string, init?: RequestInit) => Response | Promise<Response>) {
  vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    return handler(url, init);
  }));
}

describe("copilot gateway", () => {
  beforeEach(() => {
    process.env.COPILOT_SERVICE_URL = "http://127.0.0.1:3001";
    process.env.COPILOT_SERVICE_TOKEN = "test-token";
    process.env.COPILOT_REQUEST_TIMEOUT_MS = "10000";
  });

  afterEach(() => {
    delete process.env.COPILOT_SERVICE_URL;
    delete process.env.COPILOT_SERVICE_TOKEN;
    delete process.env.COPILOT_REQUEST_TIMEOUT_MS;
    vi.unstubAllGlobals();
  });

  it("reports missing service URL", async () => {
    delete process.env.COPILOT_SERVICE_URL;
    const res = await gatewayHealth();
    const body = await res.json();
    expect(body.configured).toBe(false);
    expect(body.status).toBe("missing_url");
  });

  it("reports missing token", async () => {
    delete process.env.COPILOT_SERVICE_TOKEN;
    const res = await gatewayHealth();
    const body = await res.json();
    expect(body.configured).toBe(false);
    expect(body.status).toBe("missing_token");
  });

  it("uses HttpOnly SameSite session cookie", () => {
    expect(sessionCookieHeader(sessionId)).toContain("HttpOnly");
    expect(sessionCookieHeader(sessionId)).toContain("SameSite=Lax");
    expect(clearSessionCookieHeader()).toContain("Max-Age=0");
  });

  it("reads session id from request cookies", () => {
    const request = new Request("http://localhost", {
      headers: { cookie: `ssp_copilot_session=${sessionId}` },
    });
    expect(getSessionIdFromRequest(request)).toBe(sessionId);
  });

  it("reconciles before message and creates lazy session", async () => {
    const calls: string[] = [];
    mockFetch((url, init) => {
      calls.push(`${init?.method ?? "GET"} ${url}`);
      if (url.endsWith("/api/session") && init?.method === "POST") {
        return new Response(
          JSON.stringify({
            sessionId,
            state: { sessionId, role: "CAFETERIA_MANAGER", proposals: [] },
          }),
          { status: 201 },
        );
      }
      if (url.includes("/reconcile")) {
        return new Response(
          JSON.stringify({
            state: { sessionId, role: "CAFETERIA_MANAGER", proposals: [] },
            changed: true,
            idempotent: false,
          }),
          { status: 200 },
        );
      }
      if (url.endsWith("/state")) {
        return new Response(
          JSON.stringify({
            state: { sessionId, role: "CAFETERIA_MANAGER", proposals: [] },
          }),
          { status: 200 },
        );
      }
      if (url.endsWith("/api/copilot")) {
        return new Response(
          JSON.stringify({
            result: structuredResponse,
            state: { sessionId, role: "CAFETERIA_MANAGER", proposals: [] },
            mode: "GEMINI_LIVE",
          }),
          { status: 200 },
        );
      }
      return new Response("{}", { status: 404 });
    });

    const request = new Request("http://localhost/api/copilot/message", { method: "POST" });
    const response = await gatewaySendMessage(request, "Why is Thursday high risk?", snapshot);
    expect(response.status).toBe(200);
    expect(calls.some((c) => c.includes("/reconcile"))).toBe(true);
    expect(calls.some((c) => c.includes("POST") && c.includes("/api/session"))).toBe(true);
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
  });

  it("sanitizes malformed upstream response", async () => {
    mockFetch(() => new Response("not-json", { status: 200 }));
    const request = new Request("http://localhost", {
      headers: { cookie: `ssp_copilot_session=${sessionId}` },
    });
    await expect(gatewaySendMessage(request, "hello", snapshot)).rejects.toMatchObject({
      code: "COPILOT_INVALID_RESPONSE",
    });
  });

  it("retries message once after lost backend session", async () => {
    let copilotCalls = 0;
    mockFetch((url, init) => {
      if (url.endsWith("/api/session") && init?.method === "POST") {
        return new Response(
          JSON.stringify({
            sessionId,
            state: { sessionId, role: "CAFETERIA_MANAGER", proposals: [] },
          }),
          { status: 201 },
        );
      }
      if (url.includes("/reconcile") || url.endsWith("/state")) {
        return new Response(
          JSON.stringify({
            state: { sessionId, role: "CAFETERIA_MANAGER", proposals: [] },
            changed: false,
            idempotent: true,
          }),
          { status: 200 },
        );
      }
      if (url.endsWith("/api/copilot")) {
        copilotCalls += 1;
        if (copilotCalls === 1) {
          return new Response(JSON.stringify({ error: "Session not found" }), { status: 404 });
        }
        return new Response(
          JSON.stringify({
            result: structuredResponse,
            state: { sessionId, role: "CAFETERIA_MANAGER", proposals: [] },
            mode: "MOCK_FALLBACK",
          }),
          { status: 200 },
        );
      }
      return new Response("{}", { status: 404 });
    });

    const request = new Request("http://localhost", {
      headers: { cookie: `ssp_copilot_session=${sessionId}` },
    });
    const response = await gatewaySendMessage(request, "retry once", snapshot);
    expect(response.status).toBe(200);
    expect(copilotCalls).toBe(2);
  });

  it("reset clears cookie and deletes backend session", async () => {
    let deleted = false;
    mockFetch((url, init) => {
      if (url.includes("/integration/session") && init?.method === "DELETE") {
        deleted = true;
        return new Response(null, { status: 204 });
      }
      return new Response("{}", { status: 404 });
    });
    const request = new Request("http://localhost", {
      headers: { cookie: `ssp_copilot_session=${sessionId}` },
    });
    const response = await gatewayReset(request);
    expect(deleted).toBe(true);
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
  });

  it("never exposes service token in error payloads", () => {
    const error = new CopilotGatewayError("COPILOT_UNAVAILABLE", "Unavailable", 503);
    expect(error.message).not.toContain("test-token");
  });
});

describe("browser bundle secrets", () => {
  it("does not embed copilot service url in client modules", () => {
    const clientSource = readFileSync(
      new URL("../../lib/copilot-client.ts", import.meta.url),
      "utf8",
    );
    const configSource = readFileSync(
      new URL("../copilot-config.ts", import.meta.url),
      "utf8",
    );
    expect(clientSource).not.toContain("COPILOT_SERVICE_URL");
    expect(clientSource).not.toContain("COPILOT_SERVICE_TOKEN");
    expect(configSource).toContain("COPILOT_SERVICE_URL");
  });
});
