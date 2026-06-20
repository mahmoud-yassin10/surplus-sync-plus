import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { INITIAL, reducer } from "../store";
import {
  buildActionsAfterExecutedProposal,
  isAllowedCopilotActionType,
  parseCopilotProposal,
  validateProposalPrerequisites,
} from "../copilot-action-adapter";
import type { CopilotProposal } from "../copilot-contracts";

const baseProposal = (overrides: Partial<CopilotProposal> = {}): CopilotProposal => ({
  proposalId: "11111111-1111-4111-8111-111111111111",
  actionType: "SURPLUS_ALERT",
  title: "Draft alert",
  summary: "Notify partners",
  reason: "High risk",
  requestedByRole: "CAFETERIA_MANAGER",
  affectedEntities: [],
  before: { alertStatus: "DRAFT" },
  after: { alertStatus: "SENT_PROVISIONAL" },
  expectedConsequences: [],
  risks: [],
  policyChecks: [],
  requiredApprovals: ["CAFETERIA_MANAGER"],
  reversible: true,
  status: "PENDING_APPROVAL",
  createdAt: "2026-03-12T10:00:00.000Z",
  expiresAt: "2026-03-12T11:00:00.000Z",
  ...overrides,
});

describe("copilot action adapter", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          forecast: {
            date: "2026-03-12",
            expectedAttendance: 540,
            intervalLow: 512,
            intervalHigh: 568,
            recommendedPrep: 575,
            shortageProb: 0.034,
            largeSurplusProb: 0.12,
            preventableSurplus: 155,
            risk: "high",
            dataQuality: "high",
            modelVersion: "ssp-forecast-1.0",
            menu: INITIAL.forecast.menu,
            influences: INITIAL.forecast.influences,
            similarDays: INITIAL.forecast.similarDays,
          },
          provenance: {
            source: "ml",
            mlReachable: true,
            fallbackUsed: false,
            decisionStatus: "PROPOSED",
            approvalRequired: true,
          },
        }),
      })),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("blocks unknown action types", () => {
    expect(isAllowedCopilotActionType("DELETE_EVERYTHING")).toBe(false);
    expect(parseCopilotProposal({ ...baseProposal(), actionType: "DELETE_EVERYTHING" })).toBeNull();
  });

  it("pending proposal performs no local mutation", () => {
    const prereq = validateProposalPrerequisites(INITIAL, baseProposal());
    expect(prereq.ok).toBe(true);
    if (prereq.ok) expect(prereq.actions).toEqual([]);
  });

  it("partner prerequisites block backend approval", () => {
    const proposal = baseProposal({
      actionType: "PARTNER_SELECTION",
      after: { selectedPartnerId: "harbor-shelter" },
      requiredApprovals: ["CAFETERIA_MANAGER"],
    });
    const blocked = validateProposalPrerequisites(INITIAL, proposal);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.blockedBeforeBackend).toBe(true);
  });

  it("rejected proposal cannot execute", async () => {
    const executed = await buildActionsAfterExecutedProposal(
      INITIAL,
      baseProposal({ status: "REJECTED" }),
    );
    expect(executed.ok).toBe(false);
  });

  it("executed alert dispatches once", async () => {
    const result = await buildActionsAfterExecutedProposal(
      INITIAL,
      baseProposal({ status: "EXECUTED" }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.actions).toEqual([{ type: "SEND_PROVISIONAL_ALERTS" }]);
  });

  it("executed alert remains idempotent after alerts sent", async () => {
    const alerted = reducer(INITIAL, { type: "SEND_PROVISIONAL_ALERTS" });
    const result = await buildActionsAfterExecutedProposal(
      alerted,
      baseProposal({ status: "EXECUTED" }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.actions).toEqual([]);
  });

  it("attendance approval uses authoritative what-if values", async () => {
    const result = await buildActionsAfterExecutedProposal(
      INITIAL,
      baseProposal({
        actionType: "ATTENDANCE_UPDATE",
        status: "EXECUTED",
        requiredApprovals: ["SCHOOL_ADMINISTRATOR"],
      }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.actions[0]?.type).toBe("CORRECT_ATTENDANCE");
  });
});
