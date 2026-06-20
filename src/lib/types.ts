export type Role = "manager" | "admin" | "partner" | "platform";

export interface User {
  id: string;
  name: string;
  role: Role;
  org: string;
}

export interface School {
  id: string;
  name: string;
  city: string;
  state: string;
  enrolled: number;
  eligible: number;
  normalPrep: number;
  manager: string;
  admin: string;
}

export type EventKind =
  | "exam"
  | "trip"
  | "early-dismissal"
  | "weather"
  | "popular-menu"
  | "assembly"
  | "holiday"
  | "sports"
  | "closure";

export interface CalendarEvent {
  id: string;
  date: string; // ISO yyyy-mm-dd
  kind: EventKind;
  title: string;
  grades?: string[];
  attendanceDelta: number; // expected change in attending students
  confidence: "low" | "medium" | "high";
  notes?: string;
}

export interface AttendanceRecord {
  date: string;
  expected: number;
  actual: number | null;
}

export interface MealRecord {
  date: string;
  menu: string;
  category: "hot" | "packaged" | "chilled";
  prepared: number;
  served: number;
  recoverable: number;
  nonrecoverable: number;
  attendance: number;
  cost: number;
  notes?: string;
}

export interface MenuPrediction {
  item: string;
  recommended: number;
}

export interface Forecast {
  date: string;
  expectedAttendance: number;
  intervalLow: number;
  intervalHigh: number;
  recommendedPrep: number;
  shortageProb: number; // 0..1
  largeSurplusProb: number;
  preventableSurplus: number;
  risk: "low" | "moderate" | "high" | "critical";
  dataQuality: "low" | "medium" | "high";
  modelVersion: string;
  menu: MenuPrediction[];
  influences: { factor: string; direction: "up" | "down"; magnitude: number; note: string }[];
  similarDays: { date: string; attendance: number; note: string }[];
}

export interface HorizonDay {
  date: string;
  label: string;
  weekday: string;
  attendance: number;
  intervalLow: number;
  intervalHigh: number;
  recommendedPrep: number;
  currentPlan: number;
  preventable: number;
  risk: "low" | "moderate" | "high" | "critical";
  events: string[];
}

export interface ForecastView {
  date: string;
  focusDateLong: string;
  focusDateShort: string;
  focusDateSlash: string;
  expectedAttendance: number;
  intervalLow: number;
  intervalHigh: number;
  intervalLabel: string;
  recommendedPrep: number;
  currentPlan: number;
  baselinePrep: number;
  preventableSurplus: number;
  shortageProb: number;
  largeSurplusProb: number;
  safetyFloor: number;
  safetyBuffer: number;
  maxSafeReduction: number;
  planDelta: number;
  risk: Forecast["risk"];
  modelVersion: string;
  recommendationKey: string;
  approvedForCurrentRecommendation: boolean;
  attendanceCorrected: boolean;
  scenarioRows: { id: string; label: string; meals: number; shortage: number; waste: number }[];
  influences: Forecast["influences"];
  similarDays: Forecast["similarDays"];
  menu: Forecast["menu"];
  dataQuality: Forecast["dataQuality"];
}

export type PartnerStatus = "available" | "limited" | "unavailable" | "closed";

export interface RecoveryPartner {
  id: string;
  name: string;
  kind: "food-bank" | "shelter" | "kitchen" | "charity";
  distanceMi: number;
  capacity: number;
  refrigerated: boolean;
  vehicle: boolean;
  accepts: ("hot" | "packaged" | "chilled")[];
  status: PartnerStatus;
  responseMins: number;
  lat: number; // normalized 0..1 for map
  lng: number;
  windowStart: string;
  windowEnd: string;
  notes?: string;
}

export type MatchState = "provisional" | "reserved" | "confirmed" | "completed" | "declined";

export interface PartnerMatch {
  partnerId: string;
  state: MatchState;
  reservedMeals: number;
}

export type PickupStatus =
  | "alert-sent"
  | "capacity-reserved"
  | "surplus-confirmed"
  | "partner-selected"
  | "driver-assigned"
  | "en-route"
  | "arrived"
  | "collected"
  | "delivered"
  | "distribution-confirmed";

export interface Pickup {
  id: string;
  partnerId: string;
  meals: number;
  status: PickupStatus;
  eta: string;
  driver?: string;
  createdAt: string;
  impactRecorded?: boolean;
}

export interface AuditEvent {
  id: string;
  ts: string;
  actor: string;
  actorType: "ai" | "human" | "system" | "partner";
  action: string;
  reason?: string;
  before?: string;
  after?: string;
  reversible?: boolean;
}

export interface Message {
  id: string;
  threadId: string;
  fromRole: Role | "system";
  fromName: string;
  ts: string;
  kind: "alert" | "reservation" | "confirmation" | "status" | "text";
  body: string;
  meta?: Record<string, string | number>;
}

export interface ImpactRecord {
  preventedMeals: number;
  recoveredMeals: number;
  wastedMeals: number;
  studentsServed: number;
  costSaved: number;
  forecastAccuracy: number;
  pickupsCompleted: number;
}