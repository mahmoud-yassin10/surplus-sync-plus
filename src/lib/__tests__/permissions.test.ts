import { describe, expect, it } from "vitest";
import { canPerform } from "../permissions";

describe("permissions", () => {
  it("restricts plan changes to manager", () => {
    expect(canPerform("manager", "APPLY_RECOMMENDATION")).toBe(true);
    expect(canPerform("admin", "APPLY_RECOMMENDATION")).toBe(false);
    expect(canPerform("partner", "SET_PLAN")).toBe(false);
  });

  it("allows attendance correction for manager and admin", () => {
    expect(canPerform("manager", "CORRECT_ATTENDANCE")).toBe(true);
    expect(canPerform("admin", "CORRECT_ATTENDANCE")).toBe(true);
    expect(canPerform("partner", "CORRECT_ATTENDANCE")).toBe(false);
  });

  it("allows partner reserve for partner manager and admin", () => {
    expect(canPerform("partner", "PARTNER_RESERVE")).toBe(true);
    expect(canPerform("manager", "PARTNER_RESERVE")).toBe(true);
    expect(canPerform("platform", "PARTNER_RESERVE")).toBe(false);
  });

  it("allows reset for all demo roles", () => {
    expect(canPerform("manager", "RESET")).toBe(true);
    expect(canPerform("partner", "RESET")).toBe(true);
    expect(canPerform("platform", "RESET")).toBe(true);
  });
});
