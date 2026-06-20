import { z } from "zod";

export const forecastProvenanceSchema = z.object({
  source: z.enum(["ml", "local-canonical-fallback"]),
  mlReachable: z.boolean(),
  fallbackUsed: z.boolean(),
  decisionStatus: z.literal("PROPOSED"),
  approvalRequired: z.boolean(),
});

export type ForecastProvenance = z.infer<typeof forecastProvenanceSchema>;

export const gatewayForecastRequestSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  schoolId: z.string().min(1).default("lhphs"),
});

export type GatewayForecastRequest = z.infer<typeof gatewayForecastRequestSchema>;

export const gatewayWhatIfRequestSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  scenario: z.enum(["attendance-trip-cancelled"]).default("attendance-trip-cancelled"),
  schoolId: z.string().min(1).default("lhphs"),
});

export type GatewayWhatIfRequest = z.infer<typeof gatewayWhatIfRequestSchema>;

const forecastWireSchema = z.object({
  date: z.string(),
  expectedAttendance: z.number(),
  intervalLow: z.number(),
  intervalHigh: z.number(),
  recommendedPrep: z.number(),
  shortageProb: z.number(),
  largeSurplusProb: z.number(),
  preventableSurplus: z.number(),
  risk: z.enum(["low", "moderate", "high", "critical"]),
  dataQuality: z.enum(["low", "medium", "high"]),
  modelVersion: z.string(),
  menu: z.array(z.object({ item: z.string(), recommended: z.number() })),
  influences: z.array(
    z.object({
      factor: z.string(),
      direction: z.enum(["up", "down"]),
      magnitude: z.number(),
      note: z.string(),
    }),
  ),
  similarDays: z.array(
    z.object({ date: z.string(), attendance: z.number(), note: z.string() }),
  ),
});

export const gatewayForecastPayloadSchema = z.object({
  forecast: forecastWireSchema,
  provenance: forecastProvenanceSchema,
});

export const gatewayErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
  provenance: forecastProvenanceSchema.optional(),
});

export const gatewayHealthSchema = z.object({
  status: z.enum(["ok", "degraded", "unavailable"]),
  mlServiceReachable: z.boolean(),
  mlModelLoaded: z.boolean(),
  fallbackEnabled: z.boolean(),
  mlServiceConfigured: z.boolean(),
  gateway: z.literal("surplussync-plus"),
});

export type GatewayHealth = z.infer<typeof gatewayHealthSchema>;
