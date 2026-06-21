import { z } from "zod";
import { DEMO_FOCUS_DATE } from "./demo-date";
import {
  gatewayForecastPayloadSchema,
  gatewayWhatIfRequestSchema,
  type ForecastProvenance,
} from "./forecast-gateway-types";
import { applyAttendanceCorrection, shortageProbabilityForPrep } from "./forecast";
import { assertPlanAboveFloor } from "./invariants";
import { assertCanSelectPartner } from "./invariants";
import { mapPartnerFromCopilot } from "./copilot-partners";
import { COPILOT_ROLE_MAP } from "./copilot-snapshot";
import {
  copilotActionTypeSchema,
  copilotProposalSchema,
  type CopilotProposal,
} from "./copilot-contracts";
import type { Forecast } from "./types";
import type { State } from "./store";
import type { Action } from "./store";

const ALLOWED_ACTION_TYPES = copilotActionTypeSchema.options;

export function isAllowedCopilotActionType(actionType: string): actionType is CopilotProposal["actionType"] {
  return (ALLOWED_ACTION_TYPES as readonly string[]).includes(actionType);
}

export function parseCopilotProposal(value: unknown): CopilotProposal | null {
  const parsed = copilotProposalSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function isAuthoritativeAttendanceCorrection(
  forecast: Forecast,
  provenance: ForecastProvenance,
): boolean {
  return (
    forecast.expectedAttendance === 540 &&
    forecast.intervalLow === 512 &&
    forecast.intervalHigh === 568 &&
    forecast.recommendedPrep === 575 &&
    forecast.preventableSurplus === 155 &&
    Math.abs(forecast.shortageProb - 0.034) < 0.001 &&
    provenance.decisionStatus === "PROPOSED" &&
    provenance.approvalRequired === true
  );
}

async function fetchAuthoritativeAttendanceWhatIf(): Promise<{
  forecast: Forecast;
  provenance: ForecastProvenance;
} | null> {
  const body = gatewayWhatIfRequestSchema.parse({
    date: DEMO_FOCUS_DATE,
    schoolId: "lhphs",
    scenario: "attendance-trip-cancelled",
  });
  const response = await fetch("/api/forecast/what-if", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(body),
  });
  const json: unknown = await response.json();
  if (!response.ok) return null;
  const parsed = gatewayForecastPayloadSchema.safeParse(json);
  if (!parsed.success) return null;
  if (!isAuthoritativeAttendanceCorrection(parsed.data.forecast, parsed.data.provenance)) {
    return null;
  }
  return parsed.data;
}

export type ProposalDispatchResult =
  | { ok: true; actions: Action[] }
  | { ok: false; reason: string; blockedBeforeBackend?: boolean };

export function validateProposalPrerequisites(
  state: State,
  proposal: CopilotProposal,
): ProposalDispatchResult {
  if (!isAllowedCopilotActionType(proposal.actionType)) {
    return { ok: false, reason: "Unknown action type" };
  }
  if (proposal.status !== "PENDING_APPROVAL") {
    return { ok: false, reason: "Proposal is not pending approval" };
  }

  const userRole = COPILOT_ROLE_MAP[state.role];
  if (!proposal.requiredApprovals.includes(userRole)) {
    return { ok: false, reason: "Your role cannot approve this proposal" };
  }

  if (proposal.actionType === "PARTNER_SELECTION") {
    const partnerId = z
      .object({ selectedPartnerId: z.string() })
      .safeParse(proposal.after);
    if (!partnerId.success) {
      return { ok: false, reason: "Invalid partner selection payload", blockedBeforeBackend: true };
    }
    const localPartnerId = mapPartnerFromCopilot(partnerId.data.selectedPartnerId);
    if (!localPartnerId || !state.partners.some((p) => p.id === localPartnerId)) {
      return { ok: false, reason: "Partner is not available locally", blockedBeforeBackend: true };
    }
    const check = assertCanSelectPartner(state.surplusConfirmed, state.checklistComplete);
    if (!check.ok) {
      return { ok: false, reason: check.reason, blockedBeforeBackend: true };
    }
  }

  if (proposal.actionType === "PREPARATION_OVERRIDE") {
    const after = z.object({ proposedQuantity: z.number().int() }).safeParse(proposal.after);
    if (!after.success) {
      return { ok: false, reason: "Invalid preparation override payload" };
    }
    const floor = assertPlanAboveFloor(after.data.proposedQuantity);
    if (!floor.ok) {
      return { ok: false, reason: floor.reason };
    }
  }

  if (proposal.actionType === "SURPLUS_ALERT") {
    if (state.audit.some((a) => a.action.startsWith("Sent provisional surplus alert"))) {
      return { ok: false, reason: "Provisional alerts were already sent" };
    }
  }

  return { ok: true, actions: [] };
}

export async function buildActionsAfterExecutedProposal(
  state: State,
  proposal: CopilotProposal,
  attendanceForecast?: { forecast: Forecast; provenance: ForecastProvenance },
): Promise<ProposalDispatchResult> {
  if (proposal.status !== "EXECUTED") {
    return { ok: false, reason: "Backend did not confirm execution" };
  }

  switch (proposal.actionType) {
    case "ATTENDANCE_UPDATE": {
      if (state.attendanceCorrected) return { ok: true, actions: [] };
      const authoritative =
        attendanceForecast ?? (await fetchAuthoritativeAttendanceWhatIf());
      if (!authoritative) {
        return { ok: false, reason: "Authoritative attendance forecast unavailable" };
      }
      return {
        ok: true,
        actions: [
          {
            type: "CORRECT_ATTENDANCE",
            forecast: authoritative.forecast,
            provenance: authoritative.provenance,
          },
        ],
      };
    }
    case "PREPARATION_OVERRIDE": {
      const after = z.object({ proposedQuantity: z.number().int() }).parse(proposal.after);
      if (after.proposedQuantity === state.forecast.recommendedPrep) {
        return { ok: true, actions: [{ type: "APPLY_RECOMMENDATION" }] };
      }
      return { ok: true, actions: [{ type: "SET_PLAN", meals: after.proposedQuantity }] };
    }
    case "SURPLUS_ALERT": {
      if (state.audit.some((a) => a.action.startsWith("Sent provisional surplus alert"))) {
        return { ok: true, actions: [] };
      }
      return { ok: true, actions: [{ type: "SEND_PROVISIONAL_ALERTS" }] };
    }
    case "PARTNER_SELECTION": {
      const after = z.object({ selectedPartnerId: z.string() }).parse(proposal.after);
      const localPartnerId = mapPartnerFromCopilot(after.selectedPartnerId);
      if (!localPartnerId) {
        return { ok: false, reason: "Partner mapping unavailable" };
      }
      const meals = state.surplusConfirmed ?? 70;
      return {
        ok: true,
        actions: [{ type: "SELECT_PARTNER", partnerId: localPartnerId, meals }],
      };
    }
    case "ALERT_CANCELLATION": {
      return { ok: true, actions: [{ type: "CANCEL_PROVISIONAL_ALERTS" }] };
    }
    default:
      return { ok: false, reason: "Unknown action type" };
  }
}

export async function prepareAttendanceApproval(): Promise<{
  forecast: Forecast;
  provenance: ForecastProvenance;
} | null> {
  return fetchAuthoritativeAttendanceWhatIf();
}

export function simulationUsesAuthoritativeValues(forecast: Forecast): boolean {
  return forecast.expectedAttendance === 540 && forecast.recommendedPrep === 575;
}

export function baselineAnswerUsesAuthoritativeValues(forecast: Forecast): boolean {
  return (
    forecast.expectedAttendance === 528 &&
    forecast.intervalLow === 497 &&
    forecast.intervalHigh === 557 &&
    forecast.recommendedPrep === 562
  );
}

/** Local deterministic fallback when the secured gateway is unavailable. */
export function buildDeterministicFallbackReply(
  message: string,
  state: State,
): import("./copilot-contracts").CopilotStructuredResponse {
  const corrected = applyAttendanceCorrection(state.forecast);
  const lower = message.toLowerCase();
  const formatPct = (prob: number) => `${(prob * 100).toFixed(1)}%`;
  const baselineShortage = shortageProbabilityForPrep(state.forecast.recommendedPrep);
  const correctedShortage = shortageProbabilityForPrep(corrected.recommendedPrep);
  if (lower.includes("540") || lower.includes("trip") || lower.includes("cancel")) {
    return {
      answer: `SIMULATION OUTCOME (what-if only — no operational state was written): If the cancelled field trip returns students, simulated attendance rises to ${corrected.expectedAttendance} (${corrected.intervalLow}–${corrected.intervalHigh}), recommended preparation becomes ${corrected.recommendedPrep}, preventable surplus is ${corrected.preventableSurplus}, shortage probability is ${formatPct(correctedShortage)}, and risk remains high. Session attendance stays at ${state.forecast.expectedAttendance} with recommended preparation ${state.forecast.recommendedPrep} until a proposal is approved.`,
      answerType: "SIMULATION",
      evidence: [
        {
          label: "Simulated attendance",
          value: String(corrected.expectedAttendance),
          sourceType: "MODEL_OUTPUT",
        },
        {
          label: "Simulated interval",
          value: `${corrected.intervalLow}–${corrected.intervalHigh}`,
          sourceType: "MODEL_OUTPUT",
        },
        {
          label: "Recommended preparation",
          value: String(corrected.recommendedPrep),
          sourceType: "MODEL_OUTPUT",
        },
        {
          label: "Preventable surplus",
          value: String(corrected.preventableSurplus),
          sourceType: "MODEL_OUTPUT",
        },
        {
          label: "Shortage probability",
          value: formatPct(correctedShortage),
          sourceType: "MODEL_OUTPUT",
        },
        { label: "Risk", value: "high", sourceType: "MODEL_OUTPUT" },
      ],
      provenance: [{ source: "Canonical local fallback", status: "SYNTHETIC" }],
      uncertainty: {
        level: "MODERATE",
        explanation: "AI service unavailable — using local canonical simulation.",
      },
      limitations: [
        "AI service unavailable.",
        "Synthetic demo data.",
        "Live ML unavailable.",
        "No backend session — proposals cannot be executed.",
      ],
      toolCalls: [],
      proposedActions: [],
      requiresHumanApproval: false,
    };
  }
  return {
    answer: `Thursday is flagged high risk because expected attendance is ${state.forecast.expectedAttendance} (${state.forecast.intervalLow}–${state.forecast.intervalHigh}), recommended preparation is ${state.forecast.recommendedPrep}, preventable surplus is ${state.forecast.preventableSurplus}, shortage probability is ${formatPct(baselineShortage)}, and risk remains ${state.forecast.risk}.`,
    answerType: "EXPLANATION",
    evidence: [
      {
        label: "Expected attendance",
        value: String(state.forecast.expectedAttendance),
        sourceType: "MODEL_OUTPUT",
      },
      {
        label: "Attendance interval",
        value: `${state.forecast.intervalLow}–${state.forecast.intervalHigh}`,
        sourceType: "MODEL_OUTPUT",
      },
      {
        label: "Recommended preparation",
        value: String(state.forecast.recommendedPrep),
        sourceType: "MODEL_OUTPUT",
      },
      {
        label: "Preventable surplus",
        value: String(state.forecast.preventableSurplus),
        sourceType: "MODEL_OUTPUT",
      },
      {
        label: "Shortage probability",
        value: formatPct(baselineShortage),
        sourceType: "MODEL_OUTPUT",
      },
      { label: "Risk", value: state.forecast.risk, sourceType: "MODEL_OUTPUT" },
    ],
    provenance: [{ source: "Canonical local fallback", status: "SYNTHETIC" }],
    uncertainty: {
      level: "MODERATE",
      explanation: "AI service unavailable — using local canonical explanation.",
    },
    limitations: [
      "AI service unavailable.",
      "Synthetic demo data.",
      "Live ML unavailable.",
      "No backend session — proposals cannot be executed.",
    ],
    toolCalls: [],
    proposedActions: [],
    requiresHumanApproval: false,
  };
}
