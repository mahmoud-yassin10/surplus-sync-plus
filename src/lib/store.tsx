import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from "react";
import type { ForecastProvenance } from "./forecast-gateway-types";
import {
  CALENDAR_EVENTS,
  FORECAST_THURSDAY,
  HORIZON_DAYS,
  INITIAL_AUDIT,
  INITIAL_IMPACT,
  INITIAL_MESSAGES,
  INITIAL_PICKUPS,
  PARTNERS,
  SCHOOL,
} from "./mock";
import { demoTimestamp } from "./demo-date";
import { formatFocusDateSlash } from "./demo-date";
import {
  applyAttendanceCorrection,
  buildRecommendationKey,
  computePickupEta,
  computePreventedImpact,
} from "./forecast";
import {
  assertCanAdvanceBeyondSurplusConfirmed,
  assertCanApplyRecommendation,
  assertCanOverridePartner,
  assertCanSelectPartner,
  assertMonotonicPickupAdvance,
  assertPlanAboveFloor,
} from "./invariants";
import { canPerform, type ConsequentialAction } from "./permissions";
import type {
  AuditEvent,
  Forecast,
  ImpactRecord,
  Message,
  PartnerMatch,
  Pickup,
  PickupStatus,
  RecoveryPartner,
  Role,
} from "./types";

export interface State {
  role: Role;
  aiMode: boolean;
  forecast: Forecast;
  forecastProvenance: ForecastProvenance | null;
  forecastLoadStatus: "idle" | "loading" | "ready" | "error";
  forecastLoadError: string | null;
  currentPlan: number;
  approvedRecommendationKey: string | null;
  attendanceCorrected: boolean;
  surplusConfirmed: number | null;
  checklistComplete: boolean;
  matches: PartnerMatch[];
  pickups: Pickup[];
  audit: AuditEvent[];
  messages: Message[];
  impact: ImpactRecord;
  partners: RecoveryPartner[];
  guidedStep: number;
}

export const INITIAL: State = {
  role: "manager",
  aiMode: true,
  forecast: FORECAST_THURSDAY,
  forecastProvenance: null,
  forecastLoadStatus: "idle",
  forecastLoadError: null,
  currentPlan: 730,
  approvedRecommendationKey: null,
  attendanceCorrected: false,
  surplusConfirmed: null,
  checklistComplete: false,
  matches: [],
  pickups: INITIAL_PICKUPS,
  audit: INITIAL_AUDIT,
  messages: INITIAL_MESSAGES,
  impact: INITIAL_IMPACT,
  partners: PARTNERS,
  guidedStep: 0,
};

export type Action =
  | { type: "RESET" }
  | { type: "SET_ROLE"; role: Role }
  | { type: "TOGGLE_AI" }
  | { type: "FORECAST_LOAD_START" }
  | { type: "SET_FORECAST"; forecast: Forecast; provenance: ForecastProvenance }
  | { type: "FORECAST_LOAD_ERROR"; message: string }
  | { type: "APPLY_RECOMMENDATION" }
  | { type: "SET_PLAN"; meals: number }
  | { type: "CORRECT_ATTENDANCE"; forecast?: Forecast; provenance?: ForecastProvenance }
  | { type: "SEND_PROVISIONAL_ALERTS" }
  | { type: "PARTNER_RESERVE"; partnerId: string; meals: number }
  | { type: "PARTNER_DECLINE"; partnerId: string }
  | { type: "CONFIRM_SURPLUS"; meals: number }
  | { type: "COMPLETE_CHECKLIST" }
  | { type: "SELECT_PARTNER"; partnerId: string; meals: number }
  | { type: "OVERRIDE_PARTNER"; partnerId: string; previousId: string; reason: string }
  | { type: "ADVANCE_PICKUP"; pickupId: string; status: PickupStatus }
  | { type: "AUDIT"; event: Omit<AuditEvent, "id" | "ts"> }
  | { type: "MESSAGE"; message: Omit<Message, "id" | "ts"> }
  | { type: "GUIDED_STEP"; step: number };

let demoTimeOffset = 0;

function nextDemoTimestamp(): string {
  const ts = demoTimestamp(demoTimeOffset);
  demoTimeOffset += 1000;
  return ts;
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function withAudit(state: State, event: Omit<AuditEvent, "id" | "ts">): AuditEvent[] {
  return [{ id: uid(), ts: nextDemoTimestamp(), ...event }, ...state.audit];
}

function withMessage(state: State, msg: Omit<Message, "id" | "ts">): Message[] {
  return [...state.messages, { id: uid(), ts: nextDemoTimestamp(), ...msg }];
}

function denied(state: State, action: string, reason: string): State {
  return {
    ...state,
    audit: withAudit(state, {
      actor: "System",
      actorType: "system",
      action: `Action blocked: ${action}`,
      reason,
      reversible: false,
    }),
  };
}

function guardRole(state: State, action: ConsequentialAction): boolean {
  return canPerform(state.role, action);
}

const ACTOR_NAMES: Record<Role, string> = {
  manager: SCHOOL.manager,
  admin: SCHOOL.admin,
  partner: "Recovery Partner",
  platform: "Platform Admin",
};

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "RESET":
      demoTimeOffset = 0;
      return { ...INITIAL };
    case "SET_ROLE":
      return { ...state, role: action.role };
    case "TOGGLE_AI":
      return {
        ...state,
        aiMode: !state.aiMode,
        audit: withAudit(state, {
          actor: ACTOR_NAMES[state.role],
          actorType: "human",
          action: state.aiMode ? "Switched to manual mode" : "Re-enabled AI assistance",
          reversible: true,
        }),
      };
    case "FORECAST_LOAD_START":
      return {
        ...state,
        forecastLoadStatus: "loading",
        forecastLoadError: null,
      };
    case "SET_FORECAST": {
      const key = buildRecommendationKey(action.forecast);
      const keepApproval = state.approvedRecommendationKey === key;
      return {
        ...state,
        forecast: action.forecast,
        forecastProvenance: action.provenance,
        forecastLoadStatus: "ready",
        forecastLoadError: null,
        approvedRecommendationKey: keepApproval ? state.approvedRecommendationKey : null,
      };
    }
    case "FORECAST_LOAD_ERROR":
      return {
        ...state,
        forecastLoadStatus: "error",
        forecastLoadError: action.message,
      };
    case "APPLY_RECOMMENDATION": {
      if (!guardRole(state, "APPLY_RECOMMENDATION")) {
        return denied(state, "APPLY_RECOMMENDATION", "Requires cafeteria manager role.");
      }
      const key = buildRecommendationKey(state.forecast);
      if (state.approvedRecommendationKey === key) return state;
      const planCheck = assertCanApplyRecommendation(state.forecast);
      if (!planCheck.ok) return denied(state, "APPLY_RECOMMENDATION", planCheck.reason);
      const { preventedMeals, costSaved } = computePreventedImpact(
        SCHOOL.normalPrep,
        state.forecast.recommendedPrep,
      );
      return {
        ...state,
        currentPlan: state.forecast.recommendedPrep,
        approvedRecommendationKey: key,
        impact: {
          ...state.impact,
          preventedMeals: state.impact.preventedMeals + preventedMeals,
          costSaved: state.impact.costSaved + costSaved,
        },
        audit: withAudit(state, {
          actor: ACTOR_NAMES[state.role],
          actorType: "human",
          action: "Approved AI preparation recommendation",
          before: `${SCHOOL.normalPrep} meals`,
          after: `${state.forecast.recommendedPrep} meals`,
          reason: "AI rationale accepted after evidence review",
          reversible: true,
        }),
      };
    }
    case "SET_PLAN": {
      if (!guardRole(state, "SET_PLAN")) {
        return denied(state, "SET_PLAN", "Requires cafeteria manager role.");
      }
      const floor = assertPlanAboveFloor(action.meals);
      if (!floor.ok) return denied(state, "SET_PLAN", floor.reason);
      return {
        ...state,
        currentPlan: action.meals,
        audit: withAudit(state, {
          actor: ACTOR_NAMES[state.role],
          actorType: "human",
          action: "Adjusted preparation plan",
          before: `${state.currentPlan} meals`,
          after: `${action.meals} meals`,
          reversible: true,
        }),
      };
    }
    case "CORRECT_ATTENDANCE": {
      if (!guardRole(state, "CORRECT_ATTENDANCE")) {
        return denied(state, "CORRECT_ATTENDANCE", "Requires manager or administrator role.");
      }
      if (state.attendanceCorrected) return state;
      const beforeAttendance = state.forecast.expectedAttendance;
      const corrected = action.forecast ?? applyAttendanceCorrection(state.forecast);
      return {
        ...state,
        attendanceCorrected: true,
        forecast: corrected,
        forecastProvenance: action.provenance ?? state.forecastProvenance,
        approvedRecommendationKey: null,
        audit: withAudit(state, {
          actor: ACTOR_NAMES[state.role],
          actorType: "human",
          action: "Approved attendance correction",
          before: `Expected ${beforeAttendance} students (model baseline)`,
          after: "Expected 540 students (trip cancelled)",
          reason: "Field trip cancelled by district",
          reversible: true,
        }),
      };
    }
    case "SEND_PROVISIONAL_ALERTS": {
      if (!guardRole(state, "SEND_PROVISIONAL_ALERTS")) {
        return denied(state, "SEND_PROVISIONAL_ALERTS", "Requires manager or administrator role.");
      }
      const eligible = state.partners.filter((p) => p.status === "available");
      const messages = eligible.reduce<Message[]>((acc, p) => {
        return [
          ...acc,
          {
            id: uid(),
            ts: nextDemoTimestamp(),
            threadId: `t-${p.id}`,
            fromRole: "manager",
            fromName: "Lincoln Heights HS",
            kind: "alert",
            body: `Provisional surplus alert for Thursday ${formatFocusDateSlash()}. Estimated 60–95 packaged meals. Not yet a confirmed donation — please reserve tentative capacity.`,
            meta: { range: "60–95", category: "packaged" },
          },
        ];
      }, []);
      return {
        ...state,
        messages: [...state.messages, ...messages],
        audit: withAudit(state, {
          actor: ACTOR_NAMES[state.role],
          actorType: "human",
          action: `Sent provisional surplus alert to ${eligible.length} partners`,
          reason: "AI Copilot drafted alert, human approved sending",
          reversible: true,
        }),
      };
    }
    case "PARTNER_RESERVE": {
      if (!guardRole(state, "PARTNER_RESERVE")) {
        return denied(
          state,
          "PARTNER_RESERVE",
          "Requires partner, manager, or administrator role.",
        );
      }
      const existing = state.matches.find((m) => m.partnerId === action.partnerId);
      const matches = existing
        ? state.matches.map((m) =>
            m.partnerId === action.partnerId
              ? { ...m, state: "reserved" as const, reservedMeals: action.meals }
              : m,
          )
        : [
            ...state.matches,
            {
              partnerId: action.partnerId,
              state: "reserved" as const,
              reservedMeals: action.meals,
            },
          ];
      const partner = state.partners.find((p) => p.id === action.partnerId)!;
      return {
        ...state,
        matches,
        messages: withMessage(state, {
          threadId: `t-${action.partnerId}`,
          fromRole: state.role === "partner" ? "partner" : "manager",
          fromName: state.role === "partner" ? partner.name : "Lincoln Heights HS",
          kind: "reservation",
          body: `Reserved tentative capacity for up to ${action.meals} packaged meals. Pickup window ${partner.windowStart}–${partner.windowEnd}.`,
          meta: { meals: action.meals },
        }),
        audit: withAudit(state, {
          actor: state.role === "partner" ? partner.name : ACTOR_NAMES[state.role],
          actorType: state.role === "partner" ? "partner" : "human",
          action: `Reserved ${action.meals} meals (provisional)`,
          reversible: true,
        }),
      };
    }
    case "PARTNER_DECLINE": {
      if (!guardRole(state, "PARTNER_DECLINE")) {
        return denied(
          state,
          "PARTNER_DECLINE",
          "Requires partner, manager, or administrator role.",
        );
      }
      const partner = state.partners.find((p) => p.id === action.partnerId)!;
      return {
        ...state,
        audit: withAudit(state, {
          actor: partner.name,
          actorType: "partner",
          action: "Declined provisional alert",
          reason: "Capacity unavailable in window",
          reversible: false,
        }),
      };
    }
    case "CONFIRM_SURPLUS": {
      if (!guardRole(state, "CONFIRM_SURPLUS")) {
        return denied(state, "CONFIRM_SURPLUS", "Requires manager or administrator role.");
      }
      if (state.surplusConfirmed != null) return state;
      return {
        ...state,
        surplusConfirmed: action.meals,
        audit: withAudit(state, {
          actor: ACTOR_NAMES[state.role],
          actorType: "human",
          action: `Confirmed ${action.meals} recoverable meals`,
          reason: "Day-of measurement after service",
          reversible: false,
        }),
      };
    }
    case "COMPLETE_CHECKLIST": {
      if (!guardRole(state, "COMPLETE_CHECKLIST")) {
        return denied(state, "COMPLETE_CHECKLIST", "Requires manager or administrator role.");
      }
      if (state.checklistComplete) return state;
      return {
        ...state,
        checklistComplete: true,
        audit: withAudit(state, {
          actor: ACTOR_NAMES[state.role],
          actorType: "human",
          action: "Completed recovery eligibility checklist",
          reason: "All seven items verified by qualified staff",
          reversible: false,
        }),
      };
    }
    case "SELECT_PARTNER": {
      if (!guardRole(state, "SELECT_PARTNER")) {
        return denied(state, "SELECT_PARTNER", "Requires manager or administrator role.");
      }
      const check = assertCanSelectPartner(state.surplusConfirmed, state.checklistComplete);
      if (!check.ok) return denied(state, "SELECT_PARTNER", check.reason);
      const partner = state.partners.find((p) => p.id === action.partnerId)!;
      const pickup: Pickup = {
        id: uid(),
        partnerId: action.partnerId,
        meals: action.meals,
        status: "partner-selected",
        eta: computePickupEta(partner),
        createdAt: nextDemoTimestamp(),
        impactRecorded: false,
      };
      return {
        ...state,
        matches: [
          ...state.matches.filter((m) => m.partnerId !== action.partnerId),
          { partnerId: action.partnerId, state: "confirmed", reservedMeals: action.meals },
        ],
        pickups: [...state.pickups, pickup],
        audit: withAudit(state, {
          actor: ACTOR_NAMES[state.role],
          actorType: "human",
          action: `Assigned pickup to ${partner.name}`,
          after: `${action.meals} meals reserved`,
          reversible: true,
        }),
      };
    }
    case "OVERRIDE_PARTNER": {
      if (!guardRole(state, "OVERRIDE_PARTNER")) {
        return denied(state, "OVERRIDE_PARTNER", "Requires manager or administrator role.");
      }
      const pickup =
        state.pickups.find((p) => p.partnerId === action.previousId) ?? state.pickups[0];
      const overrideCheck = assertCanOverridePartner(
        state.surplusConfirmed,
        state.checklistComplete,
        !!pickup,
      );
      if (!overrideCheck.ok) return denied(state, "OVERRIDE_PARTNER", overrideCheck.reason);
      if (!pickup || pickup.partnerId === action.partnerId) return state;
      const prev = state.partners.find((p) => p.id === action.previousId)!;
      const next = state.partners.find((p) => p.id === action.partnerId)!;
      const updatedPickups = state.pickups.map((p) =>
        p.id === pickup.id ? { ...p, partnerId: action.partnerId, eta: computePickupEta(next) } : p,
      );
      const matches = [
        ...state.matches.filter(
          (m) => m.partnerId !== action.previousId && m.partnerId !== action.partnerId,
        ),
        { partnerId: action.previousId, state: "reserved" as const, reservedMeals: pickup.meals },
        { partnerId: action.partnerId, state: "confirmed" as const, reservedMeals: pickup.meals },
      ];
      return {
        ...state,
        pickups: updatedPickups,
        matches,
        audit: withAudit(state, {
          actor: ACTOR_NAMES[state.role],
          actorType: "human",
          action: "Overrode AI partner ranking",
          before: prev.name,
          after: next.name,
          reason: action.reason,
          reversible: true,
        }),
      };
    }
    case "ADVANCE_PICKUP": {
      if (!guardRole(state, "ADVANCE_PICKUP")) {
        return denied(state, "ADVANCE_PICKUP", "Requires partner, manager, or administrator role.");
      }
      const pickup = state.pickups.find((p) => p.id === action.pickupId);
      if (!pickup) return state;
      const mono = assertMonotonicPickupAdvance(pickup.status, action.status);
      if (!mono.ok) return denied(state, "ADVANCE_PICKUP", mono.reason);
      const routeCheck = assertCanAdvanceBeyondSurplusConfirmed(
        action.status,
        state.surplusConfirmed,
        state.checklistComplete,
      );
      if (!routeCheck.ok) return denied(state, "ADVANCE_PICKUP", routeCheck.reason);
      const updated = state.pickups.map((p) =>
        p.id === action.pickupId ? { ...p, status: action.status } : p,
      );
      let impact = state.impact;
      let pickupsFinal = updated;
      if (action.status === "distribution-confirmed" && !pickup.impactRecorded) {
        impact = {
          ...impact,
          recoveredMeals: impact.recoveredMeals + pickup.meals,
          studentsServed: impact.studentsServed + pickup.meals,
          pickupsCompleted: impact.pickupsCompleted + 1,
        };
        pickupsFinal = updated.map((p) =>
          p.id === action.pickupId ? { ...p, impactRecorded: true } : p,
        );
      } else if (action.status === "distribution-confirmed" && pickup.impactRecorded) {
        return state;
      }
      return {
        ...state,
        pickups: pickupsFinal,
        impact,
        audit: withAudit(state, {
          actor: state.partners.find((p) => p.id === pickup.partnerId)!.name,
          actorType: "partner",
          action: `Pickup status → ${action.status.replace(/-/g, " ")}`,
          reversible: false,
        }),
      };
    }
    case "AUDIT":
      return { ...state, audit: withAudit(state, action.event) };
    case "MESSAGE":
      return { ...state, messages: withMessage(state, action.message) };
    case "GUIDED_STEP":
      return { ...state, guidedStep: action.step };
    default:
      return state;
  }
}

const Ctx = createContext<{ state: State; dispatch: React.Dispatch<Action> } | null>(null);

const STORAGE_KEY = "ssp_state_v2";

export function hydrateState(raw: string): State {
  try {
    const parsed = JSON.parse(raw) as Partial<State> & { approvedRecommendation?: boolean };
    const base = {
      ...INITIAL,
      ...parsed,
      forecastLoadStatus: "idle" as const,
      forecastLoadError: null,
      forecastProvenance: null,
    } as State;
    if (!("approvedRecommendationKey" in parsed) && parsed.approvedRecommendation) {
      base.approvedRecommendationKey = buildRecommendationKey(base.forecast);
    }
    delete (base as { approvedRecommendation?: boolean }).approvedRecommendation;
    return base;
  } catch {
    return INITIAL;
  }
}

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL, (init) => {
    if (typeof window === "undefined") return init;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) return hydrateState(raw);
      const legacy = window.localStorage.getItem("ssp_state_v1");
      if (legacy) return hydrateState(legacy);
    } catch {
      /* ignore corrupt localStorage */
    }
    return init;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const {
        forecastLoadStatus: _status,
        forecastLoadError: _error,
        forecastProvenance: _prov,
        ...persisted
      } = state;
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
    } catch {
      /* ignore corrupt localStorage */
    }
  }, [state]);

  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore must be used within AppStoreProvider");
  return ctx;
}

export { SCHOOL, CALENDAR_EVENTS, HORIZON_DAYS };
