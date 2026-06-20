import { z } from "zod";

export const copilotUserRoleSchema = z.enum([
  "CAFETERIA_MANAGER",
  "SCHOOL_ADMINISTRATOR",
  "RECOVERY_PARTNER_COORDINATOR",
  "PLATFORM_ADMINISTRATOR",
]);

export const copilotActionTypeSchema = z.enum([
  "ATTENDANCE_UPDATE",
  "PREPARATION_OVERRIDE",
  "SURPLUS_ALERT",
  "PARTNER_SELECTION",
  "ALERT_CANCELLATION",
]);

export const copilotAnswerTypeSchema = z.enum([
  "FACT",
  "PREDICTION",
  "SIMULATION",
  "EXPLANATION",
  "REFUSAL",
]);

export const copilotProposalStatusSchema = z.enum([
  "PENDING_APPROVAL",
  "APPROVED",
  "REJECTED",
  "EXECUTED",
  "UNDONE",
]);

export const copilotEvidenceSchema = z.object({
  label: z.string(),
  value: z.string(),
  sourceType: z.enum([
    "SCHOOL_RECORD",
    "MODEL_OUTPUT",
    "PARTNER_RECORD",
    "USER_INPUT",
    "SYNTHETIC_DATA",
  ]),
});

export const copilotProvenanceSchema = z.object({
  source: z.string(),
  status: z.enum(["OBSERVED", "DERIVED", "SYNTHETIC", "PREDICTED", "HUMAN_CORRECTED"]),
});

export const copilotUncertaintySchema = z.object({
  level: z.enum(["LOW", "MODERATE", "HIGH"]),
  explanation: z.string(),
});

export const copilotToolCallSchema = z.object({
  toolName: z.string(),
  arguments: z.record(z.unknown()),
  permissionPassed: z.boolean(),
  permissionExplanation: z.string(),
  mutatedState: z.boolean(),
  requiresApproval: z.boolean(),
  returnedValue: z.unknown().optional(),
});

export const copilotPolicyCheckSchema = z.object({
  policy: z.string(),
  passed: z.boolean(),
  explanation: z.string(),
});

export const copilotProposalSchema = z.object({
  proposalId: z.string().uuid(),
  actionType: copilotActionTypeSchema,
  title: z.string(),
  summary: z.string(),
  reason: z.string(),
  requestedByRole: copilotUserRoleSchema,
  affectedEntities: z.array(
    z.object({
      type: z.string(),
      id: z.string(),
      label: z.string(),
    }),
  ),
  before: z.record(z.unknown()),
  after: z.record(z.unknown()),
  expectedConsequences: z.array(z.string()),
  risks: z.array(z.string()),
  policyChecks: z.array(copilotPolicyCheckSchema),
  requiredApprovals: z.array(copilotUserRoleSchema),
  reversible: z.boolean(),
  status: copilotProposalStatusSchema,
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime().optional(),
});

export const copilotStructuredResponseSchema = z.object({
  answer: z.string(),
  answerType: copilotAnswerTypeSchema,
  evidence: z.array(copilotEvidenceSchema),
  provenance: z.array(copilotProvenanceSchema),
  uncertainty: copilotUncertaintySchema,
  limitations: z.array(z.string()),
  toolCalls: z.array(copilotToolCallSchema),
  proposedActions: z.array(copilotProposalSchema),
  requiresHumanApproval: z.boolean(),
});

export const copilotBackendSessionStateSchema = z.object({
  sessionId: z.string().uuid(),
  role: copilotUserRoleSchema,
  proposals: z.array(copilotProposalSchema),
  selectedPartnerId: z.string().optional(),
  alertStatus: z.enum(["DRAFT", "SENT_PROVISIONAL", "NONE"]).optional(),
  forecast: z
    .object({
      provenance: z
        .object({
          source: z.string().optional(),
        })
        .passthrough()
        .optional(),
    })
    .passthrough()
    .optional(),
});

export const reconciliationOperationalSchema = z
  .object({
    expectedAttendance: z.number().int(),
    recommendedPreparation: z.number().int(),
    currentPreparationPlan: z.number().int(),
    attendanceCorrected: z.boolean(),
    provisionalAlertsSent: z.boolean(),
    selectedPartnerId: z.string().min(1).nullable(),
  })
  .strict();

export const reconciliationSnapshotSchema = z
  .object({
    source: z.literal("surplussync-plus"),
    stateVersion: z.literal("ssp_state_v2"),
    role: copilotUserRoleSchema,
    operational: reconciliationOperationalSchema,
  })
  .strict();

export type ReconciliationSnapshot = z.infer<typeof reconciliationSnapshotSchema>;

export const copilotMessageRequestSchema = z.object({
  message: z.string().min(1),
  snapshot: reconciliationSnapshotSchema,
});

export const copilotProposalActionRequestSchema = z.object({
  snapshot: reconciliationSnapshotSchema,
});

export const copilotSessionRequestSchema = z.object({
  snapshot: reconciliationSnapshotSchema,
});

export const copilotModeSchema = z.enum(["GEMINI_LIVE", "MOCK_FALLBACK"]);
export const copilotMlSourceSchema = z.enum(["live-ml", "canonical-fallback", "session-state"]);

export const copilotMessageResponseSchema = z.object({
  response: copilotStructuredResponseSchema,
  mode: copilotModeSchema,
  mlSource: copilotMlSourceSchema,
  sessionState: copilotBackendSessionStateSchema.optional(),
  warning: z.string().optional(),
});

export const copilotReconciliationResponseSchema = z.object({
  state: copilotBackendSessionStateSchema,
  changed: z.boolean(),
  idempotent: z.boolean(),
});

export const copilotApprovalResponseSchema = z.object({
  state: copilotBackendSessionStateSchema,
  proposal: copilotProposalSchema,
});

export const copilotSessionResponseSchema = z.object({
  ready: z.literal(true),
});

export const copilotStateResponseSchema = z.object({
  state: copilotBackendSessionStateSchema.nullable(),
  hasSession: z.boolean(),
});

export const copilotHealthResponseSchema = z.object({
  configured: z.boolean(),
  reachable: z.boolean(),
  modes: z.object({
    geminiLive: z.boolean(),
    deterministicFallback: z.boolean(),
  }),
  status: z.enum(["ready", "missing_url", "missing_token", "unreachable"]),
});

export const copilotGatewayErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});

export type CopilotStructuredResponse = z.infer<typeof copilotStructuredResponseSchema>;
export type CopilotProposal = z.infer<typeof copilotProposalSchema>;
export type CopilotMessageResponse = z.infer<typeof copilotMessageResponseSchema>;
export type CopilotHealthResponse = z.infer<typeof copilotHealthResponseSchema>;
export type CopilotGatewayError = z.infer<typeof copilotGatewayErrorSchema>;
export type CopilotMode = z.infer<typeof copilotModeSchema>;
export type CopilotMlSource = z.infer<typeof copilotMlSourceSchema>;

export function modeLabel(mode: CopilotMode): string {
  return mode === "GEMINI_LIVE" ? "Gemini live" : "Deterministic fallback";
}

export function mlSourceLabel(source: CopilotMlSource): string {
  switch (source) {
    case "live-ml":
      return "live ML";
    case "canonical-fallback":
      return "canonical fallback";
    case "session-state":
      return "session state";
  }
}

export function answerTypeLabel(answerType: z.infer<typeof copilotAnswerTypeSchema>): string {
  return answerType.toLowerCase();
}
