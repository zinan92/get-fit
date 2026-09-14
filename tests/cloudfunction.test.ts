import assert from "node:assert/strict";
import test from "node:test";
import { cloudbaseSnapshotBackend, type CloudbaseDatabase } from "../server/cloudfunction/cloudbase-storage";
import { createCloudFunction } from "../server/cloudfunction/entry";
import { loadSnapshot, saveSnapshot, StateConflictError, type SnapshotBackend } from "../server/api/persistence";
import { createMemoryStore } from "../server/api/store";
import { PLAN_SCHEMA_VERSION, PLAN_TIMEZONE, type PlanPayload } from "../packages/plan-schema/src/index";

const KEY = "cloudfunction-test-key";
const COACH_OPENID = "openid-coach";

type Doc = { _id: string; ciphertext: string; keyVersion: string; revision: number };

/** In-memory stand-in for the CloudBase database subset the adapter uses, with real duplicate/where semantics. */
function fakeCloudbase() {
  const docs = new Map<string, Doc>();
  const db: CloudbaseDatabase = {
    collection() {
      return {
        doc(id: string) { return { async get() { const doc = docs.get(id); return { data: doc ? [{ ...doc }] : [] }; } }; },
        where(query: Record<string, unknown>) {
          return {
            async update(data: Record<string, unknown>) {
              const doc = docs.get(String(query._id));
              if (!doc || doc.revision !== query.revision) return { updated: 0 };
              docs.set(doc._id, { ...doc, ...data } as Doc);
              return { updated: 1 };
            },
          };
        },
        async add(data: Record<string, unknown>) {
          const id = String(data._id);
          if (docs.has(id)) throw Object.assign(new Error("E11000 duplicate key error"), { code: "DATABASE_DUPLICATE_WRITE" });
          docs.set(id, data as unknown as Doc);
          return { id };
        },
      };
    },
  };
  return { db, docs };
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

// Response bodies are asserted field by field; a loose shape keeps the flow readable.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Body = Record<string, any>;
type Call = (openid: string, path: string, method?: string, body?: unknown, headers?: Record<string, string>) => Promise<{ statusCode: number; body: Body }>;

function harness(backend: SnapshotBackend, extra: { maxAttempts?: number } = {}) {
  const fn = createCloudFunction({ env: { DATA_ENCRYPTION_KEY: KEY, COACH_OPENIDS: ` ${COACH_OPENID} , ` }, backend, resolveOpenid: (context) => String((context as { openid?: string }).openid ?? ""), ...extra });
  const call: Call = async (openid, path, method = "GET", body, headers = {}) => fn({ path, method, body, headers }, { openid }) as Promise<{ statusCode: number; body: Body }>;
  return call;
}

const profile = { target: "general_fitness", ageBand: "25_34", heightCm: 170, weightKg: 65, trainingExperience: "beginner", sessionsPerWeek: 3, minutesPerSession: 45, equipment: ["dumbbell"], injuryFlags: [], allergyFlags: [], dietaryPreferences: [], riskFlags: [], timezone: "Asia/Shanghai" };

/** Invites, binds and onboards a client with a published plan; returns ids used by assertions. */
async function onboard(call: Call, openid: string, name: string, startDate = "2026-09-15") {
  const invitation = await call(COACH_OPENID, "/api/coach/invitations", "POST", { displayName: name });
  assert.equal(invitation.statusCode, 201);
  const token = invitation.body.invitation.token;
  const clientId = (await call(openid, "/api/invitations/accept", "POST", { token })).body.client.id;
  const bound = await call(openid, "/api/wx/auth/login", "POST", { invitationToken: token });
  assert.equal(bound.statusCode, 200);
  assert.equal(bound.body.sessionToken, undefined, "platform callers get no bearer session");
  assert.equal((await call(openid, "/api/me/consents", "POST", { types: ["health_processing", "third_party_model"] })).statusCode < 300, true);
  assert.equal((await call(openid, "/api/me/profile", "PUT", profile)).statusCode < 300, true);
  assert.equal((await call(COACH_OPENID, `/api/coach/clients/${clientId}/profile/confirm`, "POST")).body.safetyGate, "auto_allowed");
  const job = await call(COACH_OPENID, `/api/coach/clients/${clientId}/plan-generations`, "POST", { startDate }, { "idempotency-key": `gen-${clientId}` });
  const importToken = await call(COACH_OPENID, `/api/coach/generation-jobs/${job.body.job.id}/codex-fallback-token`, "POST");
  const imported = await call("", "/api/codex-fallback/import", "POST", { token: importToken.body.token, payload: plan(startDate) });
  assert.equal(imported.statusCode, 201);
  const published = await call(COACH_OPENID, `/api/coach/plan-drafts/${imported.body.draft.id}/publish`, "POST", { changeReason: "test" });
  assert.equal(published.statusCode, 201);
  return { clientId, planId: published.body.plan.id as string };
}

for (const [name, makeBackend] of [
  ["memory", () => { let record: Awaited<ReturnType<SnapshotBackend["read"]>> = null; return { async read() { return record; }, async write(next, expected) { if ((record?.revision ?? 0) !== expected) return "conflict"; record = next; return "written"; } } as SnapshotBackend; }],
  ["cloudbase", () => cloudbaseSnapshotBackend(fakeCloudbase().db)],
] as const) {
  test(`${name} snapshot backend: encrypted round trip and compare-and-set`, async () => {
    const backend = makeBackend();
    const first = createMemoryStore();
    first.clients.set("client_1", { id: "client_1", displayName: "小满", status: "active", createdAt: new Date().toISOString() });
    assert.equal(await loadSnapshot(first, backend, KEY), 0);
    assert.equal(await saveSnapshot(first, backend, KEY, 0), 1);
    const stored = await backend.read();
    assert.equal(stored?.ciphertext.includes("小满"), false);
    const second = createMemoryStore();
    assert.equal(await loadSnapshot(second, backend, KEY), 1);
    assert.equal(second.clients.get("client_1")?.displayName, "小满");
    await assert.rejects(saveSnapshot(second, backend, KEY, 0), StateConflictError, "a second first-insert conflicts");
    assert.equal(await saveSnapshot(second, backend, KEY, 1), 2);
    await assert.rejects(saveSnapshot(first, backend, KEY, 1), StateConflictError, "a stale revision conflicts");
  });
}

test("platform OPENID is the only identity: coach allowlist, client binding, isolation", async () => {
  const call = harness(cloudbaseSnapshotBackend(fakeCloudbase().db));
  const a = await onboard(call, "openid-a", "客户甲");
  const b = await onboard(call, "openid-b", "客户乙");

  const todayA = await call("openid-a", "/api/plan/today?date=2026-09-15");
  assert.equal(todayA.body.status, "ready");

  // Non-allowlisted callers cannot use coach endpoints, even with legacy credentials attached.
  for (const [path, method] of [["/api/coach/invitations", "POST"], ["/api/coach/clients", "GET"], [`/api/coach/clients/${a.clientId}/summary`, "GET"]]) {
    const denied = await call("openid-a", path, method, { displayName: "x" }, { "x-coach-token": "dev-coach", authorization: "Bearer anything", "oai-authenticated-user-id": "owner" });
    assert.equal(denied.statusCode, 401, `${method} ${path}`);
  }

  // Request-supplied identity fields are ignored: B stays B.
  const spoof = await call("openid-b", `/api/plan/today?date=2026-09-15&clientId=${a.clientId}`, "GET", undefined, { authorization: "Bearer forged" });
  assert.equal(spoof.statusCode, 200);
  const rebind = await call("openid-b", "/api/wx/auth/login", "POST", { devOpenid: "openid-a", devClientId: a.clientId, openid: "openid-a", code: "x" });
  assert.equal(rebind.body.client.id, b.clientId);

  // B cannot write into A's plan day.
  const crossWrite = await call("openid-b", "/api/checkins", "PUT", { localDate: "2026-09-15", planDayId: `${a.planId}:2026-09-15`, itemId: "ex-walk", itemType: "exercise", status: "completed" });
  assert.ok(crossWrite.statusCode >= 400);
  const afterA = await call("openid-a", "/api/plan/today?date=2026-09-15");
  assert.deepEqual(afterA.body.checkins, []);

  // Unknown or missing OPENID has no client.
  assert.equal((await call("openid-stranger", "/api/plan/today")).statusCode, 401);
  assert.equal((await call("", "/api/plan/today")).statusCode, 401);
  assert.equal((await call("", "/api/coach/clients")).statusCode, 401);
});

test("a write that loses a race is retried on fresh state instead of overwriting", async () => {
  const { db } = fakeCloudbase();
  const inner = cloudbaseSnapshotBackend(db);
  const call = harness(inner);
  const { planId } = await onboard(call, "openid-a", "客户甲");

  let competitor: (() => Promise<unknown>) | null = null;
  const racing: SnapshotBackend = {
    read: () => inner.read(),
    async write(record, expected) {
      if (competitor) { const run = competitor; competitor = null; await run(); }
      return inner.write(record, expected);
    },
  };
  const racingCall = harness(racing);
  const checkin = (itemId: string, itemType: string) => ({ localDate: "2026-09-15", planDayId: `${planId}:2026-09-15`, itemId, itemType, status: "completed" });
  competitor = () => call("openid-a", "/api/checkins", "PUT", checkin("breakfast", "meal"));
  const result = await racingCall("openid-a", "/api/checkins", "PUT", checkin("ex-walk", "exercise"));
  assert.equal(result.statusCode, 200);
  const today = await call("openid-a", "/api/plan/today?date=2026-09-15");
  assert.deepEqual(today.body.checkins.map((item: { itemId: string }) => item.itemId).sort(), ["breakfast", "ex-walk"]);

  const noRetry = harness(racing, { maxAttempts: 1 });
  competitor = () => call("openid-a", "/api/checkins", "PUT", checkin("lunch", "meal"));
  const lost = await noRetry("openid-a", "/api/checkins", "PUT", checkin("dinner", "meal"));
  assert.equal(lost.statusCode, 409);
  assert.equal(lost.body.error.code, "STATE_CONFLICT");
  const final = await call("openid-a", "/api/plan/today?date=2026-09-15");
  const ids = final.body.checkins.map((item: { itemId: string }) => item.itemId);
  assert.ok(ids.includes("lunch"), "the winning write survives");
  assert.ok(!ids.includes("dinner"), "the losing write is not silently applied");
});

test("opened days count real days the app was opened, survive audit truncation and ignore browsing", async (t) => {
  const backend = cloudbaseSnapshotBackend(fakeCloudbase().db);
  const call = harness(backend);
  const { clientId } = await onboard(call, "openid-a", "客户甲");
  t.mock.timers.enable({ apis: ["Date"], now: new Date("2026-09-15T01:00:00Z") });
  await call("openid-a", "/api/plan/today?date=2026-09-15");
  await call("openid-a", "/api/plan/today?date=2026-09-15");
  // Browsing other plan dates on the same real day is not another opened day.
  await call("openid-a", "/api/plan/today?date=2026-09-20");
  await call("openid-a", "/api/plan/today?date=2026-09-21");
  t.mock.timers.setTime(new Date("2026-09-16T01:00:00Z").getTime());
  await call("openid-a", "/api/plan/today?date=2026-09-16");
  // Flood the audit log well past the 500-entry snapshot window.
  for (let index = 0; index < 30; index += 1) await call("openid-a", "/api/me");
  const store = createMemoryStore();
  const revision = await loadSnapshot(store, backend, KEY);
  for (let index = 0; index < 600; index += 1) store.audit.push({ id: `noise-${index}`, action: "noise" });
  await saveSnapshot(store, backend, KEY, revision);

  const summary = await call(COACH_OPENID, `/api/coach/clients/${clientId}/summary?days=7`);
  t.mock.timers.reset();
  assert.equal(summary.statusCode, 200);
  assert.equal(summary.body.summary.openedDays, 2);
});

test("stored state never holds the OPENID in plaintext and missing key fails closed", async () => {
  const { db, docs } = fakeCloudbase();
  const backend = cloudbaseSnapshotBackend(db);
  const call = harness(backend);
  await onboard(call, "openid-plaintext-probe", "客户甲");
  const raw = JSON.stringify([...docs.values()]);
  assert.equal(raw.includes("openid-plaintext-probe"), false);
  const store = createMemoryStore();
  await loadSnapshot(store, backend, KEY);
  assert.equal(JSON.stringify(store.audit).includes("openid-plaintext-probe"), false);

  const noKey = createCloudFunction({ env: {}, backend, resolveOpenid: () => "openid-a" });
  assert.equal((await noKey({ path: "/api/me", method: "GET" })).statusCode, 503);
  const throwing = createCloudFunction({ env: { DATA_ENCRYPTION_KEY: KEY }, backend, resolveOpenid: () => { throw new Error("no context"); } });
  assert.equal((await throwing({ path: "/api/me", method: "GET" })).statusCode, 401);
});
