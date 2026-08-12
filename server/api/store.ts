import { createHash, randomUUID } from "node:crypto";
import type { Store } from "./types";

export function createMemoryStore(): Store {
  return {
    clients: new Map(),
    invitations: new Map(),
    profiles: new Map(),
    consents: new Map(),
    sessions: new Map(),
    jobs: new Map(),
    drafts: new Map(),
    plans: new Map(),
    checkins: new Map(),
    feedback: new Map(),
    alerts: new Map(),
    authByOpenId: new Map(),
    authOpenIdCiphertext: new Map(),
    deletionRequests: new Map(),
    fallbackTokens: new Map(),
    subscriptions: new Map(),
    delivery: new Map(),
    audit: [],
  };
}

export function id(prefix: string): string {
  return `${prefix}_${randomUUID().replaceAll("-", "").slice(0, 20)}`;
}

export async function sha256(value: string): Promise<string> {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const bytes = new TextEncoder().encode(value);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  return createHash("sha256").update(value).digest("hex");
}

export function randomToken(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${crypto.randomUUID()}${crypto.randomUUID()}`.replaceAll("-", "");
  }
  return `${randomUUID()}${randomUUID()}`.replaceAll("-", "");
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function audit(store: Store, action: string, metadata: Record<string, unknown> = {}): void {
  store.audit.push({
    id: id("audit"),
    actor: metadata.actor ?? "system",
    action,
    at: nowIso(),
    requestId: metadata.requestId ?? null,
    ...metadata,
  });
}

export function planDayId(planId: string, localDate: string): string {
  return `${planId}:${localDate}`;
}

export function checkinKey(clientId: string, itemId: string, localDate: string): string {
  return `${clientId}:${localDate}:${itemId}`;
}
