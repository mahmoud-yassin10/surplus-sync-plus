/** Backend-compatible recovery partner identifiers (Copilot Lab contract). */
export const COPILOT_KNOWN_PARTNER_IDS = [
  "metro-food-bank",
  "harbor-shelter",
  "neighborhood-kitchen",
  "greenleaf-hub",
  "hope-outreach",
] as const;

export type CopilotPartnerId = (typeof COPILOT_KNOWN_PARTNER_IDS)[number];

export const DEFAULT_COPILOT_PARTNER_ID: CopilotPartnerId = "metro-food-bank";

const LOCAL_TO_COPILOT: Record<string, CopilotPartnerId> = {
  p1: "metro-food-bank",
  p2: "harbor-shelter",
  p3: "neighborhood-kitchen",
  p4: "greenleaf-hub",
};

const COPILOT_TO_LOCAL: Record<CopilotPartnerId, string> = {
  "metro-food-bank": "p1",
  "harbor-shelter": "p2",
  "neighborhood-kitchen": "p3",
  "greenleaf-hub": "p4",
  "hope-outreach": "p2",
};

export function mapPartnerToCopilot(localPartnerId: string | null | undefined): CopilotPartnerId | null {
  if (!localPartnerId) return null;
  return LOCAL_TO_COPILOT[localPartnerId] ?? null;
}

export function mapPartnerFromCopilot(copilotPartnerId: string): string | null {
  if (copilotPartnerId in COPILOT_TO_LOCAL) {
    return COPILOT_TO_LOCAL[copilotPartnerId as CopilotPartnerId];
  }
  return null;
}

export function isKnownCopilotPartnerId(id: string): id is CopilotPartnerId {
  return (COPILOT_KNOWN_PARTNER_IDS as readonly string[]).includes(id);
}
