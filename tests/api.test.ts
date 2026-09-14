import assert from "node:assert/strict";
import test from "node:test";
import { handleApi } from "../server/api/handlers";
import { createMemoryStore, recordOpenedDay } from "../server/api/store";
import { PLAN_SCHEMA_VERSION, PLAN_TIMEZONE, type PlanPayload } from "../packages/plan-schema/src/index";

const env = { DEV_MODE: "true" };
const store = createMemoryStore();
const pending: Promise<unknown>[] = [];
const ctx = { waitUntil: (promise: Promise<unknown>) => pending.push(promise), passThroughOnException() {} } as ExecutionContext;

async function call(path: string, init: RequestInit = {}, token?: string) {
  const headers = new Headers(init.headers);
  if (token) headers.set("authorization", `Bearer ${token}`);
  const response = await handleApi({ request: new Request(`http://localhost${path}`, { ...init, headers }), env, store, ctx });
  const payload = await response.json() as Record<string, unknown>;
  return { response, payload };
}

function plan(startDate: string): PlanPayload {
  const start = new Date(`${startDate}T00:00:00Z`);
  return {
    schemaVersion: PLAN_SCHEMA_VERSION,
    timezone: PLAN_TIMEZONE,
    startDate,
    days: Array.from({ length: 30 }, (_, index) => {
      const date = new Date(start); date.setUTCDate(date.getUTCDate() + index);
      return {
        dayIndex: index + 1, localDate: date.toISOString().slice(0, 10), title: "轻量训练日",
        exercises: [{ catalogId: "ex-walk", sets: 2, reps: 20, restSeconds: 30, cues: [] }],
        meals: [
          { mealType: "breakfast" as const, foods: [{ foodCatalogId: "food-egg", grams: 100 }, { foodCatalogId: "food-toast", grams: 80 }] },
          { mealType: "lunch" as const, foods: [{ foodCatalogId: "food-chicken", grams: 150 }, { foodCatalogId: "food-rice", grams: 200 }, { foodCatalogId: "food-broccoli", grams: 200 }] },
          { mealType: "dinner" as const, foods: [{ foodCatalogId: "food-salmon", grams: 120 }, { foodCatalogId: "food-sweet-potato", grams: 200 }] },
        ],
        reminders: ["动作不适时停止并联系教练"],
      };
    }),
  };
}

test("single-coach onboarding, Codex CLI handoff, validated import, publish and client read path", async () => {
  const coach = await call("/api/coach/session", { method: "POST", headers: { "x-coach-token": "dev-coach" } });
  assert.equal(coach.response.status, 200);
  const coachToken = String(coach.payload.sessionToken);
  const invitation = await call("/api/coach/invitations", { method: "POST", headers: { "x-coach-token": "dev-coach" }, body: JSON.stringify({ displayName: "小满" }) });
  assert.equal(invitation.response.status, 201);
  const inviteValue = (invitation.payload.invitation as Record<string, unknown>).token;
  const accepted = await call("/api/invitations/accept", { method: "POST", body: JSON.stringify({ token: inviteValue }) });
  const clientId = String((accepted.payload.client as Record<string, unknown>).id);
  const login = await call("/api/wx/auth/login", { method: "POST", body: JSON.stringify({ devOpenid: `openid-local-sandbox:${clientId}`, devClientId: clientId, invitationToken: inviteValue }) });
  const clientToken = String(login.payload.sessionToken);
  await call("/api/me/consents", { method: "POST", body: JSON.stringify({ types: ["health_processing", "third_party_model", "subscription_message"] }) }, clientToken);
  const subscription = await call("/api/reminders/subscribe", { method: "POST", body: JSON.stringify({ templateId: "template-demo" }) }, clientToken);
  assert.equal(subscription.response.status, 201);
  const revoked = await call("/api/me/consents/subscription_message", { method: "DELETE" }, clientToken);
  assert.equal(revoked.response.status, 200);
  await call("/api/me/profile", { method: "PUT", body: JSON.stringify({ target: "general_fitness", ageBand: "25_34", heightCm: 170, weightKg: 65, trainingExperience: "beginner", sessionsPerWeek: 3, minutesPerSession: 45, equipment: ["dumbbell"], injuryFlags: [], allergyFlags: [], dietaryPreferences: [], riskFlags: [], timezone: "Asia/Shanghai" }) }, clientToken);
  const confirmed = await call(`/api/coach/clients/${clientId}/profile/confirm`, { method: "POST", headers: { "x-coach-token": "dev-coach" } });
  assert.equal((confirmed.payload.safetyGate as string), "auto_allowed");
  const generation = await call(`/api/coach/clients/${clientId}/plan-generations`, { method: "POST", headers: { "x-coach-token": "dev-coach", "idempotency-key": "api-test-1" }, body: JSON.stringify({ startDate: "2026-08-12" }) });
  assert.equal(generation.response.status, 202);
  await Promise.all(pending.splice(0));
  const jobId = String((generation.payload.job as Record<string, unknown>).id);
  const localJob = generation.payload.job as Record<string, unknown>;
  assert.equal(localJob.provider, "codex_cli");
  assert.equal(localJob.status, "awaiting_local");
  const handoff = await call(`/api/coach/generation-jobs/${jobId}`, { headers: { "x-coach-token": "dev-coach" } });
  assert.equal((handoff.payload.job as Record<string, unknown>).status, "awaiting_local");
  const codexInput = await call(`/api/coach/generation-jobs/${jobId}/codex-input`, { headers: { "x-coach-token": "dev-coach" } });
  assert.equal(codexInput.response.status, 200);
  assert.equal((codexInput.payload.profile as Record<string, unknown>).displayName, undefined);
  const fallbackToken = await call(`/api/coach/generation-jobs/${jobId}/codex-fallback-token`, { method: "POST", headers: { "x-coach-token": "dev-coach" } });
  const imported = await call("/api/codex-fallback/import", { method: "POST", body: JSON.stringify({ token: fallbackToken.payload.token, payload: plan("2026-08-12") }) });
  assert.equal(imported.response.status, 201);
  const draftId = String((imported.payload.draft as Record<string, unknown>).id);
  const editedPlan = plan("2026-08-12");
  editedPlan.days[0].title = "教练调整后的训练日";
  editedPlan.days[0].exercises[0].reps = 10;
  editedPlan.days[0].exercises[0].cues = ["教练自定义：动作放慢"];
  const editedDraft = await call(`/api/coach/plan-drafts/${draftId}`, { method: "PATCH", headers: { "x-coach-token": "dev-coach" }, body: JSON.stringify({ payload: editedPlan }) });
  assert.equal(editedDraft.response.status, 200);
  assert.equal((editedDraft.payload.draft as Record<string, unknown>).status, "pending_review");
  assert.equal(((editedDraft.payload.draft as Record<string, unknown>).payload as Record<string, unknown>).days instanceof Array, true);
  const published = await call(`/api/coach/plan-drafts/${draftId}/publish`, { method: "POST", headers: { "x-coach-token": "dev-coach" }, body: JSON.stringify({ changeReason: "API test" }) });
  assert.equal(published.response.status, 201);
  const today = await call("/api/plan/today?date=2026-08-12", {}, clientToken);
  assert.equal(today.payload.status, "ready");
  const day = (today.payload.plan as Record<string, unknown>).day as Record<string, unknown>;
  const exercise = (day.exercises as Array<Record<string, unknown>>)[0];
  assert.equal(exercise.target, "全身");
  assert.equal(exercise.equipment, "无需器械");
  assert.ok(Array.isArray(exercise.steps) && exercise.steps.length > 0);
  assert.equal(exercise.mediaPath, null);
  assert.deepEqual(exercise.cues, ["教练自定义：动作放慢"]);
  assert.equal(typeof day.dailyKcal, "number");
  assert.equal((day.meals as Array<Record<string, unknown>>)[0].mealKcal, 357);
  const food = ((day.meals as Array<Record<string, unknown>>)[0].foods as Array<Record<string, unknown>>)[0];
  assert.equal(food.kcal, 155);
  const publishedPlanId = String((published.payload.plan as Record<string, unknown>).id);
  const checkin = await call("/api/checkins", { method: "PUT", body: JSON.stringify({ localDate: "2026-08-12", planDayId: `${publishedPlanId}:2026-08-12`, itemId: "ex-walk", itemType: "exercise", status: "completed" }) }, clientToken);
  assert.equal(checkin.response.status, 200);
  const todayWithCheckin = await call("/api/plan/today?date=2026-08-12", {}, clientToken);
  assert.deepEqual(todayWithCheckin.payload.checkins, [{ itemId: "ex-walk", itemType: "exercise", status: "completed" }]);
  const badCheckin = await call("/api/checkins", { method: "PUT", body: JSON.stringify({ localDate: "2026-08-12", planDayId: `${publishedPlanId}:2026-08-12`, itemId: "not-in-plan", itemType: "exercise", status: "completed" }) }, clientToken);
  assert.equal(badCheckin.response.status, 400);
  const feedback = await call("/api/wellness-feedback", { method: "PUT", body: JSON.stringify({ localDate: "2026-08-12", pain: "present", energy: "normal", hunger: "normal" }) }, clientToken);
  assert.equal(feedback.response.status, 200);
  const alerts = await call("/api/coach/alerts", { headers: { "x-coach-token": "dev-coach" } });
  assert.equal((alerts.payload.alerts as unknown[]).length, 1);
  const deletion = await call("/api/me", { method: "DELETE" }, clientToken);
  assert.equal(deletion.response.status, 202);
  assert.equal(store.clients.get(clientId)?.status, "deletion_pending");
  const deletionAgain = await call("/api/me", { method: "DELETE" }, clientToken);
  assert.equal(deletionAgain.response.status, 202);
  assert.equal((deletionAgain.payload as Record<string, unknown>).receipt, (deletion.payload as Record<string, unknown>).receipt);
  void coachToken;
});

test("onboarding can resume after a consumed invitation and keeps risky profiles out of generation", async () => {
  const onboardingStore = createMemoryStore();
  const onboardingCtx = { waitUntil() {}, passThroughOnException() {} } as ExecutionContext;
  async function onboardingCall(path: string, init: RequestInit = {}, token?: string) {
    const headers = new Headers(init.headers);
    if (token) headers.set("authorization", `Bearer ${token}`);
    const response = await handleApi({ request: new Request(`http://localhost${path}`, { ...init, headers }), env, store: onboardingStore, ctx: onboardingCtx });
    return { response, payload: await response.json() as Record<string, unknown> };
  }

  const invite = await onboardingCall("/api/coach/invitations", { method: "POST", headers: { "x-coach-token": "dev-coach" }, body: JSON.stringify({ displayName: "可恢复客户" }) });
  const invitation = invite.payload.invitation as Record<string, unknown>;
  const accepted = await onboardingCall("/api/invitations/accept", { method: "POST", body: JSON.stringify({ token: invitation.token }) });
  assert.equal(accepted.response.status, 200);
  const resumed = await onboardingCall("/api/invitations/accept", { method: "POST", body: JSON.stringify({ token: invitation.token }) });
  assert.equal(resumed.response.status, 200);
  const clientId = String((resumed.payload.client as Record<string, unknown>).id);
  const login = await onboardingCall("/api/wx/auth/login", { method: "POST", body: JSON.stringify({ devOpenid: `openid-local-sandbox:${clientId}`, devClientId: clientId, invitationToken: invitation.token }) });
  const clientToken = String(login.payload.sessionToken);

  const riskyProfile = JSON.stringify({ target: "general_fitness", ageBand: "25_34", heightCm: 170, weightKg: 65, trainingExperience: "beginner", sessionsPerWeek: 3, minutesPerSession: 45, equipment: ["dumbbell"], injuryFlags: [], allergyFlags: [], dietaryPreferences: [], riskFlags: ["acute_pain"], timezone: "Asia/Shanghai" });
  const profileBeforeConsent = await onboardingCall("/api/me/profile", { method: "PUT", body: riskyProfile }, clientToken);
  assert.equal(profileBeforeConsent.response.status, 403);
  assert.equal((profileBeforeConsent.payload.error as Record<string, unknown>).code, "CONSENT_REQUIRED");
  const missingConsent = await onboardingCall(`/api/coach/clients/${clientId}/profile/confirm`, { method: "POST", headers: { "x-coach-token": "dev-coach" } });
  assert.equal(missingConsent.response.status, 400);
  await onboardingCall("/api/me/consents", { method: "POST", body: JSON.stringify({ types: ["health_processing", "third_party_model"] }) }, clientToken);
  assert.equal((await onboardingCall("/api/me/profile", { method: "PUT", body: riskyProfile }, clientToken)).response.status, 200);
  const confirmed = await onboardingCall(`/api/coach/clients/${clientId}/profile/confirm`, { method: "POST", headers: { "x-coach-token": "dev-coach" } });
  assert.equal(confirmed.response.status, 200);
  assert.equal(confirmed.payload.safetyGate, "manual");
  const blockedGeneration = await onboardingCall(`/api/coach/clients/${clientId}/plan-generations`, { method: "POST", headers: { "x-coach-token": "dev-coach" }, body: JSON.stringify({ startDate: "2026-08-12" }) });
  assert.equal(blockedGeneration.response.status, 409);
  assert.equal((blockedGeneration.payload.error as Record<string, unknown>).code, "RISK_MANUAL_REVIEW");
});

test("production first login cannot select an arbitrary pending client", async () => {
  const productionStore = createMemoryStore();
  const productionEnv = { COACH_TOKEN: "coach-secret", WECHAT_APP_ID: "app-id", WECHAT_APP_SECRET: "app-secret" };
  const productionCtx = { waitUntil() {}, passThroughOnException() {} } as ExecutionContext;
  async function productionCall(path: string, init: RequestInit = {}) {
    const response = await handleApi({ request: new Request(`https://example.test${path}`, init), env: productionEnv, store: productionStore, ctx: productionCtx });
    return { response, payload: await response.json() as Record<string, unknown> };
  }
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ openid: "synthetic-openid" }), { status: 200 });
  try {
    const invite = await productionCall("/api/coach/invitations", { method: "POST", headers: { "x-coach-token": "coach-secret", "content-type": "application/json" }, body: JSON.stringify({ displayName: "Production client" }) });
    const inviteData = invite.payload.invitation as Record<string, unknown>;
    const rawToken = String(inviteData.token);
    await productionCall("/api/invitations/accept", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token: rawToken }) });
    const missingTicket = await productionCall("/api/wx/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code: "wechat-code" }) });
    assert.equal(missingTicket.response.status, 403);
    const validTicket = await productionCall("/api/wx/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code: "wechat-code", invitationToken: rawToken }) });
    assert.equal(validTicket.response.status, 200);
  } finally { globalThis.fetch = originalFetch; }
});

test("localhost host header cannot unlock dev auth in production env", async () => {
  const productionEnv = { COACH_TOKEN: "coach-secret" };
  const productionStore = createMemoryStore();
  const productionCtx = { waitUntil() {}, passThroughOnException() {} } as ExecutionContext;
  const devCoachResponse = await handleApi({
    request: new Request("http://localhost/api/coach/session", { method: "POST", headers: { "x-coach-token": "dev-coach" } }),
    env: productionEnv,
    store: productionStore,
    ctx: productionCtx,
  });
  assert.equal(devCoachResponse.status, 401);

  const configuredCoachResponse = await handleApi({
    request: new Request("http://localhost/api/coach/session", { method: "POST", headers: { "x-coach-token": "coach-secret" } }),
    env: productionEnv,
    store: productionStore,
    ctx: productionCtx,
  });
  assert.equal(configuredCoachResponse.status, 200);
  const configuredCoachPayload = await configuredCoachResponse.json() as Record<string, unknown>;
  assert.equal(typeof configuredCoachPayload.sessionToken, "string");

  const loginResponse = await handleApi({
    request: new Request("http://localhost/api/wx/auth/login", { method: "POST", body: JSON.stringify({ devOpenid: "openid-test", devClientId: "client-test" }) }),
    env: productionEnv,
    store: productionStore,
    ctx: productionCtx,
  });
  assert.equal(loginResponse.status, 400);
  const loginPayload = await loginResponse.json() as Record<string, unknown>;
  assert.equal((loginPayload.error as Record<string, unknown>).code, "WECHAT_LOGIN_REQUIRED");
  assert.equal(loginPayload.sessionToken, undefined);
});

test("devOpenid is ignored in production even with a valid invitation", async () => {
  const productionStore = createMemoryStore();
  const productionEnv = { COACH_TOKEN: "coach-secret" };
  const productionCtx = { waitUntil() {}, passThroughOnException() {} } as ExecutionContext;
  async function productionCall(path: string, init: RequestInit = {}) {
    const response = await handleApi({ request: new Request(`https://example.test${path}`, init), env: productionEnv, store: productionStore, ctx: productionCtx });
    return { response, payload: await response.json() as Record<string, unknown> };
  }

  const invite = await productionCall("/api/coach/invitations", {
    method: "POST",
    headers: { "x-coach-token": "coach-secret", "content-type": "application/json" },
    body: JSON.stringify({ displayName: "Production client" }),
  });
  assert.equal(invite.response.status, 201);
  const rawToken = String((invite.payload.invitation as Record<string, unknown>).token);

  const accepted = await productionCall("/api/invitations/accept", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token: rawToken }),
  });
  assert.equal(accepted.response.status, 200);

  const login = await productionCall("/api/wx/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code: "anything", devOpenid: "attacker-chosen", invitationToken: rawToken }),
  });
  assert.equal(login.response.status, 400);
  assert.equal((login.payload.error as Record<string, unknown>).code, "WECHAT_LOGIN_REQUIRED");
  assert.equal(login.payload.sessionToken, undefined);
});

test("private Sites owner identity can establish the single coach session", async () => {
  const siteStore = createMemoryStore();
  const siteEnv = { COACH_ACCESS_USER_ID: "owner-account-id" };
  const siteCtx = { waitUntil() {}, passThroughOnException() {} } as ExecutionContext;
  const response = await handleApi({
    request: new Request("https://private-site.test/api/coach/session", { method: "POST", headers: { "oai-authenticated-user-id": "owner-account-id" } }),
    env: siteEnv,
    store: siteStore,
    ctx: siteCtx,
  });
  assert.equal(response.status, 200);
  const payload = await response.json() as Record<string, unknown>;
  assert.equal(typeof payload.sessionToken, "string");

  const forged = await handleApi({
    request: new Request("https://private-site.test/api/coach/session", { method: "POST", headers: { "oai-authenticated-user-id": "different-account-id" } }),
    env: siteEnv,
    store: siteStore,
    ctx: siteCtx,
  });
  assert.equal(forged.status, 401);
});

test("client sessions fail closed when their client record no longer exists", async () => {
  const staleStore = createMemoryStore();
  const staleCtx = { waitUntil() {}, passThroughOnException() {} } as ExecutionContext;
  staleStore.sessions.set("stale-client-session", { kind: "client", subjectId: "purged-client", expiresAt: Date.now() + 60_000 });
  const response = await handleApi({
    request: new Request("http://localhost/api/me", { headers: { authorization: "Bearer stale-client-session" } }),
    env,
    store: staleStore,
    ctx: staleCtx,
  });
  assert.equal(response.status, 401);
  const payload = await response.json() as Record<string, unknown>;
  assert.equal((payload.error as Record<string, unknown>).code, "AUTH_INVALID");
});

test("coach session token authorizes subsequent coach operations", async () => {
  const coachStore = createMemoryStore();
  const coachCtx = { waitUntil() {}, passThroughOnException() {} } as ExecutionContext;
  const loginResponse = await handleApi({ request: new Request("http://localhost/api/coach/session", { method: "POST", headers: { "x-coach-token": "dev-coach" } }), env, store: coachStore, ctx: coachCtx });
  assert.equal(loginResponse.status, 200);
  const loginPayload = await loginResponse.json() as Record<string, unknown>;
  const sessionToken = String(loginPayload.sessionToken);
  const inviteResponse = await handleApi({ request: new Request("http://localhost/api/coach/invitations", { method: "POST", headers: { authorization: `Bearer ${sessionToken}`, "content-type": "application/json" }, body: JSON.stringify({ displayName: "会话客户" }) }), env, store: coachStore, ctx: coachCtx });
  assert.equal(inviteResponse.status, 201);
});

test("coach summary reports unique opened days, check-ins and pain alerts", async () => {
  const summaryStore = createMemoryStore();
  const summaryCtx = { waitUntil() {}, passThroughOnException() {} } as ExecutionContext;
  const clientId = "summary-client";
  summaryStore.clients.set(clientId, { id: clientId, displayName: "摘要客户", status: "active", createdAt: new Date().toISOString() });
  const publishedAt = new Date().toISOString();
  summaryStore.plans.set("summary-plan", { id: "summary-plan", clientId, versionNo: 1, effectiveFrom: "2026-08-12", effectiveTo: null, payload: plan("2026-08-12"), status: "published", approvedAt: publishedAt, changeReason: null });
  recordOpenedDay(summaryStore, clientId, "2026-08-12");
  recordOpenedDay(summaryStore, clientId, "2026-08-12");
  recordOpenedDay(summaryStore, clientId, "2026-08-13");
  summaryStore.checkins.set("checkin-1", { clientId, planDayId: "summary-plan:2026-08-12", localDate: "2026-08-12", itemId: "ex-walk", itemType: "exercise", status: "completed", completedAt: publishedAt });
  summaryStore.checkins.set("checkin-2", { clientId, planDayId: "summary-plan:2026-08-12", localDate: "2026-08-12", itemId: "breakfast", itemType: "meal", status: "completed", completedAt: publishedAt });
  summaryStore.alerts.set("alert-1", { id: "alert-1", clientId, localDate: "2026-08-13", type: "pain", status: "open", createdAt: publishedAt, acknowledgedAt: null });
  summaryStore.sessions.set("coach-summary-session", { kind: "coach", subjectId: "coach_single", expiresAt: Date.now() + 60_000 });
  const response = await handleApi({ request: new Request("http://localhost/api/coach/clients/summary-client/summary?days=7", { headers: { authorization: "Bearer coach-summary-session" } }), env, store: summaryStore, ctx: summaryCtx });
  assert.equal(response.status, 200);
  const payload = await response.json() as Record<string, unknown>;
  assert.deepEqual(payload.summary, { openedDays: 2, trainingCheckins: 1, mealCheckins: 1, waterCheckins: 0, painAlerts: 1, feedbackDays: 0 });
});

test("future plan versions switch on their effective date without rewriting history", async () => {
  const versionStore = createMemoryStore();
  const versionCtx = { waitUntil() {}, passThroughOnException() {} } as ExecutionContext;
  const clientId = "version-client";
  versionStore.clients.set(clientId, { id: clientId, displayName: "版本客户", status: "active", createdAt: new Date().toISOString() });
  const firstPayload = plan("2026-08-12");
  firstPayload.days[2].title = "第一版训练日";
  const secondPayload = plan("2026-08-15");
  secondPayload.days[0].title = "未来调整日";
  versionStore.plans.set("plan-v1", { id: "plan-v1", clientId, versionNo: 1, effectiveFrom: "2026-08-12", effectiveTo: "2026-08-15", payload: firstPayload, status: "superseded", approvedAt: new Date().toISOString(), changeReason: null });
  versionStore.plans.set("plan-v2", { id: "plan-v2", clientId, versionNo: 2, effectiveFrom: "2026-08-15", effectiveTo: null, payload: secondPayload, status: "published", approvedAt: new Date().toISOString(), changeReason: "未来调整" });
  versionStore.sessions.set("version-client-session", { kind: "client", subjectId: clientId, expiresAt: Date.now() + 60_000 });
  versionStore.sessions.set("version-coach-session", { kind: "coach", subjectId: "coach_single", expiresAt: Date.now() + 60_000 });
  const before = await handleApi({ request: new Request("http://localhost/api/plan/today?date=2026-08-14", { headers: { authorization: "Bearer version-client-session" } }), env, store: versionStore, ctx: versionCtx });
  const beforePayload = await before.json() as Record<string, unknown>;
  assert.equal(((beforePayload.plan as Record<string, unknown>).day as Record<string, unknown>).title, "第一版训练日");
  assert.equal((beforePayload.plan as Record<string, unknown>).versionNo, 1);
  const after = await handleApi({ request: new Request("http://localhost/api/plan/today?date=2026-08-15", { headers: { authorization: "Bearer version-client-session" } }), env, store: versionStore, ctx: versionCtx });
  const afterPayload = await after.json() as Record<string, unknown>;
  assert.equal(((afterPayload.plan as Record<string, unknown>).day as Record<string, unknown>).title, "未来调整日");
  assert.equal((afterPayload.plan as Record<string, unknown>).versionNo, 2);
  versionStore.checkins.set("old-plan-checkin", { clientId, planDayId: "plan-v1:2026-08-15", localDate: "2026-08-15", itemId: "ex-walk", itemType: "exercise", status: "completed", completedAt: new Date().toISOString() });
  const afterWithOldCheckin = await handleApi({ request: new Request("http://localhost/api/plan/today?date=2026-08-15", { headers: { authorization: "Bearer version-client-session" } }), env, store: versionStore, ctx: versionCtx });
  const afterWithOldCheckinPayload = await afterWithOldCheckin.json() as Record<string, unknown>;
  assert.deepEqual(afterWithOldCheckinPayload.checkins, []);
  const list = await handleApi({ request: new Request(`http://localhost/api/coach/clients/${clientId}/plan-versions`, { headers: { authorization: "Bearer version-coach-session" } }), env, store: versionStore, ctx: versionCtx });
  assert.equal(list.status, 200);
  const listPayload = await list.json() as Record<string, unknown>;
  assert.deepEqual((listPayload.versions as Array<Record<string, unknown>>).map((item) => [item.versionNo, item.effectiveFrom, item.effectiveTo, item.changeReason]), [[1, "2026-08-12", "2026-08-15", null], [2, "2026-08-15", null, "未来调整"]]);
});

test("invitation binding rejects a second OpenID and blocks replayed acceptance", async () => {
  const replayStore = createMemoryStore();
  const replayCtx = { waitUntil() {}, passThroughOnException() {} } as ExecutionContext;
  async function replayCall(path: string, init: RequestInit = {}) {
    const response = await handleApi({ request: new Request(`http://localhost${path}`, init), env, store: replayStore, ctx: replayCtx });
    return { response, payload: await response.json() as Record<string, unknown> };
  }
  const invite = await replayCall("/api/coach/invitations", { method: "POST", headers: { "x-coach-token": "dev-coach", "content-type": "application/json" }, body: JSON.stringify({ displayName: "绑定客户" }) });
  const rawToken = String((invite.payload.invitation as Record<string, unknown>).token);
  const accepted = await replayCall("/api/invitations/accept", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token: rawToken }) });
  const clientId = String((accepted.payload.client as Record<string, unknown>).id);
  const firstLogin = await replayCall("/api/wx/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ devOpenid: `openid-local-sandbox:${clientId}`, devClientId: clientId, invitationToken: rawToken }) });
  assert.equal(firstLogin.response.status, 200);
  const secondLogin = await replayCall("/api/wx/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ devOpenid: `openid-local-sandbox:second-${clientId}`, devClientId: clientId, invitationToken: rawToken }) });
  assert.equal(secondLogin.response.status, 403);
  const replayAccept = await replayCall("/api/invitations/accept", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token: rawToken }) });
  assert.equal(replayAccept.response.status, 400);
});

test("local development login binds the identity to the invited client", async () => {
  const bindingStore = createMemoryStore();
  const bindingCtx = { waitUntil() {}, passThroughOnException() {} } as ExecutionContext;
  async function bindingCall(path: string, init: RequestInit = {}) {
    const response = await handleApi({ request: new Request(`http://localhost${path}`, init), env, store: bindingStore, ctx: bindingCtx });
    return { response, payload: await response.json() as Record<string, unknown> };
  }

  const invite = await bindingCall("/api/coach/invitations", { method: "POST", headers: { "x-coach-token": "dev-coach", "content-type": "application/json" }, body: JSON.stringify({ displayName: "开发绑定客户" }) });
  const rawToken = String((invite.payload.invitation as Record<string, unknown>).token);
  const accepted = await bindingCall("/api/invitations/accept", { method: "POST", body: JSON.stringify({ token: rawToken }) });
  const clientId = String((accepted.payload.client as Record<string, unknown>).id);

  const mismatchedOpenId = await bindingCall("/api/wx/auth/login", { method: "POST", body: JSON.stringify({ devOpenid: `openid-local-sandbox:other-${clientId}`, devClientId: clientId, invitationToken: rawToken }) });
  assert.equal(mismatchedOpenId.response.status, 403);
  assert.equal((mismatchedOpenId.payload.error as Record<string, unknown>).code, "INVITATION_INVALID");

  const mismatchedClient = await bindingCall("/api/wx/auth/login", { method: "POST", body: JSON.stringify({ devOpenid: `openid-local-sandbox:other-client`, devClientId: "client_other", invitationToken: rawToken }) });
  assert.equal(mismatchedClient.response.status, 403);
  assert.equal((mismatchedClient.payload.error as Record<string, unknown>).code, "INVITATION_INVALID");

  const valid = await bindingCall("/api/wx/auth/login", { method: "POST", body: JSON.stringify({ devOpenid: `openid-local-sandbox:${clientId}`, devClientId: clientId, invitationToken: rawToken }) });
  assert.equal(valid.response.status, 200);
});

test("coach summary uses a continuous calendar window instead of active-date count", async () => {
  const gapStore = createMemoryStore();
  const gapCtx = { waitUntil() {}, passThroughOnException() {} } as ExecutionContext;
  const clientId = "gap-client";
  gapStore.clients.set(clientId, { id: clientId, displayName: "间隔客户", status: "active", createdAt: new Date().toISOString() });
  recordOpenedDay(gapStore, clientId, "2026-08-12");
  recordOpenedDay(gapStore, clientId, "2026-08-20");
  gapStore.checkins.set("gap-checkin", { clientId, planDayId: "plan:2026-08-12", localDate: "2026-08-12", itemId: "ex-walk", itemType: "exercise", status: "completed", completedAt: new Date().toISOString() });
  gapStore.sessions.set("gap-coach-session", { kind: "coach", subjectId: "coach_single", expiresAt: Date.now() + 60_000 });
  const response = await handleApi({ request: new Request("http://localhost/api/coach/clients/gap-client/summary?days=7", { headers: { authorization: "Bearer gap-coach-session" } }), env, store: gapStore, ctx: gapCtx });
  assert.equal(response.status, 200);
  const payload = await response.json() as Record<string, unknown>;
  assert.deepEqual(payload.summary, { openedDays: 1, trainingCheckins: 0, mealCheckins: 0, waterCheckins: 0, painAlerts: 0, feedbackDays: 0 });
});

test("publishing an existing plan rejects a backdated effective date", async () => {
  const backdateStore = createMemoryStore();
  const backdateCtx = { waitUntil() {}, passThroughOnException() {} } as ExecutionContext;
  const clientId = "backdate-client";
  backdateStore.clients.set(clientId, { id: clientId, displayName: "回溯客户", status: "active", createdAt: new Date().toISOString() });
  backdateStore.plans.set("backdate-existing", { id: "backdate-existing", clientId, versionNo: 1, effectiveFrom: "2026-08-01", effectiveTo: null, payload: plan("2026-08-01"), status: "published", approvedAt: new Date().toISOString(), changeReason: null });
  backdateStore.jobs.set("backdate-job", { id: "backdate-job", clientId, provider: "codex_cli", model: "codex-cli", schemaVersion: PLAN_SCHEMA_VERSION, status: "pending_review", errorCode: null, traceId: "trace", startDate: "2026-08-20", outputHash: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), operator: "coach" });
  backdateStore.drafts.set("backdate-draft", { id: "backdate-draft", generationJobId: "backdate-job", clientId, status: "pending_review", payload: plan("2026-08-20"), validation: { ok: true, warnings: [] }, createdAt: new Date().toISOString(), reviewedAt: null, rejectionReason: null });
  const yesterday = new Date(Date.now() + 8 * 60 * 60 * 1000 - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const response = await handleApi({ request: new Request("http://localhost/api/coach/plan-drafts/backdate-draft/publish", { method: "POST", headers: { "x-coach-token": "dev-coach", "content-type": "application/json" }, body: JSON.stringify({ effectiveFrom: yesterday }) }), env, store: backdateStore, ctx: backdateCtx });
  assert.equal(response.status, 409);
});
