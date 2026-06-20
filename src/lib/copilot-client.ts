import { z } from "zod";
import {
  copilotApprovalResponseSchema,
  copilotGatewayErrorSchema,
  copilotHealthResponseSchema,
  copilotMessageResponseSchema,
  copilotStateResponseSchema,
  type CopilotHealthResponse,
  type CopilotMessageResponse,
  type CopilotProposal,
  type ReconciliationSnapshot,
} from "./copilot-contracts";

export class CopilotClientError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 503,
  ) {
    super(message);
    this.name = "CopilotClientError";
  }
}

async function readJson<T>(response: Response, schema: z.ZodType<T>): Promise<T> {
  const json: unknown = await response.json();
  if (!response.ok) {
    const err = copilotGatewayErrorSchema.safeParse(json);
    if (err.success) {
      throw new CopilotClientError(err.data.error.code, err.data.error.message, response.status);
    }
    throw new CopilotClientError("COPILOT_UNAVAILABLE", "Copilot request failed", response.status);
  }
  return schema.parse(json);
}

export async function ensureCopilotSession(snapshot: ReconciliationSnapshot): Promise<void> {
  await readJson(
    await fetch("/api/copilot/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ snapshot }),
    }),
    z.object({ ready: z.literal(true) }),
  );
}

export async function sendCopilotMessage(
  message: string,
  snapshot: ReconciliationSnapshot,
): Promise<CopilotMessageResponse> {
  return readJson(
    await fetch("/api/copilot/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ message, snapshot }),
    }),
    copilotMessageResponseSchema,
  );
}

export async function approveCopilotProposal(
  proposalId: string,
  snapshot: ReconciliationSnapshot,
): Promise<{ proposal: CopilotProposal }> {
  const data = await readJson(
    await fetch(`/api/copilot/proposals/${proposalId}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ snapshot }),
    }),
    copilotApprovalResponseSchema,
  );
  return { proposal: data.proposal };
}

export async function rejectCopilotProposal(
  proposalId: string,
  snapshot: ReconciliationSnapshot,
): Promise<{ proposal: CopilotProposal }> {
  const data = await readJson(
    await fetch(`/api/copilot/proposals/${proposalId}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ snapshot }),
    }),
    copilotApprovalResponseSchema,
  );
  return { proposal: data.proposal };
}

export async function resetCopilotSession(): Promise<void> {
  await readJson(
    await fetch("/api/copilot/reset", {
      method: "POST",
      credentials: "same-origin",
    }),
    z.object({ ok: z.literal(true) }),
  );
}

export async function getCopilotHealth(): Promise<CopilotHealthResponse> {
  return readJson(
    await fetch("/api/copilot/health", { credentials: "same-origin" }),
    copilotHealthResponseSchema,
  );
}

export async function getCopilotState(): Promise<z.infer<typeof copilotStateResponseSchema>> {
  return readJson(
    await fetch("/api/copilot/state", { credentials: "same-origin" }),
    copilotStateResponseSchema,
  );
}

type CopilotResetListener = () => void;
const resetListeners = new Set<CopilotResetListener>();

export function onCopilotReset(listener: CopilotResetListener): () => void {
  resetListeners.add(listener);
  return () => resetListeners.delete(listener);
}

export function emitCopilotReset(): void {
  resetListeners.forEach((listener) => listener());
}

export async function resetCopilotIntegration(): Promise<void> {
  await resetCopilotSession();
  emitCopilotReset();
}
