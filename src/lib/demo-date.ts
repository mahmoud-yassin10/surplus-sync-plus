/** Canonical demonstration timeline — Thursday March 12, 2026 focus day. */
export const DEMO_FOCUS_DATE = "2026-03-12";
export const DEMO_TODAY = "2026-03-09";

const DEMO_CLOCK_ANCHOR = `${DEMO_FOCUS_DATE}T12:00:00.000Z`;

export function formatFocusDateLong(): string {
  return "Thursday Mar 12, 2026";
}

export function formatFocusDateShort(): string {
  return "Thu Mar 12";
}

export function formatFocusDateSlash(): string {
  return "03/12";
}

/** Demo-anchored ISO timestamp (defaults to noon on focus day). */
export function demoTimestamp(offsetMs = 0): string {
  return new Date(new Date(DEMO_CLOCK_ANCHOR).getTime() + offsetMs).toISOString();
}

export function isFocusDateThursday(): boolean {
  return new Date(`${DEMO_FOCUS_DATE}T12:00:00Z`).getUTCDay() === 4;
}
