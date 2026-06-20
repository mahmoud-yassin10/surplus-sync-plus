import type {
  AttendanceRecord,
  AuditEvent,
  CalendarEvent,
  Forecast,
  HorizonDay,
  ImpactRecord,
  MealRecord,
  Message,
  Pickup,
  RecoveryPartner,
  School,
} from "./types";
import { DEMO_FOCUS_DATE, DEMO_TODAY } from "./demo-date";

/** @deprecated Use DEMO_TODAY from demo-date.ts */
export const TODAY = DEMO_TODAY;
/** @deprecated Use DEMO_FOCUS_DATE from demo-date.ts */
export const FOCUS_DATE = DEMO_FOCUS_DATE;

export const SCHOOL: School = {
  id: "lhphs",
  name: "Lincoln Heights Public High School",
  city: "Chicago",
  state: "IL",
  enrolled: 820,
  eligible: 760,
  normalPrep: 730,
  manager: "Maya Rodriguez",
  admin: "Daniel Brooks",
};

function d(offset: number): string {
  const base = new Date(TODAY + "T12:00:00Z");
  base.setUTCDate(base.getUTCDate() + offset);
  return base.toISOString().slice(0, 10);
}

export const HORIZON_DAYS: HorizonDay[] = [
  {
    date: d(0),
    label: "Mon",
    weekday: "Monday",
    attendance: 712,
    intervalLow: 695,
    intervalHigh: 728,
    recommendedPrep: 738,
    currentPlan: 730,
    preventable: 0,
    risk: "low",
    events: [],
  },
  {
    date: d(1),
    label: "Tue",
    weekday: "Tuesday",
    attendance: 705,
    intervalLow: 686,
    intervalHigh: 722,
    recommendedPrep: 732,
    currentPlan: 730,
    preventable: 0,
    risk: "low",
    events: [],
  },
  {
    date: d(2),
    label: "Wed",
    weekday: "Wednesday",
    attendance: 690,
    intervalLow: 668,
    intervalHigh: 712,
    recommendedPrep: 728,
    currentPlan: 730,
    preventable: 5,
    risk: "low",
    events: ["exam"],
  },
  {
    date: d(3),
    label: "Thu",
    weekday: "Thursday",
    attendance: 528,
    intervalLow: 497,
    intervalHigh: 557,
    recommendedPrep: 562,
    currentPlan: 730,
    preventable: 168,
    risk: "high",
    events: ["exam", "trip", "early-dismissal", "weather", "popular-menu"],
  },
  {
    date: d(4),
    label: "Fri",
    weekday: "Friday",
    attendance: 670,
    intervalLow: 645,
    intervalHigh: 695,
    recommendedPrep: 708,
    currentPlan: 730,
    preventable: 22,
    risk: "moderate",
    events: ["popular-menu"],
  },
  {
    date: d(7),
    label: "Mon",
    weekday: "Monday",
    attendance: 715,
    intervalLow: 695,
    intervalHigh: 735,
    recommendedPrep: 740,
    currentPlan: 730,
    preventable: 0,
    risk: "low",
    events: [],
  },
  {
    date: d(8),
    label: "Tue",
    weekday: "Tuesday",
    attendance: 698,
    intervalLow: 678,
    intervalHigh: 718,
    recommendedPrep: 730,
    currentPlan: 730,
    preventable: 0,
    risk: "low",
    events: [],
  },
  {
    date: d(9),
    label: "Wed",
    weekday: "Wednesday",
    attendance: 612,
    intervalLow: 588,
    intervalHigh: 636,
    recommendedPrep: 648,
    currentPlan: 730,
    preventable: 82,
    risk: "moderate",
    events: ["assembly"],
  },
  {
    date: d(10),
    label: "Thu",
    weekday: "Thursday",
    attendance: 702,
    intervalLow: 680,
    intervalHigh: 724,
    recommendedPrep: 732,
    currentPlan: 730,
    preventable: 0,
    risk: "low",
    events: [],
  },
  {
    date: d(11),
    label: "Fri",
    weekday: "Friday",
    attendance: 680,
    intervalLow: 655,
    intervalHigh: 705,
    recommendedPrep: 715,
    currentPlan: 730,
    preventable: 15,
    risk: "low",
    events: [],
  },
];

export const FORECAST_THURSDAY: Forecast = {
  date: FOCUS_DATE,
  expectedAttendance: 528,
  intervalLow: 497,
  intervalHigh: 557,
  recommendedPrep: 562,
  shortageProb: 0.016,
  largeSurplusProb: 0.12,
  preventableSurplus: 168,
  risk: "high",
  dataQuality: "high",
  modelVersion: "ssp-forecast-1.0",
  menu: [
    { item: "Chicken portions", recommended: 548 },
    { item: "Rice portions", recommended: 562 },
    { item: "Vegetable sides", recommended: 520 },
    { item: "Fruit cups", recommended: 535 },
    { item: "Packaged milk", recommended: 555 },
  ],
  influences: [
    {
      factor: "Grade 10 field trip",
      direction: "down",
      magnitude: 92,
      note: "112 students off-campus, 09:30–14:00",
    },
    {
      factor: "Early dismissal",
      direction: "down",
      magnitude: 64,
      note: "All grades released 12:45",
    },
    {
      factor: "Midterm examinations",
      direction: "down",
      magnitude: 38,
      note: "Grades 11–12 alternate schedule",
    },
    {
      factor: "Heavy rain forecast",
      direction: "down",
      magnitude: 22,
      note: "NWS 78% probability >1in rainfall",
    },
    {
      factor: "Popular menu: chicken & rice",
      direction: "up",
      magnitude: 14,
      note: "Historical participation +6.1% vs baseline",
    },
    {
      factor: "Recent attendance trend",
      direction: "up",
      magnitude: 6,
      note: "Trailing 14-day average rising",
    },
  ],
  similarDays: [
    { date: "2025-10-23", attendance: 541, note: "Midterms + Gr. 9 trip" },
    { date: "2025-12-04", attendance: 519, note: "Early dismissal + storm" },
    { date: "2026-01-29", attendance: 552, note: "Exams + assembly" },
  ],
};

export const CALENDAR_EVENTS: CalendarEvent[] = [
  {
    id: "e1",
    date: FOCUS_DATE,
    kind: "exam",
    title: "Grades 11–12 midterm examinations",
    grades: ["11", "12"],
    attendanceDelta: -38,
    confidence: "high",
  },
  {
    id: "e2",
    date: FOCUS_DATE,
    kind: "trip",
    title: "Grade 10 field trip — Field Museum",
    grades: ["10"],
    attendanceDelta: -112,
    confidence: "high",
    notes: "Departs 09:15, returns 14:00.",
  },
  {
    id: "e3",
    date: FOCUS_DATE,
    kind: "early-dismissal",
    title: "Early dismissal — 12:45",
    attendanceDelta: -64,
    confidence: "high",
  },
  {
    id: "e4",
    date: FOCUS_DATE,
    kind: "weather",
    title: "Heavy rain forecast (NWS 78%)",
    attendanceDelta: -22,
    confidence: "medium",
  },
  {
    id: "e5",
    date: FOCUS_DATE,
    kind: "popular-menu",
    title: "Menu: chicken & rice (popular)",
    attendanceDelta: 14,
    confidence: "high",
  },
  {
    id: "e6",
    date: d(9),
    kind: "assembly",
    title: "Spring assembly — Grades 9–10",
    grades: ["9", "10"],
    attendanceDelta: -78,
    confidence: "medium",
  },
  {
    id: "e7",
    date: d(2),
    kind: "exam",
    title: "Grade 12 AP practice exam",
    grades: ["12"],
    attendanceDelta: -18,
    confidence: "high",
  },
];

export const ATTENDANCE_HISTORY: AttendanceRecord[] = Array.from({ length: 28 }, (_, i) => {
  const offset = -28 + i;
  const date = d(offset);
  const weekday = new Date(date + "T12:00:00Z").getUTCDay();
  if (weekday === 0 || weekday === 6) return null;
  const base = 705 + Math.round(Math.sin(i * 0.7) * 22);
  return { date, expected: base, actual: base + Math.round(Math.cos(i) * 14) };
}).filter(Boolean) as AttendanceRecord[];

const MENUS = [
  "Chicken & rice",
  "Turkey sandwich",
  "Veggie pasta",
  "Beef chili",
  "Cheese pizza",
  "Grain bowl",
];

export const MEAL_HISTORY: MealRecord[] = Array.from({ length: 20 }, (_, i) => {
  const offset = -20 + i;
  const date = d(offset);
  const weekday = new Date(date + "T12:00:00Z").getUTCDay();
  if (weekday === 0 || weekday === 6) return null;
  const menu = MENUS[i % MENUS.length];
  const attendance = 690 + Math.round(Math.sin(i) * 30);
  const prepared = 730;
  const served = Math.min(prepared, attendance - 8);
  const surplus = prepared - served;
  const recoverable = Math.round(surplus * 0.7);
  return {
    date,
    menu,
    category: i % 3 === 0 ? "packaged" : i % 3 === 1 ? "hot" : "chilled",
    prepared,
    served,
    recoverable,
    nonrecoverable: surplus - recoverable,
    attendance,
    cost: prepared * 3.4,
  };
}).filter(Boolean) as MealRecord[];

export const PARTNERS: RecoveryPartner[] = [
  {
    id: "p1",
    name: "Metro Community Food Bank",
    kind: "food-bank",
    distanceMi: 3.2,
    capacity: 120,
    refrigerated: true,
    vehicle: true,
    accepts: ["packaged", "chilled", "hot"],
    status: "available",
    responseMins: 18,
    lat: 0.35,
    lng: 0.62,
    windowStart: "13:00",
    windowEnd: "16:30",
    notes: "Refrigerated van, two-driver rotation.",
  },
  {
    id: "p2",
    name: "Harbor Family Shelter",
    kind: "shelter",
    distanceMi: 1.8,
    capacity: 70,
    refrigerated: false,
    vehicle: false,
    accepts: ["packaged"],
    status: "available",
    responseMins: 25,
    lat: 0.58,
    lng: 0.38,
    windowStart: "14:00",
    windowEnd: "15:30",
    notes: "Sealed packaged meals only.",
  },
  {
    id: "p3",
    name: "Neighborhood Community Kitchen",
    kind: "kitchen",
    distanceMi: 6.4,
    capacity: 180,
    refrigerated: true,
    vehicle: true,
    accepts: ["hot", "packaged", "chilled"],
    status: "available",
    responseMins: 42,
    lat: 0.22,
    lng: 0.18,
    windowStart: "15:00",
    windowEnd: "18:00",
  },
  {
    id: "p4",
    name: "Westside Senior Center",
    kind: "charity",
    distanceMi: 4.6,
    capacity: 40,
    refrigerated: false,
    vehicle: false,
    accepts: ["packaged"],
    status: "limited",
    responseMins: 60,
    lat: 0.72,
    lng: 0.78,
    notes: "Volunteer driver — capacity may shift.",
    windowStart: "14:30",
    windowEnd: "15:00",
  },
  {
    id: "p5",
    name: "Lakefront Outreach Network",
    kind: "charity",
    distanceMi: 8.1,
    capacity: 0,
    refrigerated: true,
    vehicle: true,
    accepts: ["hot", "packaged"],
    status: "closed",
    responseMins: 90,
    lat: 0.85,
    lng: 0.15,
    notes: "Temporarily closed — kitchen renovation.",
    windowStart: "—",
    windowEnd: "—",
  },
];

export const SCHOOL_POS = { lat: 0.5, lng: 0.5 };

export const INITIAL_PICKUPS: Pickup[] = [];

export const INITIAL_AUDIT: AuditEvent[] = [
  {
    id: "a1",
    ts: `${TODAY}T06:02:00Z`,
    actor: "ssp-forecast-1.0",
    actorType: "ai",
    action: "Generated 14-day demand forecast",
    reason: "Scheduled nightly run",
    reversible: false,
  },
  {
    id: "a2",
    ts: `${TODAY}T07:11:00Z`,
    actor: "System",
    actorType: "system",
    action: "Flagged Thursday 2026-03-12 as High risk",
    reason: "Preventable surplus > 100 meals",
    reversible: false,
  },
];

export const INITIAL_IMPACT: ImpactRecord = {
  preventedMeals: 0,
  recoveredMeals: 0,
  wastedMeals: 0,
  studentsServed: 0,
  costSaved: 0,
  forecastAccuracy: 0.912,
  pickupsCompleted: 0,
};

export const INITIAL_MESSAGES: Message[] = [];
