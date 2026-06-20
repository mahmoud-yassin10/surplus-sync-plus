import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from "react";
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

interface State {
  role: Role;
  aiMode: boolean;
  forecast: Forecast;
  currentPlan: number;
  approvedRecommendation: boolean;
  attendanceCorrected: boolean;
  surplusConfirmed: number | null;
  checklistComplete: boolean;
  matches: PartnerMatch[];
  pickups: Pickup[];
  audit: AuditEvent[];
  messages: Message[];
  impact: ImpactRecord;
  partners: RecoveryPartner[];
  guidedStep: number; // 0 = inactive
}

const INITIAL: State = {
  role: "manager",
  aiMode: true,
  forecast: FORECAST_THURSDAY,
  currentPlan: 730,
  approvedRecommendation: false,
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

type Action =
  | { type: "RESET" }
  | { type: "SET_ROLE"; role: Role }
  | { type: "TOGGLE_AI" }
  | { type: "APPLY_RECOMMENDATION" }
  | { type: "SET_PLAN"; meals: number }
  | { type: "CORRECT_ATTENDANCE" }
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

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function withAudit(state: State, event: Omit<AuditEvent, "id" | "ts">): AuditEvent[] {
  return [
    { id: uid(), ts: new Date().toISOString(), ...event },
    ...state.audit,
  ];
}

function withMessage(state: State, msg: Omit<Message, "id" | "ts">): Message[] {
  return [...state.messages, { id: uid(), ts: new Date().toISOString(), ...msg }];
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "RESET":
      return { ...INITIAL };
    case "SET_ROLE":
      return { ...state, role: action.role };
    case "TOGGLE_AI":
      return {
        ...state,
        aiMode: !state.aiMode,
        audit: withAudit(state, {
          actor: "Maya Rodriguez",
          actorType: "human",
          action: state.aiMode ? "Switched to manual mode" : "Re-enabled AI assistance",
          reversible: true,
        }),
      };
    case "APPLY_RECOMMENDATION":
      return {
        ...state,
        currentPlan: state.forecast.recommendedPrep,
        approvedRecommendation: true,
        impact: {
          ...state.impact,
          preventedMeals: state.impact.preventedMeals + (730 - state.forecast.recommendedPrep),
          costSaved: state.impact.costSaved + (730 - state.forecast.recommendedPrep) * 3.4,
        },
        audit: withAudit(state, {
          actor: "Maya Rodriguez",
          actorType: "human",
          action: `Approved AI preparation recommendation`,
          before: `730 meals`,
          after: `${state.forecast.recommendedPrep} meals`,
          reason: "AI rationale accepted after evidence review",
          reversible: true,
        }),
      };
    case "SET_PLAN":
      return {
        ...state,
        currentPlan: action.meals,
        audit: withAudit(state, {
          actor: "Maya Rodriguez",
          actorType: "human",
          action: "Adjusted preparation plan",
          before: `${state.currentPlan} meals`,
          after: `${action.meals} meals`,
          reversible: true,
        }),
      };
    case "CORRECT_ATTENDANCE":
      return {
        ...state,
        attendanceCorrected: true,
        forecast: {
          ...state.forecast,
          expectedAttendance: 540,
          intervalLow: 512,
          intervalHigh: 568,
          recommendedPrep: 575,
          preventableSurplus: 155,
          influences: state.forecast.influences.map((i) =>
            i.factor.startsWith("Grade 10 field trip")
              ? { ...i, magnitude: 0, note: "Trip cancelled — input removed" }
              : i,
          ),
        },
        audit: withAudit(state, {
          actor: "Daniel Brooks",
          actorType: "human",
          action: "Approved attendance correction",
          before: "Expected 468 students (trip out)",
          after: "Expected 540 students (trip cancelled)",
          reason: "Field trip cancelled by district",
          reversible: true,
        }),
      };
    case "SEND_PROVISIONAL_ALERTS": {
      const eligible = state.partners.filter((p) => p.status === "available");
      const messages = eligible.reduce<Message[]>((acc, p) => {
        return [
          ...acc,
          {
            id: uid(),
            ts: new Date().toISOString(),
            threadId: `t-${p.id}`,
            fromRole: "manager",
            fromName: "Lincoln Heights HS",
            kind: "alert",
            body: `Provisional surplus alert for Thursday 03/12. Estimated 60–95 packaged meals. Not yet a confirmed donation — please reserve tentative capacity.`,
            meta: { range: "60–95", category: "packaged" },
          },
        ];
      }, []);
      return {
        ...state,
        messages: [...state.messages, ...messages],
        audit: withAudit(state, {
          actor: "Maya Rodriguez",
          actorType: "human",
          action: `Sent provisional surplus alert to ${eligible.length} partners`,
          reason: "AI Copilot drafted alert, human approved sending",
          reversible: true,
        }),
      };
    }
    case "PARTNER_RESERVE": {
      const existing = state.matches.find((m) => m.partnerId === action.partnerId);
      const matches = existing
        ? state.matches.map((m) =>
            m.partnerId === action.partnerId ? { ...m, state: "reserved" as const, reservedMeals: action.meals } : m,
          )
        : [...state.matches, { partnerId: action.partnerId, state: "reserved" as const, reservedMeals: action.meals }];
      const partner = state.partners.find((p) => p.id === action.partnerId)!;
      return {
        ...state,
        matches,
        messages: withMessage(state, {
          threadId: `t-${action.partnerId}`,
          fromRole: "partner",
          fromName: partner.name,
          kind: "reservation",
          body: `Reserved tentative capacity for up to ${action.meals} packaged meals. Pickup window ${partner.windowStart}–${partner.windowEnd}.`,
          meta: { meals: action.meals },
        }),
        audit: withAudit(state, {
          actor: partner.name,
          actorType: "partner",
          action: `Reserved ${action.meals} meals (provisional)`,
          reversible: true,
        }),
      };
    }
    case "PARTNER_DECLINE": {
      const partner = state.partners.find((p) => p.id === action.partnerId)!;
      return {
        ...state,
        audit: withAudit(state, {
          actor: partner.name,
          actorType: "partner",
          action: `Declined provisional alert`,
          reason: "Capacity unavailable in window",
          reversible: false,
        }),
      };
    }
    case "CONFIRM_SURPLUS":
      return {
        ...state,
        surplusConfirmed: action.meals,
        audit: withAudit(state, {
          actor: "Maya Rodriguez",
          actorType: "human",
          action: `Confirmed ${action.meals} recoverable meals`,
          reason: "Day-of measurement after service",
          reversible: false,
        }),
      };
    case "COMPLETE_CHECKLIST":
      return {
        ...state,
        checklistComplete: true,
        audit: withAudit(state, {
          actor: "Maya Rodriguez",
          actorType: "human",
          action: "Completed recovery eligibility checklist",
          reason: "All seven items verified by qualified staff",
          reversible: false,
        }),
      };
    case "SELECT_PARTNER": {
      const partner = state.partners.find((p) => p.id === action.partnerId)!;
      const pickup: Pickup = {
        id: uid(),
        partnerId: action.partnerId,
        meals: action.meals,
        status: "partner-selected",
        eta: "14:25",
        createdAt: new Date().toISOString(),
      };
      return {
        ...state,
        matches: [
          ...state.matches.filter((m) => m.partnerId !== action.partnerId),
          { partnerId: action.partnerId, state: "confirmed", reservedMeals: action.meals },
        ],
        pickups: [...state.pickups, pickup],
        audit: withAudit(state, {
          actor: "Maya Rodriguez",
          actorType: "human",
          action: `Assigned pickup to ${partner.name}`,
          after: `${action.meals} meals reserved`,
          reversible: true,
        }),
      };
    }
    case "OVERRIDE_PARTNER": {
      const prev = state.partners.find((p) => p.id === action.previousId)!;
      const next = state.partners.find((p) => p.id === action.partnerId)!;
      return {
        ...state,
        audit: withAudit(state, {
          actor: "Maya Rodriguez",
          actorType: "human",
          action: `Overrode AI partner ranking`,
          before: prev.name,
          after: next.name,
          reason: action.reason,
          reversible: true,
        }),
      };
    }
    case "ADVANCE_PICKUP": {
      const pickup = state.pickups.find((p) => p.id === action.pickupId);
      if (!pickup) return state;
      const updated = state.pickups.map((p) => (p.id === action.pickupId ? { ...p, status: action.status } : p));
      let impact = state.impact;
      if (action.status === "distribution-confirmed") {
        impact = {
          ...impact,
          recoveredMeals: impact.recoveredMeals + pickup.meals,
          studentsServed: impact.studentsServed + pickup.meals,
          pickupsCompleted: impact.pickupsCompleted + 1,
        };
      }
      return {
        ...state,
        pickups: updated,
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

const STORAGE_KEY = "ssp_state_v1";

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL, (init) => {
    if (typeof window === "undefined") return init;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) return { ...init, ...JSON.parse(raw) } as State;
    } catch {}
    return init;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
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