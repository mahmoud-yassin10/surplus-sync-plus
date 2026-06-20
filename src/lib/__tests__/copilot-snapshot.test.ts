import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { INITIAL } from "../store";
import {
  buildPartnerPrerequisites,
  buildReconciliationSnapshot,
  COPILOT_ROLE_MAP,
  provisionalAlertsSent,
} from "../copilot-snapshot";
import { applyAttendanceCorrection } from "../forecast";

describe("copilot reconciliation snapshot", () => {
  it("maps frontend roles exactly", () => {
    expect(COPILOT_ROLE_MAP.manager).toBe("CAFETERIA_MANAGER");
    expect(COPILOT_ROLE_MAP.admin).toBe("SCHOOL_ADMINISTRATOR");
    expect(COPILOT_ROLE_MAP.partner).toBe("RECOVERY_PARTNER_COORDINATOR");
    expect(COPILOT_ROLE_MAP.platform).toBe("PLATFORM_ADMINISTRATOR");
  });

  it("builds the baseline snapshot", () => {
    const snapshot = buildReconciliationSnapshot(INITIAL);
    expect(snapshot).toEqual({
      source: "surplussync-plus",
      stateVersion: "ssp_state_v2",
      role: "CAFETERIA_MANAGER",
      operational: {
        expectedAttendance: 528,
        recommendedPreparation: 562,
        currentPreparationPlan: 730,
        attendanceCorrected: false,
        provisionalAlertsSent: false,
        selectedPartnerId: "metro-food-bank",
        proposalsPermitted: true,
        partnerPrerequisites: {
          surplusConfirmed: false,
          surplusMeals: null,
          foodSafetyChecklistComplete: false,
          recoveryWindowValid: false,
          proposalsPermitted: true,
          resetVersion: 0,
          cancellationVersion: 0,
        },
      },
    });
  });

  it("builds the corrected snapshot", () => {
    const corrected = {
      ...INITIAL,
      attendanceCorrected: true,
      forecast: applyAttendanceCorrection(INITIAL.forecast),
      currentPlan: 730,
    };
    const snapshot = buildReconciliationSnapshot(corrected);
    expect(snapshot.operational.expectedAttendance).toBe(540);
    expect(snapshot.operational.recommendedPreparation).toBe(575);
    expect(snapshot.operational.attendanceCorrected).toBe(true);
  });

  it("derives provisionalAlertsSent from audit workflow state", () => {
    expect(provisionalAlertsSent(INITIAL)).toBe(false);
    const alerted = {
      ...INITIAL,
      audit: [
        {
          id: "a1",
          ts: "2026-03-12T10:00:00Z",
          actor: "Maya Rodriguez",
          actorType: "human" as const,
          action: "Sent provisional surplus alert to 4 partners",
          reversible: true,
        },
        ...INITIAL.audit,
      ],
    };
    expect(provisionalAlertsSent(alerted)).toBe(true);
  });

  it("never includes audit arrays or unrelated fields", () => {
    const snapshot = buildReconciliationSnapshot(INITIAL);
    expect(Object.keys(snapshot)).toEqual(["source", "stateVersion", "role", "operational"]);
    expect(Object.keys(snapshot.operational)).toEqual([
      "expectedAttendance",
      "recommendedPreparation",
      "currentPreparationPlan",
      "attendanceCorrected",
      "provisionalAlertsSent",
      "selectedPartnerId",
      "proposalsPermitted",
      "partnerPrerequisites",
    ]);
  });

  it("serializes manual mode as proposal mode disabled", () => {
    const manual = { ...INITIAL, aiMode: false };
    const snapshot = buildReconciliationSnapshot(manual);

    expect(snapshot.operational.proposalsPermitted).toBe(false);
    expect(snapshot.operational.partnerPrerequisites.proposalsPermitted).toBe(false);
  });

  it("derives partner prerequisites from human-completed recovery workflow state", () => {
    const ready = {
      ...INITIAL,
      surplusConfirmed: 64,
      checklistComplete: true,
      audit: [
        {
          id: "a3",
          ts: "2026-03-12T10:05:00Z",
          actor: "Maya Rodriguez",
          actorType: "human" as const,
          action: "Cancelled provisional alerts",
          reversible: true,
        },
        ...INITIAL.audit,
      ],
    };

    expect(buildPartnerPrerequisites(ready)).toEqual({
      surplusConfirmed: true,
      surplusMeals: 64,
      foodSafetyChecklistComplete: true,
      recoveryWindowValid: true,
      proposalsPermitted: true,
      resetVersion: 0,
      cancellationVersion: 1,
    });
  });
});
