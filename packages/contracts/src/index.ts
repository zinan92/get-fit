export const consentTypes = ["health_processing", "third_party_model", "subscription_message"] as const;
export type ConsentType = (typeof consentTypes)[number];

export type ErrorCode =
  | "AUTH_REQUIRED"
  | "AUTH_INVALID"
  | "COACH_AUTH_REQUIRED"
  | "INVALID_INPUT"
  | "INVITATION_INVALID"
  | "PROFILE_INCOMPLETE"
  | "CONSENT_REQUIRED"
  | "RISK_MANUAL_REVIEW"
  | "PLAN_NOT_FOUND"
  | "DRAFT_NOT_FOUND"
  | "PROVIDER_UNCONFIGURED"
  | "PROVIDER_FAILED"
  | "VALIDATION_FAILED"
  | "NOT_FOUND"
  | "CONFLICT";

export type ApiError = { error: { code: ErrorCode | string; message: string; details?: Record<string, unknown> } };

export function isConsentType(value: unknown): value is ConsentType {
  return typeof value === "string" && (consentTypes as readonly string[]).includes(value);
}

export function requiredConsents(value: Set<ConsentType>): boolean {
  return value.has("health_processing") && value.has("third_party_model");
}

export function isSafeShortText(value: unknown, max = 160): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= max;
}

/**
 * Profile flags the system handles on its own: they block matching moves or
 * foods but keep automatic drafting available. Everything else — serious risks,
 * acute pain and any flag not listed here — goes to the coach.
 */
export const autoHandledInjuryFlags = ["knee_discomfort", "back_discomfort", "shoulder_discomfort", "wrist_discomfort", "ankle_discomfort"] as const;
export const autoHandledAllergens = ["egg", "milk", "wheat", "fish", "shellfish", "soy", "peanut", "tree_nut"] as const;
/** Shown during onboarding so the client can say so; always routes to manual review. */
export const manualRiskFlags = ["minor", "pregnancy", "acute_pain", "chronic_disease", "eating_disorder"] as const;

export function requiresManualReview(profile: { riskFlags: string[]; injuryFlags: string[]; allergyFlags: string[] }): boolean {
  const injuries = new Set<string>(autoHandledInjuryFlags);
  const allergens = new Set<string>(autoHandledAllergens);
  return profile.riskFlags.length > 0
    || profile.injuryFlags.some((flag) => !injuries.has(flag))
    || profile.allergyFlags.some((flag) => !allergens.has(flag));
}
