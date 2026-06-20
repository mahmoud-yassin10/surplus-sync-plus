import { z } from "zod";
import {
  mlForecastFeaturesInputSchema,
  type MlForecastFeaturesInput,
} from "../lib/forecast-gateway-types";

export type { MlForecastFeaturesInput };

/** @deprecated Used only for canonical fixture assembly — not for noncanonical passthrough. */
export const mlForecastFeaturesSchema = mlForecastFeaturesInputSchema;
export type MlForecastFeatures = MlForecastFeaturesInput;

export const mlWhatIfChangesSchema = z.record(
  z.union([z.number(), z.boolean(), z.string()]),
);

export const mlWhatIfRequestSchema = z.object({
  base: mlForecastFeaturesInputSchema,
  changes: mlWhatIfChangesSchema,
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
