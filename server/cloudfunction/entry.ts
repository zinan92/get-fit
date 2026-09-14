/**
 * WeChat CloudBase function entry. It adapts a callFunction event to the same
 * `handleApi` seam the Worker uses, so domain logic lives in one place.
 * Storage and platform identity adapters are added in #10; this entry keeps a
 * per-instance memory store.
 */
import { handleApi } from "../api/handlers";
import { createMemoryStore } from "../api/store";
import type { ApiEnv, Store } from "../api/types";

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
  store?: Store;
};

const METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE"]);

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

export function createCloudFunction(options: CloudFunctionOptions) {
  // DEV_MODE unlocks fixture identities; a cloud function is never a local sandbox.
  const env: ApiEnv = { ...options.env, DEV_MODE: undefined, DB: undefined, QUEUE: undefined } as ApiEnv;
  const store = options.store ?? createMemoryStore();

  return async function main(event: CloudFunctionEvent): Promise<CloudFunctionResult> {
    const path = typeof event?.path === "string" && event.path.startsWith("/api/") ? event.path : null;
    const method = typeof event?.method === "string" ? event.method.toUpperCase() : "GET";
    if (!path || !METHODS.has(method)) {
      return { statusCode: 400, body: { error: { code: "BAD_EVENT", message: "Event requires an /api/ path and a supported method" } } };
    }
    const headers = new Headers({ "content-type": "application/json" });
    if (event.headers && typeof event.headers === "object") {
      for (const [name, value] of Object.entries(event.headers as Record<string, unknown>)) {
        if (typeof value === "string") headers.set(name, value);
      }
    }
    const hasBody = method !== "GET" && event.body !== undefined;
    const request = new Request(`https://cloudfunction.invalid${path}`, {
      method,
      headers,
      body: hasBody ? JSON.stringify(event.body) : undefined,
    });
    const pending: Promise<unknown>[] = [];
    const ctx = { waitUntil: (promise: Promise<unknown>) => { pending.push(promise); }, passThroughOnException() {} } as ExecutionContext;
    const response = await handleApi({ request, env, store, ctx });
    // A cloud function instance may freeze after returning; finish deferred work first.
    await Promise.allSettled(pending);
    const text = await response.text();
    let body: unknown = null;
    try { body = text ? JSON.parse(text) : null; } catch { body = { error: { code: "NON_JSON_RESPONSE" } }; }
    return { statusCode: response.status, body };
  };
}

export const main = createCloudFunction({ env: typeof process !== "undefined" ? process.env : {} });
