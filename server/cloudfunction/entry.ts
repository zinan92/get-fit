/**
 * WeChat CloudBase function entry. It adapts a callFunction event to the same
 * `handleApi` seam the Worker uses, so domain logic lives in one place. Only
 * identity (platform OPENID) and storage (a CloudBase document) differ.
 */
import { handleApi } from "../api/handlers";
import { durableFingerprint, loadSnapshot, saveSnapshot, StateConflictError, type SnapshotBackend } from "../api/persistence";
import { purgeDueDeletions } from "../api/retention";
import { createMemoryStore, sha256 } from "../api/store";
import type { ApiEnv, PlatformIdentity } from "../api/types";
import { cloudbaseSnapshotBackend, type CloudbaseDatabase } from "./cloudbase-storage";

export const RETENTION_TRIGGER = "daily-retention";

export type CloudFunctionEvent = {
  action?: unknown;
  Type?: unknown;
  TriggerName?: unknown;
  path?: unknown;
  operatorKey?: unknown;
  method?: unknown;
  headers?: unknown;
  body?: unknown;
};

export type CloudFunctionResult = {
  statusCode: number;
  body: unknown;
};

type CloudFunctionOptions = {
  env: Record<string, string | undefined>;
  /** Snapshot storage; defaults to the CloudBase database of the running environment. */
  backend?: SnapshotBackend;
  /** Reads the caller's OPENID from the invocation context; defaults to the CloudBase SDK. */
  resolveOpenid?: (context: unknown) => string;
  maxAttempts?: number;
};

const METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE"]);
// Everything else a caller sends (authorization, x-coach-token, edge identity headers) is dropped:
// identity comes only from the platform context.
const FORWARDED_HEADERS = new Set(["idempotency-key"]);

/** Runtime globals the shared API code depends on; reported by the spike test and health checks. */
export function runtimeCapabilities(): Record<string, boolean> {
  return {
    cryptoSubtle: typeof globalThis.crypto?.subtle?.digest === "function",
    randomUUID: typeof globalThis.crypto?.randomUUID === "function",
    request: typeof globalThis.Request === "function",
    response: typeof globalThis.Response === "function",
    headers: typeof globalThis.Headers === "function",
    textEncoder: typeof globalThis.TextEncoder === "function",
    fetch: typeof globalThis.fetch === "function",
  };
}

type CloudbaseSdk = {
  init(options: Record<string, unknown>): { database(): CloudbaseDatabase };
  getCloudbaseContext(context: unknown): Record<string, string | undefined>;
  SYMBOL_CURRENT_ENV: unknown;
};

let sdk: CloudbaseSdk | null = null;
function cloudbaseSdk(): CloudbaseSdk {
  // Loaded lazily so the bundle can be exercised without the SDK installed; the deployed function lists it as a dependency.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  sdk ??= require("@cloudbase/node-sdk") as CloudbaseSdk;
  return sdk;
}

function defaultResolveOpenid(context: unknown): string {
  const values = cloudbaseSdk().getCloudbaseContext(context ?? {});
  return String(values.WX_OPENID || values.OPENID || "");
}

let defaultBackend: SnapshotBackend | null = null;
function cloudbaseBackend(): SnapshotBackend {
  const cloudbase = cloudbaseSdk();
  defaultBackend ??= cloudbaseSnapshotBackend(cloudbase.init({ env: cloudbase.SYMBOL_CURRENT_ENV }).database());
  return defaultBackend;
}

/** Deployment check: runtime globals, storage readable with the configured key, and which settings are present (never their values). */
async function runRetention(storage: SnapshotBackend, encryptionKey: string, maxAttempts: number): Promise<CloudFunctionResult> {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const store = createMemoryStore();
    let revision: number;
    try { revision = await loadSnapshot(store, storage, encryptionKey); } catch { return failure(503, "STORAGE_UNAVAILABLE", "Storage is temporarily unavailable"); }
    const purged = await purgeDueDeletions(store);
    if (!purged) return { statusCode: 200, body: { purged: 0 } };
    try { await saveSnapshot(store, storage, encryptionKey, revision); return { statusCode: 200, body: { purged } }; }
    catch (caught) { if (!(caught instanceof StateConflictError)) return failure(503, "STORAGE_UNAVAILABLE", "Storage is temporarily unavailable"); }
  }
  return failure(409, "STATE_CONFLICT", "Retention could not save; it will run again tomorrow");
}

async function health(storage: SnapshotBackend, encryptionKey: string | undefined, config: { coaches: number; operatorKey: boolean; retention: boolean }): Promise<CloudFunctionResult> {
  let storageStatus = "unchecked";
  if (encryptionKey) {
    try { await loadSnapshot(createMemoryStore(), storage, encryptionKey); storageStatus = "ok"; }
    catch { storageStatus = "unreadable"; }
  }
  const capabilities = runtimeCapabilities();
  const ok = storageStatus === "ok" && Object.values(capabilities).every(Boolean) && config.coaches > 0;
  return {
    statusCode: ok ? 200 : 503,
    body: { ok, node: typeof process !== "undefined" ? process.versions.node : null, capabilities, storage: storageStatus, config: { encryptionKey: Boolean(encryptionKey), coaches: config.coaches, operatorKey: config.operatorKey, retentionJob: config.retention } },
  };
}

function sameHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index += 1) diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  return diff === 0;
}

function failure(statusCode: number, code: string, message: string): CloudFunctionResult {
  return { statusCode, body: { error: { code, message } } };
}

export function createCloudFunction(options: CloudFunctionOptions) {
  const encryptionKey = options.env.DATA_ENCRYPTION_KEY;
  const operatorKeyHash = (options.env.OPERATOR_KEY_SHA256 ?? "").trim().toLowerCase();
  // Stop switch for the scheduled deletion job.
  const retentionEnabled = options.env.RETENTION_JOB_ENABLED !== "false";
  const list = (value: string | undefined) => new Set((value ?? "").split(",").map((item) => item.trim()).filter(Boolean));
  const coachOpenids = list(options.env.COACH_OPENIDS);
  // Hashes let the coach be allowlisted from the account id shown in 我的, without anyone copying a raw OPENID.
  const coachOpenidHashes = new Set([...list(options.env.COACH_OPENID_HASHES)].map((item) => item.toLowerCase()));
  // Handlers never see credentials that belong to other deployments: no dev fixtures, no Sites owner header,
  // no shared coach token, no WeChat code exchange.
  const env: ApiEnv = {
    DATA_ENCRYPTION_KEY: encryptionKey,
    WECHAT_TEMPLATE_ID: options.env.WECHAT_TEMPLATE_ID,
  };
  const resolveOpenid = options.resolveOpenid ?? defaultResolveOpenid;
  const backend = () => options.backend ?? cloudbaseBackend();
  const maxAttempts = Math.max(1, options.maxAttempts ?? 3);

  return async function main(event: CloudFunctionEvent, context?: unknown): Promise<CloudFunctionResult> {
    const path = typeof event?.path === "string" && event.path.startsWith("/api/") ? event.path : null;
    const method = typeof event?.method === "string" ? event.method.toUpperCase() : "GET";
    // A CloudBase timer trigger delivers { Type: "Timer", TriggerName } instead of an api event.
    const timer = event?.Type === "Timer" && event?.TriggerName === RETENTION_TRIGGER;
    const action = timer ? "purge" : event?.action === "health" || event?.action === "purge" ? event.action : null;
    if (!action && (!path || !METHODS.has(method))) return failure(400, "BAD_EVENT", "Event requires an /api/ path and a supported method");
    if (!encryptionKey && action !== "health") return failure(503, "STORAGE_NOT_CONFIGURED", "Storage is temporarily unavailable");

    let openid = "";
    try { openid = resolveOpenid(context); } catch { openid = ""; }
    // The operator tool calls from the CLI with no WeChat identity and presents its own key.
    const operator = !openid && Boolean(operatorKeyHash) && typeof event.operatorKey === "string" && sameHex(await sha256(event.operatorKey), operatorKeyHash);
    const openidHash = openid ? await sha256(openid) : "";
    const platform: PlatformIdentity = { openid, openidHash, isCoach: Boolean(openid) && (coachOpenids.has(openid) || coachOpenidHashes.has(openidHash)), operator };

    if (event.action === "health") return health(backend(), encryptionKey, { coaches: coachOpenids.size + coachOpenidHashes.size, operatorKey: Boolean(operatorKeyHash), retention: retentionEnabled });
    // Daily retention job (timer trigger). WeChat callers always carry an OPENID, so they cannot start it.
    if (action === "purge") {
      if (openid) return failure(403, "FORBIDDEN", "Retention runs only from the scheduler");
      if (!retentionEnabled) return { statusCode: 200, body: { skipped: "RETENTION_JOB_ENABLED=false" } };
      return runRetention(backend(), encryptionKey!, maxAttempts);
    }
    // Any WeChat caller may read their own account id (a hash of the OPENID) to be added to the coach list.
    if (path === "/api/me/account-id" && method === "GET") return openid ? { statusCode: 200, body: { accountId: openidHash, isCoach: platform.isCoach } } : failure(401, "AUTH_REQUIRED", "WeChat identity is required");

    const headers: Record<string, string> = { "content-type": "application/json" };
    if (event.headers && typeof event.headers === "object") {
      for (const [name, value] of Object.entries(event.headers as Record<string, unknown>)) {
        if (typeof value === "string" && FORWARDED_HEADERS.has(name.toLowerCase())) headers[name.toLowerCase()] = value;
      }
    }
    const payload = method !== "GET" && event.body !== undefined ? JSON.stringify(event.body) : undefined;

    let storage: SnapshotBackend;
    try { storage = backend(); } catch { return failure(503, "STORAGE_UNAVAILABLE", "Storage is temporarily unavailable"); }

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      // Each attempt starts from freshly read state, so a retried request never builds on writes that lost the race.
      const store = createMemoryStore();
      let revision: number;
      try { revision = await loadSnapshot(store, storage, encryptionKey!); } catch { return failure(503, "STORAGE_UNAVAILABLE", "Storage is temporarily unavailable"); }
      const pending: Promise<unknown>[] = [];
      const ctx = { waitUntil: (promise: Promise<unknown>) => { pending.push(promise); }, passThroughOnException() {} } as ExecutionContext;
      const request = new Request(`https://cloudfunction.invalid${path}`, { method, headers, body: payload });
      const before = await durableFingerprint(store);
      const response = await handleApi({ request, env, store, ctx, platform });
      // A cloud function instance may freeze after returning; finish deferred work first.
      await Promise.allSettled(pending);
      try {
        // Browsing a plan changes nothing durable; only write when something that must survive changed.
        if (await durableFingerprint(store) !== before) await saveSnapshot(store, storage, encryptionKey!, revision);
      } catch (caught) {
        if (caught instanceof StateConflictError) continue;
        return failure(503, "STORAGE_UNAVAILABLE", "Storage is temporarily unavailable");
      }
      const text = await response.text();
      let body: unknown = null;
      try { body = text ? JSON.parse(text) : null; } catch { body = { error: { code: "NON_JSON_RESPONSE" } }; }
      return { statusCode: response.status, body };
    }
    return failure(409, "STATE_CONFLICT", "Another change was saved at the same time; try again");
  };
}

export const main = createCloudFunction({ env: typeof process !== "undefined" ? process.env : {} });
