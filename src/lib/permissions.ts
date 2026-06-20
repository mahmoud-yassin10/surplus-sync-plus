import type { Role } from "./types";

export type ConsequentialAction =
  | "APPLY_RECOMMENDATION"
  | "SET_PLAN"
  | "CORRECT_ATTENDANCE"
  | "SEND_PROVISIONAL_ALERTS"
  | "CONFIRM_SURPLUS"
  | "COMPLETE_CHECKLIST"
  | "SELECT_PARTNER"
  | "OVERRIDE_PARTNER"
  | "PARTNER_RESERVE"
  | "PARTNER_DECLINE"
  | "ADVANCE_PICKUP"
  | "RESET";

const ACTION_ROLES: Record<ConsequentialAction, Role[]> = {
  APPLY_RECOMMENDATION: ["manager"],
  SET_PLAN: ["manager"],
  CORRECT_ATTENDANCE: ["manager", "admin"],
  SEND_PROVISIONAL_ALERTS: ["manager", "admin"],
  CONFIRM_SURPLUS: ["manager", "admin"],
  COMPLETE_CHECKLIST: ["manager", "admin"],
  SELECT_PARTNER: ["manager", "admin"],
  OVERRIDE_PARTNER: ["manager", "admin"],
  PARTNER_RESERVE: ["partner", "manager", "admin"],
  PARTNER_DECLINE: ["partner", "manager", "admin"],
  ADVANCE_PICKUP: ["partner", "manager", "admin"],
  RESET: ["manager", "admin", "partner", "platform"],
};

export function canPerform(role: Role, action: ConsequentialAction): boolean {
  return ACTION_ROLES[action].includes(role);
}
