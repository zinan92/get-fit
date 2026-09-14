import type { ConsentType } from "../../packages/contracts/src/index";
import type { ConsentRecord, Store } from "./types";

const STATE_ID = "single-coach-v1";
const KEY_VERSION = "aes-gcm-v1";

type Snapshot = {
  clients: unknown[];
  invitations: unknown[];
  profiles: unknown[];
  consents: Array<[string, string[]]>;
  consentRecords: Array<[string, Array<[string, unknown]>]>;
  sessions: unknown[];
  jobs: unknown[];
  drafts: unknown[];
  plans: unknown[];
  checkins: unknown[];
  feedback: unknown[];
  alerts: unknown[];
  authByOpenId: Array<[string, string]>;
  authOpenIdCiphertext: Array<[string, string]>;
  deletionRequests: unknown[];
  fallbackTokens: unknown[];
  subscriptions: unknown[];
  delivery: unknown[];
  openedDays?: unknown[];
  audit: Array<Record<string, unknown>>;
};

type RuntimeRow = { ciphertext: string; key_version: string; revision: number };

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function deriveKey(secret: string): Promise<CryptoKey> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}

async function encrypt(value: string, secret: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv as unknown as BufferSource }, await deriveKey(secret), new TextEncoder().encode(value));
  return `${bytesToBase64(iv)}.${bytesToBase64(new Uint8Array(encrypted))}`;
}

async function decrypt(value: string, secret: string): Promise<string> {
  const [ivValue, ciphertextValue] = value.split(".");
  if (!ivValue || !ciphertextValue) throw new Error("invalid encrypted runtime state");
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv: base64ToBytes(ivValue) as unknown as BufferSource }, await deriveKey(secret), base64ToBytes(ciphertextValue) as unknown as BufferSource);
  return new TextDecoder().decode(plaintext);
}

export async function encryptSecret(value: string, secret: string): Promise<string> {
  return encrypt(value, secret);
}

export async function decryptSecret(value: string, secret: string): Promise<string> {
  return decrypt(value, secret);
}

function snapshot(store: Store): Snapshot {
  return {
    clients: [...store.clients.entries()],
    invitations: [...store.invitations.entries()],
    profiles: [...store.profiles.entries()],
    consents: [...store.consents.entries()].map(([key, values]) => [key, [...values]]),
    consentRecords: [...store.consentRecords.entries()].map(([key, values]) => [key, [...values.entries()]]),
    sessions: [...store.sessions.entries()],
    jobs: [...store.jobs.entries()],
    drafts: [...store.drafts.entries()],
    plans: [...store.plans.entries()],
    checkins: [...store.checkins.entries()],
    feedback: [...store.feedback.entries()],
    alerts: [...store.alerts.entries()],
    authByOpenId: [...store.authByOpenId.entries()],
    authOpenIdCiphertext: [...store.authOpenIdCiphertext.entries()],
    deletionRequests: [...store.deletionRequests.entries()],
    fallbackTokens: [...store.fallbackTokens.entries()],
    subscriptions: [...store.subscriptions.entries()],
    delivery: [...store.delivery.entries()],
    openedDays: [...store.openedDays.entries()],
    audit: store.audit.slice(-500),
  };
}

function hydrate(store: Store, value: Snapshot): void {
  store.clients = new Map(value.clients as Array<[string, Store["clients"] extends Map<string, infer V> ? V : never]>);
  store.invitations = new Map(value.invitations as Array<[string, Store["invitations"] extends Map<string, infer V> ? V : never]>);
  store.profiles = new Map(value.profiles as Array<[string, Store["profiles"] extends Map<string, infer V> ? V : never]>);
  store.consents = new Map(value.consents.map(([key, values]) => [key, new Set(values as ConsentType[])]));
  store.consentRecords = new Map((value.consentRecords ?? []).map(([key, values]) => [key, new Map(values as Array<[ConsentType, ConsentRecord]>)]));
  store.sessions = new Map(value.sessions as Array<[string, Store["sessions"] extends Map<string, infer V> ? V : never]>);
  store.jobs = new Map(value.jobs as Array<[string, Store["jobs"] extends Map<string, infer V> ? V : never]>);
  store.drafts = new Map(value.drafts as Array<[string, Store["drafts"] extends Map<string, infer V> ? V : never]>);
  store.plans = new Map(value.plans as Array<[string, Store["plans"] extends Map<string, infer V> ? V : never]>);
  store.checkins = new Map(value.checkins as Array<[string, Store["checkins"] extends Map<string, infer V> ? V : never]>);
  store.feedback = new Map(value.feedback as Array<[string, Store["feedback"] extends Map<string, infer V> ? V : never]>);
  store.alerts = new Map(value.alerts as Array<[string, Store["alerts"] extends Map<string, infer V> ? V : never]>);
  store.authByOpenId = new Map(value.authByOpenId);
  store.authOpenIdCiphertext = new Map(value.authOpenIdCiphertext ?? []);
  store.deletionRequests = new Map(value.deletionRequests as Array<[string, Store["deletionRequests"] extends Map<string, infer V> ? V : never]>);
  store.fallbackTokens = new Map(value.fallbackTokens as Array<[string, Store["fallbackTokens"] extends Map<string, infer V> ? V : never]>);
  store.subscriptions = new Map(value.subscriptions as Array<[string, Store["subscriptions"] extends Map<string, infer V> ? V : never]>);
  store.delivery = new Map(value.delivery as Array<[string, Store["delivery"] extends Map<string, infer V> ? V : never]>);
  store.openedDays = new Map((value.openedDays ?? []) as Array<[string, Store["openedDays"] extends Map<string, infer V> ? V : never]>);
  store.audit = value.audit;
}

/** Storage for the encrypted single-coach snapshot with compare-and-set writes. */
export type SnapshotBackend = {
  read(): Promise<{ ciphertext: string; keyVersion: string; revision: number } | null>;
  /** Writes only if the stored revision still equals `expectedRevision` (0 = no record yet). */
  write(record: { ciphertext: string; keyVersion: string; revision: number }, expectedRevision: number): Promise<"written" | "conflict">;
};

export class StateConflictError extends Error {
  constructor() {
    super("Runtime state changed during this request");
    this.name = "StateConflictError";
  }
}

/** Loads the snapshot into `store` and returns the revision it was read at (0 when empty). */
export async function loadSnapshot(store: Store, backend: SnapshotBackend, encryptionKey: string | undefined): Promise<number> {
  if (!encryptionKey) throw new Error("DATA_ENCRYPTION_KEY is required when storage is configured");
  const record = await backend.read();
  if (!record) return 0;
  if (record.keyVersion !== KEY_VERSION) throw new Error("Unsupported runtime state key version");
  hydrate(store, JSON.parse(await decrypt(record.ciphertext, encryptionKey)) as Snapshot);
  return record.revision;
}

/** Persists `store` as revision `readRevision + 1`; throws StateConflictError if another write landed first. */
export async function saveSnapshot(store: Store, backend: SnapshotBackend, encryptionKey: string | undefined, readRevision: number): Promise<number> {
  if (!encryptionKey) throw new Error("DATA_ENCRYPTION_KEY is required when storage is configured");
  const ciphertext = await encrypt(JSON.stringify(snapshot(store)), encryptionKey);
  const revision = readRevision + 1;
  if (await backend.write({ ciphertext, keyVersion: KEY_VERSION, revision }, readRevision) === "conflict") throw new StateConflictError();
  return revision;
}

/**
 * Hydrate the single-coach store from an encrypted D1 row. Missing key or
 * malformed state is a hard failure: no health data is silently downgraded to
 * an in-memory-only write path when D1 is configured.
 */
export async function hydrateStore(store: Store, db: D1Database | undefined, encryptionKey: string | undefined): Promise<void> {
  if (!db) return;
  if (!encryptionKey) throw new Error("DATA_ENCRYPTION_KEY is required when D1 is configured");
  const row = await db.prepare("SELECT ciphertext, key_version, revision FROM runtime_state WHERE id = ?1").bind(STATE_ID).first<RuntimeRow>();
  if (!row) return;
  if (row.key_version !== KEY_VERSION) throw new Error("Unsupported runtime state key version");
  const raw = await decrypt(row.ciphertext, encryptionKey);
  hydrate(store, JSON.parse(raw) as Snapshot);
}

export async function persistStore(store: Store, db: D1Database | undefined, encryptionKey: string | undefined): Promise<void> {
  if (!db) return;
  if (!encryptionKey) throw new Error("DATA_ENCRYPTION_KEY is required when D1 is configured");
  const ciphertext = await encrypt(JSON.stringify(snapshot(store)), encryptionKey);
  await db.prepare(`INSERT INTO runtime_state (id, ciphertext, key_version, revision, created_at, updated_at)
    VALUES (?1, ?2, ?3, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET ciphertext = excluded.ciphertext, key_version = excluded.key_version,
    revision = runtime_state.revision + 1, updated_at = CURRENT_TIMESTAMP`).bind(STATE_ID, ciphertext, KEY_VERSION).run();
}

export async function purgeClient(store: Store, clientId: string): Promise<void> {
  store.clients.delete(clientId);
  store.profiles.delete(clientId);
  store.consents.delete(clientId);
  store.consentRecords.delete(clientId);
  store.invitations.forEach((value, key) => { if (value.clientId === clientId) store.invitations.delete(key); });
  store.jobs.forEach((value, key) => { if (value.clientId === clientId) store.jobs.delete(key); });
  store.drafts.forEach((value, key) => { if (value.clientId === clientId) store.drafts.delete(key); });
  store.plans.forEach((value, key) => { if (value.clientId === clientId) store.plans.delete(key); });
  store.checkins.forEach((value, key) => { if (value.clientId === clientId) store.checkins.delete(key); });
  store.feedback.forEach((value, key) => { if (value.clientId === clientId) store.feedback.delete(key); });
  store.alerts.forEach((value, key) => { if (value.clientId === clientId) store.alerts.delete(key); });
  store.authByOpenId.forEach((value, key) => { if (value === clientId) store.authByOpenId.delete(key); });
  store.authOpenIdCiphertext.delete(clientId);
  store.sessions.forEach((value, key) => { if (value.subjectId === clientId) store.sessions.delete(key); });
  store.fallbackTokens.forEach((value, key) => { if (value.clientId === clientId) store.fallbackTokens.delete(key); });
  store.subscriptions.forEach((value, key) => { if (value.clientId === clientId) store.subscriptions.delete(key); });
  store.delivery.forEach((value, key) => { if (value.clientId === clientId) store.delivery.delete(key); });
  store.openedDays.forEach((value, key) => { if (value.clientId === clientId) store.openedDays.delete(key); });
  store.deletionRequests.forEach((value) => { if (value.clientId === clientId) value.clientId = null; });
  store.audit = store.audit.filter((event) => event.clientId !== clientId);
}
