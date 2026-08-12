import { sql } from "drizzle-orm";
import { integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const timestamps = {
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
};

export const coachAccount = sqliteTable("coach_account", {
  id: text("id").primaryKey(),
  passwordHash: text("password_hash").notNull(),
  status: text("status").notNull().default("active"),
  lastLoginAt: text("last_login_at"),
  ...timestamps,
});

export const client = sqliteTable("client", {
  id: text("id").primaryKey(),
  displayName: text("display_name").notNull(),
  status: text("status").notNull().default("invited"),
  ...timestamps,
});

export const clientAuth = sqliteTable("client_auth", {
  clientId: text("client_id").primaryKey().references(() => client.id),
  openidHash: text("openid_hash").notNull(),
  openidCiphertext: text("openid_ciphertext"),
  sessionHash: text("session_hash"),
  sessionExpiresAt: integer("session_expires_at"),
  ...timestamps,
}, (table) => ({ openidIndex: uniqueIndex("client_auth_openid_hash_idx").on(table.openidHash) }));

export const invitation = sqliteTable("invitation", {
  id: text("id").primaryKey(),
  clientId: text("client_id").notNull().references(() => client.id),
  tokenHash: text("token_hash").notNull(),
  expiresAt: text("expires_at").notNull(),
  consumedAt: text("consumed_at"),
  revokedAt: text("revoked_at"),
  ...timestamps,
}, (table) => ({ tokenIndex: uniqueIndex("invitation_token_hash_idx").on(table.tokenHash) }));

export const healthProfile = sqliteTable("health_profile", {
  clientId: text("client_id").primaryKey().references(() => client.id),
  ciphertext: text("ciphertext").notNull(),
  keyVersion: text("key_version").notNull(),
  version: integer("version").notNull().default(1),
  coachConfirmedAt: text("coach_confirmed_at"),
  safetyGate: text("safety_gate").notNull().default("auto_allowed"),
  ...timestamps,
});

export const consent = sqliteTable("consent", {
  id: text("id").primaryKey(),
  clientId: text("client_id").notNull().references(() => client.id),
  type: text("type").notNull(),
  textVersion: text("text_version").notNull(),
  acceptedAt: text("accepted_at").notNull(),
  revokedAt: text("revoked_at"),
  ...timestamps,
}, (table) => ({ clientTypeIndex: uniqueIndex("consent_client_type_idx").on(table.clientId, table.type) }));

export const exerciseCatalog = sqliteTable("exercise_catalog", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  contraindicationsJson: text("contraindications_json").notNull(),
  cuesJson: text("cues_json").notNull(),
  sourceVersion: text("source_version").notNull(),
  status: text("status").notNull().default("published"),
  ...timestamps,
});

export const foodCatalog = sqliteTable("food_catalog", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  kcalPer100g: real("kcal_per_100g").notNull(),
  unit: text("unit").notNull(),
  allergensJson: text("allergens_json").notNull(),
  sourceVersion: text("source_version").notNull(),
  status: text("status").notNull().default("published"),
  ...timestamps,
});

export const generationJob = sqliteTable("generation_job", {
  id: text("id").primaryKey(),
  clientId: text("client_id").notNull().references(() => client.id),
  provider: text("provider").notNull(),
  model: text("model").notNull(),
  schemaVersion: text("schema_version").notNull(),
  status: text("status").notNull(),
  errorCode: text("error_code"),
  traceId: text("trace_id").notNull(),
  startDate: text("start_date").notNull(),
  outputHash: text("output_hash"),
  operator: text("operator").notNull(),
  ...timestamps,
});

export const planDraft = sqliteTable("plan_draft", {
  id: text("id").primaryKey(),
  generationJobId: text("generation_job_id").notNull().references(() => generationJob.id),
  clientId: text("client_id").notNull().references(() => client.id),
  payloadJson: text("payload_json").notNull(),
  validationJson: text("validation_json").notNull(),
  status: text("status").notNull().default("pending_review"),
  rejectionReason: text("rejection_reason"),
  reviewedAt: text("reviewed_at"),
  ...timestamps,
});

export const planVersion = sqliteTable("plan_version", {
  id: text("id").primaryKey(),
  clientId: text("client_id").notNull().references(() => client.id),
  versionNo: integer("version_no").notNull(),
  effectiveFrom: text("effective_from").notNull(),
  effectiveTo: text("effective_to"),
  status: text("status").notNull(),
  payloadJson: text("payload_json").notNull(),
  approvedBy: text("approved_by").notNull(),
  approvedAt: text("approved_at").notNull(),
  changeReason: text("change_reason"),
  ...timestamps,
}, (table) => ({ clientVersionIndex: uniqueIndex("plan_version_client_version_idx").on(table.clientId, table.versionNo) }));

export const checkin = sqliteTable("checkin", {
  id: text("id").primaryKey(),
  clientId: text("client_id").notNull().references(() => client.id),
  planDayId: text("plan_day_id").notNull(),
  localDate: text("local_date").notNull(),
  itemId: text("item_id").notNull(),
  itemType: text("item_type").notNull(),
  status: text("status").notNull(),
  completedAt: text("completed_at"),
  ...timestamps,
}, (table) => ({ idempotencyIndex: uniqueIndex("checkin_client_date_item_idx").on(table.clientId, table.localDate, table.itemId) }));

export const wellnessFeedback = sqliteTable("wellness_feedback", {
  id: text("id").primaryKey(),
  clientId: text("client_id").notNull().references(() => client.id),
  localDate: text("local_date").notNull(),
  pain: text("pain").notNull(),
  energy: text("energy").notNull(),
  hunger: text("hunger").notNull(),
  ...timestamps,
}, (table) => ({ clientDateIndex: uniqueIndex("wellness_client_date_idx").on(table.clientId, table.localDate) }));

export const coachAlert = sqliteTable("coach_alert", {
  id: text("id").primaryKey(),
  clientId: text("client_id").notNull().references(() => client.id),
  localDate: text("local_date").notNull(),
  type: text("type").notNull(),
  status: text("status").notNull().default("open"),
  acknowledgedAt: text("acknowledged_at"),
  ...timestamps,
});

export const subscription = sqliteTable("subscription", {
  id: text("id").primaryKey(),
  clientId: text("client_id").notNull().references(() => client.id),
  templateId: text("template_id").notNull(),
  consentAt: text("consent_at").notNull(),
  revokedAt: text("revoked_at"),
  ...timestamps,
});

export const deliveryLog = sqliteTable("delivery_log", {
  id: text("id").primaryKey(),
  clientId: text("client_id").notNull().references(() => client.id),
  localDate: text("local_date").notNull(),
  idempotencyKey: text("idempotency_key").notNull(),
  providerCode: text("provider_code"),
  status: text("status").notNull(),
  sentAt: text("sent_at"),
  ...timestamps,
});

export const auditEvent = sqliteTable("audit_event", {
  id: text("id").primaryKey(),
  actor: text("actor").notNull(),
  action: text("action").notNull(),
  requestId: text("request_id"),
  planHash: text("plan_hash"),
  metadataJson: text("metadata_json").notNull(),
  ...timestamps,
});

export const deletionRequest = sqliteTable("deletion_request", {
  id: text("id").primaryKey(),
  clientId: text("client_id").notNull().references(() => client.id),
  requestedAt: text("requested_at").notNull(),
  purgeAt: text("purge_at").notNull(),
  receiptHash: text("receipt_hash"),
  status: text("status").notNull().default("requested"),
  ...timestamps,
});

// The single-coach edge adapter uses one encrypted snapshot so the V1 runtime
// can hydrate the same Store contract in local Miniflare and on D1. The
// normalized tables above remain the migration contract for the next scale
// step; sensitive payloads are never stored in this snapshot unencrypted.
export const runtimeState = sqliteTable("runtime_state", {
  id: text("id").primaryKey(),
  ciphertext: text("ciphertext").notNull(),
  keyVersion: text("key_version").notNull(),
  revision: integer("revision").notNull().default(0),
  ...timestamps,
});
