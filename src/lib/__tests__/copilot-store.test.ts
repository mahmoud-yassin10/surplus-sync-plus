import { describe, expect, it } from "vitest";
import { INITIAL, reducer } from "../store";

describe("CANCEL_PROVISIONAL_ALERTS", () => {
  it("is idempotent and preserves unrelated messages", () => {
    const alerted = reducer(INITIAL, { type: "SEND_PROVISIONAL_ALERTS" });
    const messagesBefore = alerted.messages.length;
    const cancelled = reducer(alerted, { type: "CANCEL_PROVISIONAL_ALERTS" });
    const cancelledAgain = reducer(cancelled, { type: "CANCEL_PROVISIONAL_ALERTS" });
    expect(cancelled.messages.length).toBe(messagesBefore);
    expect(cancelled.audit.some((a) => a.action === "Cancelled provisional alerts")).toBe(true);
    expect(cancelledAgain.audit.filter((a) => a.action === "Cancelled provisional alerts")).toHaveLength(1);
  });
});

describe("SEND_PROVISIONAL_ALERTS idempotency", () => {
  it("does not duplicate provisional messages", () => {
    const once = reducer(INITIAL, { type: "SEND_PROVISIONAL_ALERTS" });
    const twice = reducer(once, { type: "SEND_PROVISIONAL_ALERTS" });
    expect(twice.messages.length).toBe(once.messages.length);
  });
});
