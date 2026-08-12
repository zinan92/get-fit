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
