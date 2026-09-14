import type { PlanPayload, PlanVersion } from "../../packages/plan-schema/src/index";

export type ClientStatus =
  | "invited"
  | "onboarding"
  | "pending_profile_review"
  | "active"
  | "frozen"
  | "deletion_pending"
  | "deleted";

export type GenerationStatus =
  | "queued"
  | "running"
  | "awaiting_local"
  | "draft_ready"
  | "pending_review"
  | "failed"
  | "rejected"
  | "approved"
  | "published";

export type ConsentType = "health_processing" | "third_party_model" | "subscription_message";

export type ConsentRecord = {
  type: ConsentType;
  textVersion: string;
  acceptedAt: string;
  revokedAt: string | null;
};

export type HealthProfile = {
  target: "fat_loss" | "muscle_gain" | "general_fitness";
  ageBand: "under_18" | "18_24" | "25_34" | "35_44" | "45_54" | "55_plus";
  heightCm: number;
  weightKg: number;
  trainingExperience: "beginner" | "intermediate" | "advanced";
  sessionsPerWeek: number;
  minutesPerSession: number;
  equipment: string[];
  injuryFlags: string[];
  allergyFlags: string[];
  dietaryPreferences: string[];
  riskFlags: string[];
  timezone: "Asia/Shanghai";
};

export type ClientRecord = {
  id: string;
  displayName: string;
  status: ClientStatus;
  createdAt: string;
  /** The coach's private note; never part of any client-facing response. */
  coachNote?: string;
  /** Hidden from the coach's active list; the client's own data and access are unchanged. */
  archivedAt?: string | null;
};

export type InvitationRecord = {
  id: string;
  clientId: string;
  tokenHash: string;
  openidHash: string | null;
  expiresAt: string;
  consumedAt: string | null;
  revokedAt: string | null;
};

export type GenerationJobRecord = {
  id: string;
  clientId: string;
  provider: "codex_cli";
  model: string;
  schemaVersion: string;
  status: GenerationStatus;
  errorCode: string | null;
  traceId: string;
  startDate: string;
  outputHash: string | null;
  createdAt: string;
  updatedAt: string;
  operator: "system" | "coach";
};

export type DraftRecord = {
  id: string;
  generationJobId: string;
  clientId: string;
  status: "pending_review" | "rejected" | "approved";
  payload: PlanPayload;
  validation: { ok: true; warnings: string[] };
  createdAt: string;
  reviewedAt: string | null;
  rejectionReason: string | null;
};

export type PlanVersionRecord = PlanVersion & {
  id: string;
  clientId: string;
  status: "published" | "superseded" | "archived";
  approvedAt: string;
  changeReason: string | null;
};

export type CheckinRecord = {
  clientId: string;
  planDayId: string;
  localDate: string;
  itemId: string;
  itemType: "exercise" | "meal" | "water";
  status: "completed" | "not_completed";
  completedAt: string | null;
};

export type WellnessFeedback = {
  clientId: string;
  localDate: string;
  pain: "none" | "present";
  energy: "low" | "normal" | "good";
  hunger: "low" | "normal" | "high";
};

export type AlertRecord = {
  id: string;
  clientId: string;
  localDate: string;
  type: "pain";
  status: "open" | "acknowledged";
  createdAt: string;
  acknowledgedAt: string | null;
};

export type DeletionRequestRecord = {
  id: string;
  clientId: string | null;
  requestedAt: string;
  purgeAt: string;
  receiptHash: string;
  status: "requested" | "purged" | "cancelled";
};

export type FallbackTokenRecord = {
  tokenHash: string;
  jobId: string;
  clientId: string;
  expiresAt: string;
  consumedAt: string | null;
};

export type SubscriptionRecord = {
  id: string;
  clientId: string;
  templateId: string;
  consentAt: string;
  revokedAt: string | null;
};

export type DeliveryLogRecord = {
  id: string;
  clientId: string;
  localDate: string;
  idempotencyKey: string;
  providerCode: string | null;
  status: "sent" | "skipped" | "failed";
  sentAt: string | null;
};

export type ApiEnv = {
  DB?: D1Database;
  QUEUE?: Queue;
  DATA_ENCRYPTION_KEY?: string;
  WECHAT_TEMPLATE_ID?: string;
  WECHAT_ACCESS_TOKEN?: string;
  WECHAT_SEND_URL?: string;
  COACH_TOKEN?: string;
  /** Stable owner account id injected by a private Sites access policy. */
  COACH_ACCESS_USER_ID?: string;
  WECHAT_APP_ID?: string;
  WECHAT_APP_SECRET?: string;
  DEV_MODE?: string;
};

export type Store = {
  clients: Map<string, ClientRecord>;
  invitations: Map<string, InvitationRecord>;
  profiles: Map<string, HealthProfile>;
  consents: Map<string, Set<ConsentType>>;
  consentRecords: Map<string, Map<ConsentType, ConsentRecord>>;
  sessions: Map<string, { kind: "client" | "coach"; subjectId: string; expiresAt: number }>;
  jobs: Map<string, GenerationJobRecord>;
  drafts: Map<string, DraftRecord>;
  plans: Map<string, PlanVersionRecord>;
  checkins: Map<string, CheckinRecord>;
  feedback: Map<string, WellnessFeedback>;
  alerts: Map<string, AlertRecord>;
  authByOpenId: Map<string, string>;
  authOpenIdCiphertext: Map<string, string>;
  deletionRequests: Map<string, DeletionRequestRecord>;
  fallbackTokens: Map<string, FallbackTokenRecord>;
  subscriptions: Map<string, SubscriptionRecord>;
  delivery: Map<string, DeliveryLogRecord>;
  openedDays: Map<string, OpenedDayRecord>;
  audit: Array<Record<string, unknown>>;
};

/** One row per client per local date the client opened "today"; pilot metrics read this, not the truncated audit log. */
export type OpenedDayRecord = {
  clientId: string;
  localDate: string;
  firstOpenedAt: string;
};

/**
 * Identity asserted by the hosting platform (WeChat CloudBase injects the
 * caller's OPENID). When present it is the only identity source: bearer
 * sessions, coach tokens and request-supplied ids are ignored.
 */
export type PlatformIdentity = {
  openid: string;
  openidHash: string;
  isCoach: boolean;
  /** The operator's local drafting tool, authenticated by its own key; never a WeChat user. */
  operator?: boolean;
};

export type ApiContext = {
  request: Request;
  env: ApiEnv;
  store: Store;
  ctx: ExecutionContext;
  platform?: PlatformIdentity;
};

export type JsonRecord = Record<string, unknown>;

export function toJsonRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}
