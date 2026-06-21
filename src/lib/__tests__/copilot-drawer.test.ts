import { describe, expect, it } from "vitest";
import {
  answerTypeLabel,
  modeLabel,
  mlSourceLabel,
  type CopilotMessageResponse,
} from "../copilot-contracts";
import { buildDeterministicFallbackReply } from "../copilot-action-adapter";
import { INITIAL } from "../store";

describe("copilot drawer presentation helpers", () => {
  const liveResponse: CopilotMessageResponse = {
    mode: "GEMINI_LIVE",
    mlSource: "live-ml",
    response: {
      answer: "Expected attendance is 528 with recommended preparation 562.",
      answerType: "EXPLANATION",
      evidence: [{ label: "Attendance", value: "528", sourceType: "MODEL_OUTPUT" }],
      provenance: [{ source: "ML Forecast Service", status: "DERIVED" }],
      uncertainty: { level: "LOW", explanation: "Canonical demo scope." },
      limitations: ["Human approval required for operational changes."],
      toolCalls: [],
      proposedActions: [],
      requiresHumanApproval: false,
    },
  };

  it("renders structured answer metadata labels", () => {
    expect(modeLabel(liveResponse.mode)).toBe("Gemini live");
    expect(modeLabel("MOCK_FALLBACK", "live-ml")).toBe("Deterministic AI response");
    expect(modeLabel("MOCK_FALLBACK", "canonical-fallback")).toBe("Deterministic fallback");
    expect(mlSourceLabel(liveResponse.mlSource)).toBe("live SurplusSync ML service");
    expect(mlSourceLabel("canonical-fallback")).toContain("canonical local fallback");
    expect(answerTypeLabel(liveResponse.response.answerType)).toBe("explanation");
    expect(liveResponse.response.evidence[0]?.value).toBe("528");
    expect(liveResponse.response.provenance[0]?.source).toContain("ML");
    expect(liveResponse.response.limitations.length).toBeGreaterThan(0);
  });

  it("shows deterministic fallback badge when gateway is unavailable", () => {
    const fallback = buildDeterministicFallbackReply("Why is Thursday high risk?", INITIAL);
    expect(fallback.answer).toContain("528");
    expect(fallback.answer).toContain("562");
    expect(fallback.answer).toContain("168");
    expect(fallback.answer).toContain("4.1%");
    expect(fallback.limitations[0]).toContain("AI service unavailable");
  });

  it("keeps deterministic prompts available through fallback simulation copy", () => {
    const simulation = buildDeterministicFallbackReply(
      "What happens if attendance is 540?",
      INITIAL,
    );
    expect(simulation.answerType).toBe("SIMULATION");
    expect(simulation.answer).toContain("540");
    expect(simulation.answer).toContain("575");
    expect(simulation.answer).toContain("512");
    expect(simulation.answer).toContain("568");
    expect(simulation.answer).toContain("155");
    expect(simulation.answer).toContain("3.4%");
  });
});
