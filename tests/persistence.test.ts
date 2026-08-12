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
  first.profiles.set("client_1", { target: "general_fitness", ageBand: "25_34", heightCm: 170, weightKg: 65, trainingExperience: "beginner", sessionsPerWeek: 3, minutesPerSession: 45, equipment: [], injuryFlags: [], allergyFlags: [], dietaryPreferences: [], riskFlags: [], timezone: "Asia/Shanghai" });
  await persistStore(first, db, "unit-test-encryption-key");
  const row = db.getRow();
  assert.ok(row?.ciphertext);
  assert.equal(row?.ciphertext.includes("小满"), false);
  const second = createMemoryStore();
  await hydrateStore(second, db, "unit-test-encryption-key");
  assert.equal(second.clients.get("client_1")?.displayName, "小满");
  assert.equal(second.profiles.get("client_1")?.weightKg, 65);
  await purgeClient(second, "client_1");
  assert.equal(second.clients.has("client_1"), false);
  assert.equal(second.profiles.has("client_1"), false);
});
