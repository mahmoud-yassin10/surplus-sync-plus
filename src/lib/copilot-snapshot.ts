import type { Role } from "./types";
import type { State } from "./store";
import {
  DEFAULT_COPILOT_PARTNER_ID,
  mapPartnerToCopilot,
  type CopilotPartnerId,
} from "./copilot-partners";
import type { ReconciliationSnapshot } from "./copilot-contracts";

export const COPILOT_ROLE_MAP: Record<Role, ReconciliationSnapshot["role"]> = {
  manager: "CAFETERIA_MANAGER",
  admin: "SCHOOL_ADMINISTRATOR",
  partner: "RECOVERY_PARTNER_COORDINATOR",
  platform: "PLATFORM_ADMINISTRATOR",
};

/** Deterministic helper — provisional alerts were sent when the workflow audit records them. */
export function provisionalAlertsSent(state: State): boolean {
  return state.audit.some((entry) => entry.action.startsWith("Sent provisional surplus alert"));
}

function resolveSelectedPartnerId(state: State): CopilotPartnerId | null {
  const activePickup = state.pickups[state.pickups.length - 1];
  if (activePickup) {
    const mapped = mapPartnerToCopilot(activePickup.partnerId);
    if (mapped) return mapped;
  }
  const confirmed = state.matches.find((m) => m.state === "confirmed");
  if (confirmed) {
    const mapped = mapPartnerToCopilot(confirmed.partnerId);
    if (mapped) return mapped;
  }
  return DEFAULT_COPILOT_PARTNER_ID;
}

export function buildReconciliationSnapshot(state: State): ReconciliationSnapshot {
  return {
    source: "surplussync-plus",
    stateVersion: "ssp_state_v2",
    role: COPILOT_ROLE_MAP[state.role],
    operational: {
      expectedAttendance: state.forecast.expectedAttendance,
      recommendedPreparation: state.forecast.recommendedPrep,
      currentPreparationPlan: state.currentPlan,
      attendanceCorrected: state.attendanceCorrected,
      provisionalAlertsSent: provisionalAlertsSent(state),
      selectedPartnerId: resolveSelectedPartnerId(state),
    },
  };
}
