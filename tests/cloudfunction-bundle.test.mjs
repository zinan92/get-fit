import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import { buildCloudFunction } from "../scripts/build-cloudfunction.mjs";

const require = createRequire(import.meta.url);
const bundlePath = await buildCloudFunction();
const bundle = require(bundlePath);

const COACH = "spike-coach-token";
const env = { COACH_TOKEN: COACH, WECHAT_APP_ID: "wx-spike", WECHAT_APP_SECRET: "spike-secret" };
const coachHeaders = { "x-coach-token": COACH };

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

async function withWeChatStub(openid, run) {
  const original = globalThis.fetch;
  globalThis.fetch = async (url) => {
    assert.match(String(url), /^https:\/\/api\.weixin\.qq\.com\/sns\/jscode2session/);
    return new Response(JSON.stringify({ openid }), { status: 200 });
  };
  try { return await run(); } finally { globalThis.fetch = original; }
}

test("target runtime provides every global the shared API code needs", () => {
  const major = Number(process.versions.node.split(".")[0]);
  assert.ok(major >= 20, `CloudBase target is Nodejs20.19; test runtime is ${process.versions.node}`);
  assert.deepEqual(bundle.runtimeCapabilities(), {
    cryptoSubtle: true, randomUUID: true, request: true, response: true, headers: true, textEncoder: true, fetch: true,
  });
});

test("bundle is self-contained CommonJS with no runtime imports", async () => {
  const { readFile } = await import("node:fs/promises");
  const source = await readFile(bundlePath, "utf8");
  assert.doesNotMatch(source, /require\((?!["']node:)/);
  assert.equal(typeof bundle.main, "function");
  assert.equal(typeof bundle.createCloudFunction, "function");
});

test("bundled API runs invitation to check-in through the production code path", async () => {
  const main = bundle.createCloudFunction({ env });
  const call = async (path, method = "GET", body, headers = {}) => main({ path, method, body, headers });

  const invitation = await call("/api/coach/invitations", "POST", { displayName: "小满" }, coachHeaders);
  assert.equal(invitation.statusCode, 201);
  const inviteToken = invitation.body.invitation.token;
  const accepted = await call("/api/invitations/accept", "POST", { token: inviteToken });
  assert.equal(accepted.statusCode, 200);
  const clientId = accepted.body.client.id;

  const login = await withWeChatStub("openid-spike-client", () => call("/api/wx/auth/login", "POST", { code: "wx-code", invitationToken: inviteToken }));
  assert.equal(login.statusCode, 200);
  const auth = { authorization: `Bearer ${login.body.sessionToken}` };

  assert.equal((await call("/api/me/consents", "POST", { types: ["health_processing", "third_party_model"] }, auth)).statusCode < 300, true);
  const profile = await call("/api/me/profile", "PUT", { target: "general_fitness", ageBand: "25_34", heightCm: 170, weightKg: 65, trainingExperience: "beginner", sessionsPerWeek: 3, minutesPerSession: 45, equipment: ["dumbbell"], injuryFlags: [], allergyFlags: [], dietaryPreferences: [], riskFlags: [], timezone: "Asia/Shanghai" }, auth);
  assert.equal(profile.statusCode < 300, true);
  const confirmed = await call(`/api/coach/clients/${clientId}/profile/confirm`, "POST", undefined, coachHeaders);
  assert.equal(confirmed.body.safetyGate, "auto_allowed");

  const generation = await call(`/api/coach/clients/${clientId}/plan-generations`, "POST", { startDate: "2026-09-15" }, { ...coachHeaders, "idempotency-key": "spike-1" });
  assert.equal(generation.statusCode, 202);
  const jobId = generation.body.job.id;
  const importToken = await call(`/api/coach/generation-jobs/${jobId}/codex-fallback-token`, "POST", undefined, coachHeaders);
  const imported = await call("/api/codex-fallback/import", "POST", { token: importToken.body.token, payload: plan("2026-09-15") });
  assert.equal(imported.statusCode, 201);
  const published = await call(`/api/coach/plan-drafts/${imported.body.draft.id}/publish`, "POST", { changeReason: "spike" }, coachHeaders);
  assert.equal(published.statusCode, 201);

  const today = await call("/api/plan/today?date=2026-09-15", "GET", undefined, auth);
  assert.equal(today.body.status, "ready");
  assert.equal(today.body.plan.day.meals[0].mealKcal, 341);
  const planDayId = `${published.body.plan.id}:2026-09-15`;
  const checkin = await call("/api/checkins", "PUT", { localDate: "2026-09-15", planDayId, itemId: "ex-walk", itemType: "exercise", status: "completed" }, auth);
  assert.equal(checkin.statusCode, 200);
  const again = await call("/api/checkins", "PUT", { localDate: "2026-09-15", planDayId, itemId: "ex-walk", itemType: "exercise", status: "completed" }, auth);
  assert.equal(again.statusCode, 200);
  const after = await call("/api/plan/today?date=2026-09-15", "GET", undefined, auth);
  assert.deepEqual(after.body.checkins, [{ itemId: "ex-walk", itemType: "exercise", status: "completed" }]);
});

test("cloud function ignores DEV_MODE even when the environment sets it", async () => {
  const main = bundle.createCloudFunction({ env: { ...env, DEV_MODE: "true" } });
  const devCoach = await main({ path: "/api/coach/invitations", method: "POST", body: { displayName: "x" }, headers: { "x-coach-token": "dev-coach" } });
  assert.equal(devCoach.statusCode, 401);
  const devLogin = await main({ path: "/api/wx/auth/login", method: "POST", body: { devOpenid: "openid-local-sandbox:any", devClientId: "any" } });
  assert.notEqual(devLogin.statusCode, 200);
});

test("cloud function does not trust the Sites edge identity header", async () => {
  const main = bundle.createCloudFunction({ env: { ...env, COACH_ACCESS_USER_ID: "owner-1" } });
  const forged = await main({ path: "/api/coach/invitations", method: "POST", body: { displayName: "x" }, headers: { "oai-authenticated-user-id": "owner-1" } });
  assert.equal(forged.statusCode, 401);
});

test("malformed events fail closed with a stable error", async () => {
  const main = bundle.createCloudFunction({ env });
  assert.equal((await main({ path: "/not-api", method: "GET" })).body.error.code, "BAD_EVENT");
  assert.equal((await main({ path: "/api/health", method: "TRACE" })).body.error.code, "BAD_EVENT");
  assert.equal((await main({})).statusCode, 400);
});
