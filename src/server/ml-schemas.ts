import { z } from "zod";

/** ML service POST /v1/forecast request body (snake_case wire format). */
export const mlForecastFeaturesSchema = z.object({
  school_id: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  enrolled: z.number().int().positive().default(820),
  eligible: z.number().int().positive().default(760),
  normal_prep: z.number().int().nonnegative().default(730),
  expected_attendance: z.number().int().nonnegative().optional(),
  is_exam: z.boolean().default(false),
  trip_students: z.number().int().nonnegative().default(0),
  early_dismissal: z.boolean().default(false),
  assembly_students: z.number().int().nonnegative().default(0),
  sports_students: z.number().int().nonnegative().default(0),
  rain_probability: z.number().min(0).max(1).default(0),
  rain_inches: z.number().nonnegative().default(0),
  temperature_f: z.number().default(55),
  menu_name: z.string().default("Chicken & rice"),
  menu_popularity: z.number().min(0.5).max(1.5).default(1),
  recent_attendance_7d: z.number().nonnegative().default(705),
  recent_attendance_14d: z.number().nonnegative().default(702),
});

export type MlForecastFeatures = z.infer<typeof mlForecastFeaturesSchema>;

export const mlWhatIfRequestSchema = z.object({
  base: mlForecastFeaturesSchema,
  changes: z.record(z.union([z.number(), z.boolean(), z.string()])),
});

export const mlMenuPredictionSchema = z.object({
  item: z.string(),
  recommended: z.number().int(),
});

export const mlInfluenceSchema = z.object({
  factor: z.string(),
  direction: z.enum(["up", "down"]),
  magnitude: z.number().int(),
  note: z.string(),
});

export const mlSimilarDaySchema = z.object({
  date: z.string(),
  attendance: z.number().int(),
  note: z.string(),
});

/** Strict validation for upstream ML responses — reject malformed output. */
export const mlForecastResponseSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  expectedAttendance: z.number().int().nonnegative(),
  intervalLow: z.number().int().nonnegative(),
  intervalHigh: z.number().int().nonnegative(),
  recommendedPrep: z.number().int().nonnegative(),
  shortageProb: z.number().min(0).max(1).optional(),
  largeSurplusProb: z.number().min(0).max(1).optional(),
  preventableSurplus: z.number().int().nonnegative(),
  risk: z.enum(["low", "moderate", "high", "critical"]).optional(),
  dataQuality: z.enum(["low", "medium", "high"]).optional(),
  modelVersion: z.string().optional(),
  menu: z.array(mlMenuPredictionSchema).optional(),
  influences: z.array(mlInfluenceSchema).optional(),
  similarDays: z.array(mlSimilarDaySchema).optional(),
  approvalRequired: z.boolean().default(true),
  decisionStatus: z.literal("PROPOSED").default("PROPOSED"),
  safetyFloorApplied: z.boolean().optional(),
  generatedAt: z.string().optional(),
});

export type MlForecastResponse = z.infer<typeof mlForecastResponseSchema>;

export const mlHealthResponseSchema = z.object({
  status: z.string(),
  modelLoaded: z.boolean().optional(),
  service: z.string().optional(),
});
