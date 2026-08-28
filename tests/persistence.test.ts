import assert from "node:assert/strict";
import test from "node:test";
import { hydrateStore, persistStore, purgeClient } from "../server/api/persistence";
import { createMemoryStore } from "../server/api/store";

function fakeDb() {
  let row: { ciphertext: string; key_version: string; revision: number } | null = null;
  return {
    prepare(query: string) {
      void query;
      let values: unknown[] = [];
      return {
        bind(...args: unknown[]) { values = args; return this; },
        async first() { return row; },
        async all() { return { results: [] }; },
        async run() { row = { ciphertext: String(values[1]), key_version: String(values[2]), revision: 1 }; return {}; },
      };
    },
    getRow: () => row,
  } as unknown as D1Database & { getRow: () => typeof row };
}

test("D1 adapter encrypts the single-coach snapshot and hydrates it", async () => {
  const db = fakeDb();
  const first = createMemoryStore();
  first.clients.set("client_1", { id: "client_1", displayName: "小满", status: "active", createdAt: new Date().toISOString() });
  first.sessions.set("session_1", { kind: "client", subjectId: "client_1", expiresAt: Date.now() + 60_000 });
  first.audit.push({ id: "audit-client", action: "profile.saved", clientId: "client_1" });
  first.deletionRequests.set("deletion_1", { id: "deletion_1", clientId: "client_1", requestedAt: new Date().toISOString(), purgeAt: new Date(Date.now() + 60_000).toISOString(), receiptHash: "hash", status: "requested" });
  first.profiles.set("client_1", { target: "general_fitness", ageBand: "25_34", heightCm: 170, weightKg: 65, trainingExperience: "beginner", sessionsPerWeek: 3, minutesPerSession: 45, equipment: [], injuryFlags: [], allergyFlags: [], dietaryPreferences: [], riskFlags: [], timezone: "Asia/Shanghai" });
  await persistStore(first, db, "unit-test-encryption-key");
  const row = db.getRow();
  assert.ok(row?.ciphertext);
  assert.equal(row?.ciphertext.includes("小满"), false);
  const second = createMemoryStore();
  await hydrateStore(second, db, "unit-test-encryption-key");
  assert.equal(second.clients.get("client_1")?.displayName, "小满");
  assert.equal(second.sessions.get("session_1")?.subjectId, "client_1");
  assert.equal(second.profiles.get("client_1")?.weightKg, 65);
  await purgeClient(second, "client_1");
  assert.equal(second.clients.has("client_1"), false);
  assert.equal(second.profiles.has("client_1"), false);
  assert.equal(second.sessions.has("session_1"), false);
  assert.equal(second.audit.some((event) => event.clientId === "client_1"), false);
  assert.equal(second.deletionRequests.get("deletion_1")?.clientId, null);
});
