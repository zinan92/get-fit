import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import { buildCloudFunction } from "../scripts/build-cloudfunction.mjs";

const require = createRequire(import.meta.url);
const bundlePath = await buildCloudFunction();
const bundle = require(bundlePath);

const COACH_OPENID = "openid-bundle-coach";
const KEY = "bundle-test-key";

function memoryBackend() {
  let record = null;
  return {
    async read() { return record; },
    async write(next, expected) { if ((record?.revision ?? 0) !== expected) return "conflict"; record = next; return "written"; },
  };
}

function bundled(extraEnv = {}) {
  const fn = bundle.createCloudFunction({
    env: { DATA_ENCRYPTION_KEY: KEY, COACH_OPENIDS: COACH_OPENID, ...extraEnv },
    backend: memoryBackend(),
    resolveOpenid: (context) => context?.openid ?? "",
  });
  return (openid, path, method = "GET", body, headers = {}) => fn({ path, method, body, headers }, { openid });
}

function plan(startDate) {
  const start = new Date(`${startDate}T00:00:00Z`);
  return {
    schemaVersion: "plan.v1",
    timezone: "Asia/Shanghai",
    startDate,
    days: Array.from({ length: 30 }, (_, index) => {
      const date = new Date(start);
      date.setUTCDate(date.getUTCDate() + index);
      return {
        dayIndex: index + 1,
        localDate: date.toISOString().slice(0, 10),
        title: "轻量训练日",
        exercises: [{ catalogId: "ex-walk", sets: 2, reps: 20, restSeconds: 30, cues: [] }],
        meals: [
          { mealType: "breakfast", foods: [{ foodCatalogId: "food-egg", grams: 100 }, { foodCatalogId: "food-toast", grams: 80 }] },
          { mealType: "lunch", foods: [{ foodCatalogId: "food-chicken", grams: 150 }, { foodCatalogId: "food-rice", grams: 200 }, { foodCatalogId: "food-broccoli", grams: 200 }] },
          { mealType: "dinner", foods: [{ foodCatalogId: "food-salmon", grams: 120 }, { foodCatalogId: "food-sweet-potato", grams: 200 }] },
        ],
        reminders: ["动作不适时停止并联系教练"],
      };
    }),
  };
}

test("target runtime provides every global the shared API code needs", () => {
  const major = Number(process.versions.node.split(".")[0]);
  assert.ok(major >= 20, `CloudBase target is Nodejs20.19; test runtime is ${process.versions.node}`);
  assert.deepEqual(bundle.runtimeCapabilities(), {
    cryptoSubtle: true, randomUUID: true, request: true, response: true, headers: true, textEncoder: true, fetch: true,
  });
});

test("bundle leaves only the CloudBase SDK to runtime require", async () => {
  const { readFile } = await import("node:fs/promises");
  const source = await readFile(bundlePath, "utf8");
  // Only the CloudBase SDK is left to the function's own node_modules.
  const requires = [...source.matchAll(/require\(["']([^"']+)["']\)/g)].map((match) => match[1]).filter((name) => !name.startsWith("node:"));
  assert.deepEqual([...new Set(requires)], ["@cloudbase/node-sdk"]);
  assert.equal(typeof bundle.main, "function");
  assert.equal(typeof bundle.createCloudFunction, "function");
});

test("bundled API runs invitation to check-in with platform identity", async () => {
  const call = bundled();
  const invitation = await call(COACH_OPENID, "/api/coach/invitations", "POST", { displayName: "小满" });
  assert.equal(invitation.statusCode, 201);
  const inviteToken = invitation.body.invitation.token;
  const accepted = await call("openid-client", "/api/invitations/accept", "POST", { token: inviteToken });
  assert.equal(accepted.statusCode, 200);
  const clientId = accepted.body.client.id;
  const login = await call("openid-client", "/api/wx/auth/login", "POST", { invitationToken: inviteToken });
  assert.equal(login.statusCode, 200);

  assert.equal((await call("openid-client", "/api/me/consents", "POST", { types: ["health_processing", "third_party_model"] })).statusCode < 300, true);
  const profile = await call("openid-client", "/api/me/profile", "PUT", { target: "general_fitness", ageBand: "25_34", heightCm: 170, weightKg: 65, trainingExperience: "beginner", sessionsPerWeek: 3, minutesPerSession: 45, equipment: ["dumbbell"], injuryFlags: [], allergyFlags: [], dietaryPreferences: [], riskFlags: [], timezone: "Asia/Shanghai" });
  assert.equal(profile.statusCode < 300, true);
  const confirmed = await call(COACH_OPENID, `/api/coach/clients/${clientId}/profile/confirm`, "POST");
  assert.equal(confirmed.body.safetyGate, "auto_allowed");

  const generation = await call(COACH_OPENID, `/api/coach/clients/${clientId}/plan-generations`, "POST", { startDate: "2026-09-15" }, { "idempotency-key": "spike-1" });
  assert.equal(generation.statusCode, 202);
  const importToken = await call(COACH_OPENID, `/api/coach/generation-jobs/${generation.body.job.id}/codex-fallback-token`, "POST");
  const imported = await call("", "/api/codex-fallback/import", "POST", { token: importToken.body.token, payload: plan("2026-09-15") });
  assert.equal(imported.statusCode, 201);
  const published = await call(COACH_OPENID, `/api/coach/plan-drafts/${imported.body.draft.id}/publish`, "POST", { changeReason: "spike" });
  assert.equal(published.statusCode, 201);

  const today = await call("openid-client", "/api/plan/today?date=2026-09-15");
  assert.equal(today.body.status, "ready");
  assert.equal(today.body.plan.day.meals[0].mealKcal, 341);
  const planDayId = `${published.body.plan.id}:2026-09-15`;
  const item = { localDate: "2026-09-15", planDayId, itemId: "ex-walk", itemType: "exercise", status: "completed" };
  assert.equal((await call("openid-client", "/api/checkins", "PUT", item)).statusCode, 200);
  assert.equal((await call("openid-client", "/api/checkins", "PUT", item)).statusCode, 200);
  const after = await call("openid-client", "/api/plan/today?date=2026-09-15");
  assert.deepEqual(after.body.checkins, [{ itemId: "ex-walk", itemType: "exercise", status: "completed" }]);
});

test("cloud function ignores DEV_MODE, coach tokens and Sites edge identity", async () => {
  const call = bundled({ DEV_MODE: "true", COACH_TOKEN: "shared-token", COACH_ACCESS_USER_ID: "owner-1" });
  for (const headers of [{ "x-coach-token": "dev-coach" }, { "x-coach-token": "shared-token" }, { "oai-authenticated-user-id": "owner-1" }]) {
    const denied = await call("openid-stranger", "/api/coach/invitations", "POST", { displayName: "x" }, headers);
    assert.equal(denied.statusCode, 401, JSON.stringify(headers));
  }
  const devLogin = await call("openid-stranger", "/api/wx/auth/login", "POST", { devOpenid: "openid-local-sandbox:any", devClientId: "any" });
  assert.notEqual(devLogin.statusCode, 200);
});

test("malformed events fail closed with a stable error", async () => {
  const call = bundled();
  assert.equal((await call("", "/not-api")).body.error.code, "BAD_EVENT");
  assert.equal((await call("", "/api/health", "TRACE")).body.error.code, "BAD_EVENT");
});
