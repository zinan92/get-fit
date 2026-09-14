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

export function requiresManualReview(profile: { ageBand?: string; riskFlags: string[]; injuryFlags: string[]; allergyFlags: string[] }): boolean {
  const injuries = new Set<string>(autoHandledInjuryFlags);
  const allergens = new Set<string>(autoHandledAllergens);
  return profile.ageBand === "under_18"
    || profile.riskFlags.length > 0
    || profile.injuryFlags.some((flag) => !injuries.has(flag))
    || profile.allergyFlags.some((flag) => !allergens.has(flag));
}

export const profileTargets = ["fat_loss", "muscle_gain", "general_fitness"] as const;
export const ageBands = ["under_18", "18_24", "25_34", "35_44", "45_54", "55_plus"] as const;
export const trainingExperiences = ["beginner", "intermediate", "advanced"] as const;
/** Equipment a client can declare; an empty list means body weight only. */
export const equipmentOptions = ["dumbbell", "band", "kettlebell", "bench", "gym"] as const;

/** Client-facing wording for every onboarding choice; the mini-program is generated from this. */
export const profileOptionLabels = {
  target: { fat_loss: "减脂", muscle_gain: "增肌", general_fitness: "保持体能" },
  ageBand: { under_18: "未满 18 岁", "18_24": "18–24 岁", "25_34": "25–34 岁", "35_44": "35–44 岁", "45_54": "45–54 岁", "55_plus": "55 岁以上" },
  trainingExperience: { beginner: "刚开始练", intermediate: "练过一段时间", advanced: "经常训练" },
  equipment: { dumbbell: "哑铃", band: "弹力带", kettlebell: "壶铃", bench: "平凳", gym: "去健身房" },
  injury: { knee_discomfort: "膝盖", back_discomfort: "腰背", shoulder_discomfort: "肩膀", wrist_discomfort: "手腕", ankle_discomfort: "脚踝" },
  allergy: { egg: "鸡蛋", milk: "牛奶", wheat: "小麦", fish: "鱼", shellfish: "虾蟹贝", soy: "大豆", peanut: "花生", tree_nut: "坚果" },
  risk: { pregnancy: "怀孕或备孕", acute_pain: "最近有明显疼痛或受伤", chronic_disease: "有慢性病在治疗", eating_disorder: "有过进食障碍" },
} as const;
