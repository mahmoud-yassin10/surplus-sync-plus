import { describe, expect, it } from "vitest";
import {
  DEMO_FOCUS_DATE,
  formatFocusDateLong,
  formatFocusDateShort,
  formatFocusDateSlash,
  isFocusDateThursday,
} from "../demo-date";

describe("demo-date", () => {
  it("anchors focus day to Thursday March 12, 2026", () => {
    expect(DEMO_FOCUS_DATE).toBe("2026-03-12");
    expect(isFocusDateThursday()).toBe(true);
    expect(formatFocusDateLong()).toBe("Thursday Mar 12, 2026");
    expect(formatFocusDateShort()).toBe("Thu Mar 12");
    expect(formatFocusDateSlash()).toBe("03/12");
  });
});
