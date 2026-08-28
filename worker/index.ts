/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import { handleApi, runGeneration } from "../server/api/handlers";
import { decryptSecret, hydrateStore, persistStore, purgeClient } from "../server/api/persistence";
import { createMemoryStore } from "../server/api/store";
import type { ApiEnv, DeliveryLogRecord } from "../server/api/types";

interface Env {
  ASSETS: Fetcher;
  DB?: D1Database;
  QUEUE?: Queue;
  DATA_ENCRYPTION_KEY?: string;
  WECHAT_TEMPLATE_ID?: string;
  COACH_TOKEN?: string;
  COACH_ACCESS_USER_ID?: string;
  WECHAT_APP_ID?: string;
  WECHAT_APP_SECRET?: string;
  WECHAT_ACCESS_TOKEN?: string;
  WECHAT_SEND_URL?: string;
  DEV_MODE?: string;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      try {
        const storageDb = env.DEV_MODE === "true" ? undefined : env.DB;
        const apiEnv = env.DEV_MODE === "true" ? { ...env, DB: undefined } : env;
        await hydrateStore(memoryStore, storageDb, env.DATA_ENCRYPTION_KEY);
        const response = await handleApi({ request, env: apiEnv as ApiEnv, store: memoryStore, ctx });
        await persistStore(memoryStore, storageDb, env.DATA_ENCRYPTION_KEY);
        return response;
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : "Storage unavailable";
        return new Response(JSON.stringify({ error: { code: "STORAGE_NOT_CONFIGURED", message: env.DEV_MODE === "true" ? message : "Storage is temporarily unavailable" } }), { status: 503, headers: { "content-type": "application/json; charset=utf-8" } });
      }
    }

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    return handler.fetch(request, env, ctx);
  },

  async queue(batch: MessageBatch<{ jobId: string; startDate: string }>, env: Env, ctx: ExecutionContext): Promise<void> {
    const storageDb = env.DEV_MODE === "true" ? undefined : env.DB;
    const apiEnv = env.DEV_MODE === "true" ? { ...env, DB: undefined } : env;
    await hydrateStore(memoryStore, storageDb, env.DATA_ENCRYPTION_KEY);
    for (const message of batch.messages) {
      const request = new Request("http://queue.internal/api/queue", { method: "POST" });
      await runGeneration({ request, env: apiEnv as ApiEnv, store: memoryStore, ctx }, message.body.jobId, message.body.startDate);
      message.ack();
    }
    await persistStore(memoryStore, storageDb, env.DATA_ENCRYPTION_KEY);
  },

  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    void ctx;
    const storageDb = env.DEV_MODE === "true" ? undefined : env.DB;
    await hydrateStore(memoryStore, storageDb, env.DATA_ENCRYPTION_KEY);
    const now = Date.now();
    for (const request of memoryStore.deletionRequests.values()) {
      if (request.status === "requested" && Date.parse(request.purgeAt) <= now) {
        if (request.clientId) await purgeClient(memoryStore, request.clientId);
        request.status = "purged";
        memoryStore.audit.push({ id: `audit_purge_${request.id}`, actor: "system", action: "deletion.executed", at: new Date().toISOString(), requestId: request.id });
      }
    }
    await sendReminders(memoryStore, env);
    await persistStore(memoryStore, storageDb, env.DATA_ENCRYPTION_KEY);
  },
};

async function sendReminders(store: ReturnType<typeof createMemoryStore>, env: Env): Promise<void> {
  const date = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
  for (const subscription of store.subscriptions.values()) {
    if (subscription.revokedAt) continue;
    const idempotencyKey = `${subscription.clientId}:${date}`;
    if ([...store.delivery.values()].some((item) => item.idempotencyKey === idempotencyKey)) continue;
    const log: DeliveryLogRecord = { id: `delivery_${idempotencyKey}`, clientId: subscription.clientId, localDate: date, idempotencyKey, providerCode: null, status: "skipped", sentAt: null };
    if (!env.WECHAT_ACCESS_TOKEN || !env.WECHAT_SEND_URL || !env.DATA_ENCRYPTION_KEY) {
      log.providerCode = "WECHAT_NOT_CONFIGURED";
      store.delivery.set(log.id, log);
      store.audit.push({ id: `audit_${log.id}`, actor: "system", action: "reminder.skipped", at: new Date().toISOString(), clientId: subscription.clientId, localDate: date, reason: log.providerCode });
      continue;
    }
    const ciphertext = store.authOpenIdCiphertext.get(subscription.clientId);
    if (!ciphertext) {
      log.providerCode = "OPENID_CIPHERTEXT_MISSING";
      store.delivery.set(log.id, log);
      continue;
    }
    try {
      const openid = await decryptSecret(ciphertext, env.DATA_ENCRYPTION_KEY);
      const response = await fetch(env.WECHAT_SEND_URL, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${env.WECHAT_ACCESS_TOKEN}` }, body: JSON.stringify({ touser: openid, template_id: subscription.templateId, data: { thing1: { value: "今天的轻练计划已准备好" }, time2: { value: `${date} 08:00` } } }) });
      const payload = await response.json().catch(() => ({})) as { errcode?: number };
      log.providerCode = String(payload.errcode ?? response.status);
      log.status = response.ok && (payload.errcode === undefined || payload.errcode === 0) ? "sent" : "failed";
      log.sentAt = log.status === "sent" ? new Date().toISOString() : null;
    } catch {
      log.providerCode = "WECHAT_NETWORK_ERROR";
      log.status = "failed";
    }
    store.delivery.set(log.id, log);
    store.audit.push({ id: `audit_${log.id}`, actor: "system", action: "reminder.sent", at: new Date().toISOString(), clientId: subscription.clientId, localDate: date, status: log.status, providerCode: log.providerCode });
  }
}

const memoryStore = createMemoryStore();

export default worker;
