/**
 * WeChat CloudBase function entry. It adapts a callFunction event to the same
 * `handleApi` seam the Worker uses, so domain logic lives in one place. Only
 * identity (platform OPENID) and storage (a CloudBase document) differ.
 */
import { handleApi } from "../api/handlers";
import { loadSnapshot, saveSnapshot, StateConflictError, type SnapshotBackend } from "../api/persistence";
import { createMemoryStore, sha256 } from "../api/store";
import type { ApiEnv, PlatformIdentity } from "../api/types";
import { cloudbaseSnapshotBackend, type CloudbaseDatabase } from "./cloudbase-storage";

export type CloudFunctionEvent = {
  path?: unknown;
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

function failure(statusCode: number, code: string, message: string): CloudFunctionResult {
  return { statusCode, body: { error: { code, message } } };
}

export function createCloudFunction(options: CloudFunctionOptions) {
  const encryptionKey = options.env.DATA_ENCRYPTION_KEY;
  const coachOpenids = new Set((options.env.COACH_OPENIDS ?? "").split(",").map((value) => value.trim()).filter(Boolean));
  // Handlers never see credentials that belong to other deployments: no dev fixtures, no Sites owner header,
  // no shared coach token, no WeChat code exchange.
  const env: ApiEnv = {
    DATA_ENCRYPTION_KEY: encryptionKey,
    WECHAT_TEMPLATE_ID: options.env.WECHAT_TEMPLATE_ID,
  };
  const resolveOpenid = options.resolveOpenid ?? defaultResolveOpenid;
  const maxAttempts = Math.max(1, options.maxAttempts ?? 3);

  return async function main(event: CloudFunctionEvent, context?: unknown): Promise<CloudFunctionResult> {
    const path = typeof event?.path === "string" && event.path.startsWith("/api/") ? event.path : null;
    const method = typeof event?.method === "string" ? event.method.toUpperCase() : "GET";
    if (!path || !METHODS.has(method)) return failure(400, "BAD_EVENT", "Event requires an /api/ path and a supported method");
    if (!encryptionKey) return failure(503, "STORAGE_NOT_CONFIGURED", "Storage is temporarily unavailable");

    let openid = "";
    try { openid = resolveOpenid(context); } catch { openid = ""; }
    const platform: PlatformIdentity = { openid, openidHash: openid ? await sha256(openid) : "", isCoach: Boolean(openid) && coachOpenids.has(openid) };

    const headers: Record<string, string> = { "content-type": "application/json" };
    if (event.headers && typeof event.headers === "object") {
      for (const [name, value] of Object.entries(event.headers as Record<string, unknown>)) {
        if (typeof value === "string" && FORWARDED_HEADERS.has(name.toLowerCase())) headers[name.toLowerCase()] = value;
      }
    }
    const payload = method !== "GET" && event.body !== undefined ? JSON.stringify(event.body) : undefined;

    let backend: SnapshotBackend;
    try { backend = options.backend ?? cloudbaseBackend(); } catch { return failure(503, "STORAGE_UNAVAILABLE", "Storage is temporarily unavailable"); }

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      // Each attempt starts from freshly read state, so a retried request never builds on writes that lost the race.
      const store = createMemoryStore();
      let revision: number;
      try { revision = await loadSnapshot(store, backend, encryptionKey); } catch { return failure(503, "STORAGE_UNAVAILABLE", "Storage is temporarily unavailable"); }
      const pending: Promise<unknown>[] = [];
      const ctx = { waitUntil: (promise: Promise<unknown>) => { pending.push(promise); }, passThroughOnException() {} } as ExecutionContext;
      const request = new Request(`https://cloudfunction.invalid${path}`, { method, headers, body: payload });
      const response = await handleApi({ request, env, store, ctx, platform });
      // A cloud function instance may freeze after returning; finish deferred work first.
      await Promise.allSettled(pending);
      try {
        await saveSnapshot(store, backend, encryptionKey, revision);
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
