import type { Store } from "./types";

export function createMemoryStore(): Store {
  return {
    clients: new Map(),
    invitations: new Map(),
    profiles: new Map(),
    consents: new Map(),
    consentRecords: new Map(),
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
    openedDays: new Map(),
    audit: [],
  };
}

export function id(prefix: string): string {
  return `${prefix}_${uuid().replaceAll("-", "").slice(0, 20)}`;
}

export async function sha256(value: string): Promise<string> {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const bytes = new TextEncoder().encode(value);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  throw new Error("Web Crypto SHA-256 is unavailable");
}

export function randomToken(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${crypto.randomUUID()}${crypto.randomUUID()}`.replaceAll("-", "");
  }
  return `${uuid()}${uuid()}`.replaceAll("-", "");
}

function uuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40; bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  throw new Error("Web Crypto random UUID is unavailable");
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

export function recordOpenedDay(store: Store, clientId: string, localDate: string): void {
  const key = `${clientId}:${localDate}`;
  if (!store.openedDays.has(key)) store.openedDays.set(key, { clientId, localDate, firstOpenedAt: nowIso() });
}
