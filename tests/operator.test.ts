import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { createCloudFunction } from "../server/cloudfunction/entry";
import type { SnapshotBackend } from "../server/api/persistence";
import { PLAN_SCHEMA_VERSION, PLAN_TIMEZONE, type PlanPayload } from "../packages/plan-schema/src/index";
import { draftJob, listJobs, OperatorError, parseInvokeOutput, type Transport } from "../scripts/operator-generate";
import { planPrompt, type CodexInput } from "../scripts/lib/codex-runner";

const KEY = "operator-test-storage-key";
const OPERATOR_KEY = "a-long-random-operator-key";
const COACH = "openid-coach";

function memoryBackend(): SnapshotBackend {
  let record: Awaited<ReturnType<SnapshotBackend["read"]>> = null;
  return { async read() { return record; }, async write(next, expected) { if ((record?.revision ?? 0) !== expected) return "conflict"; record = next; return "written"; } };
}

function setup() {
  const fn = createCloudFunction({
    env: { DATA_ENCRYPTION_KEY: KEY, COACH_OPENIDS: COACH, OPERATOR_KEY_SHA256: createHash("sha256").update(OPERATOR_KEY).digest("hex") },
    backend: memoryBackend(),
    resolveOpenid: (context) => String((context as { openid?: string }).openid ?? ""),
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const call = (openid: string, path: string, method = "GET", body?: unknown, operatorKey?: string) => fn({ path, method, body, operatorKey }, { openid }) as Promise<{ statusCode: number; body: any }>;
  const operator = (key = OPERATOR_KEY): Transport => (event) => call("", event.path, event.method, event.body, key) as never;
  return { call, operator };
}

function plan(startDate: string): PlanPayload {
  const start = new Date(`${startDate}T00:00:00Z`);
  return {
    schemaVersion: PLAN_SCHEMA_VERSION, timezone: PLAN_TIMEZONE, startDate,
    days: Array.from({ length: 30 }, (_, index) => {
      const date = new Date(start); date.setUTCDate(date.getUTCDate() + index);
      const training = [0, 2, 4].includes(index % 7);
      return {
        dayIndex: index + 1, localDate: date.toISOString().slice(0, 10), title: training ? "力量日" : "恢复日",
        exercises: training ? [{ catalogId: "ex-glute-bridge", sets: 3, reps: 12, restSeconds: 60, cues: [] }, { catalogId: "ex-dead-bug", sets: 3, reps: 10, restSeconds: 30, cues: [] }] : [{ catalogId: "ex-walk", sets: 1, reps: 30, restSeconds: 0, cues: [] }],
        meals: [
          { mealType: "breakfast" as const, foods: [{ foodCatalogId: "food-oats", grams: 60 }, { foodCatalogId: "food-milk", grams: 300 }] },
          { mealType: "lunch" as const, foods: [{ foodCatalogId: "food-chicken", grams: 150 }, { foodCatalogId: "food-white-rice", grams: 200 }, { foodCatalogId: "food-broccoli", grams: 200 }] },
          { mealType: "dinner" as const, foods: [{ foodCatalogId: "food-tofu", grams: 200 }, { foodCatalogId: "food-sweet-potato", grams: 200 }, { foodCatalogId: "food-spinach", grams: 150 }] },
        ],
        reminders: ["慢慢来"],
      };
    }),
  };
}

async function clientWithJob(call: ReturnType<typeof setup>["call"]) {
  const invite = await call(COACH, "/api/coach/invitations", "POST", { displayName: "小满" });
  const clientId = (await call("openid-client", "/api/invitations/accept", "POST", { token: invite.body.invitation.token })).body.client.id;
  await call("openid-client", "/api/wx/auth/login", "POST", { invitationToken: invite.body.invitation.token });
  await call("openid-client", "/api/me/consents", "POST", { types: ["health_processing", "third_party_model"] });
  await call("openid-client", "/api/me/profile", "PUT", { target: "fat_loss", ageBand: "25_34", heightCm: 165, weightKg: 60, trainingExperience: "beginner", sessionsPerWeek: 3, minutesPerSession: 45, equipment: [], injuryFlags: ["knee_discomfort"], allergyFlags: ["tree_nut"], dietaryPreferences: [], riskFlags: [], timezone: "Asia/Shanghai" });
  await call(COACH, `/api/coach/clients/${clientId}/profile/confirm`, "POST");
  const job = await call(COACH, `/api/coach/clients/${clientId}/plan-generations`, "POST", { startDate: "2026-09-15" });
  return { clientId, jobId: job.body.job.id as string };
}

test("operator lists waiting jobs, drafts one, and the coach sees it ready for review", async () => {
  const { call, operator } = setup();
  const { clientId, jobId } = await clientWithJob(call);
  const jobs = await listJobs(operator());
  assert.deepEqual(jobs.map((job) => job.id), [jobId]);
  assert.equal(JSON.stringify(jobs).includes("小满"), false, "the job list carries no names");

  let seen: CodexInput | null = null;
  const result = await draftJob(operator(), jobId, async (input) => { seen = input; return plan(input.job.startDate); });
  assert.ok(seen, "the drafter received the input");
  assert.equal(JSON.stringify(seen).includes("小满"), false, "drafting input is de-identified");
  assert.ok(Array.isArray(result.warnings));
  const overview = await call(COACH, "/api/coach/overview");
  const entry = overview.body.clients.find((item: { client: { id: string } }) => item.client.id === clientId);
  assert.equal(entry.stage, "draft_ready");
  assert.equal(entry.draft.id, result.draftId);
  assert.deepEqual(await listJobs(operator()), []);
});

test("operator key is narrow: wrong keys, WeChat callers and coach actions are all refused", async () => {
  const { call, operator } = setup();
  const { jobId } = await clientWithJob(call);
  await assert.rejects(listJobs(operator("wrong-key")), OperatorError);
  assert.equal((await call("openid-client", "/api/operator/jobs", "GET", undefined, OPERATOR_KEY)).statusCode, 401, "a WeChat caller cannot borrow the key");
  assert.equal((await call(COACH, "/api/operator/jobs")).statusCode, 401, "coaches are not operators");
  assert.equal((await operator()({ path: "/api/coach/overview", method: "GET" })).statusCode, 401, "operators are not coaches");
  assert.equal((await operator()({ path: `/api/coach/clients/x/plan-generations`, method: "POST" })).statusCode, 401);
  assert.equal((await operator()({ path: "/api/me", method: "GET" })).statusCode, 401);

  const noKeyConfigured = createCloudFunction({ env: { DATA_ENCRYPTION_KEY: KEY }, backend: memoryBackend(), resolveOpenid: () => "" });
  assert.equal((await noKeyConfigured({ path: "/api/operator/jobs", method: "GET", operatorKey: OPERATOR_KEY })).statusCode, 401, "no configured hash means no operator");
  void jobId;
});

test("an invalid draft is never uploaded and the operator can retry with a fresh token", async () => {
  const { call, operator } = setup();
  const { jobId } = await clientWithJob(call);
  const bad = plan("2026-09-15");
  bad.days[0].exercises = [{ catalogId: "ex-goblet-squat", sets: 3, reps: 12, restSeconds: 60, cues: [] }];
  await assert.rejects(draftJob(operator(), jobId, async () => bad), /nothing uploaded/);
  const first = await operator()({ path: `/api/operator/jobs/${jobId}/import-token`, method: "POST" });
  const second = await operator()({ path: `/api/operator/jobs/${jobId}/import-token`, method: "POST" });
  assert.equal(second.statusCode, 201, "a retry replaces the unused token");
  const stale = await call("", "/api/codex-fallback/import", "POST", { token: first.body.token, payload: plan("2026-09-15") });
  assert.equal(stale.statusCode, 401, "the replaced token no longer works");
  await draftJob(operator(), jobId, async () => plan("2026-09-15"));
});

test("the drafting prompt only offers what this client may have, with a concrete energy band", () => {
  const input: CodexInput = { job: { id: "job", startDate: "2026-09-15", schemaVersion: PLAN_SCHEMA_VERSION }, profile: { target: "fat_loss", ageBand: "25_34", heightCm: 165, weightKg: 60, trainingExperience: "beginner", sessionsPerWeek: 3, minutesPerSession: 45, equipment: [], injuryFlags: ["knee_discomfort"], allergyFlags: ["tree_nut"], dietaryPreferences: [], riskFlags: [], timezone: PLAN_TIMEZONE } };
  const prompt = planPrompt(input);
  const exercises = JSON.parse(prompt.split("EXERCISES:\n")[1].split("\n")[0]) as Array<{ id: string; level: string }>;
  const foods = JSON.parse(prompt.split("FOODS:\n")[1]) as Array<{ id: string }>;
  const ids = new Set(exercises.map((item) => item.id));
  assert.equal(ids.has("ex-goblet-squat"), false, "needs dumbbells");
  assert.equal(ids.has("ex-bodyweight-squat"), false, "knee discomfort");
  assert.equal(ids.has("ex-jump-squat"), false, "intermediate for a beginner");
  assert.equal(ids.has("ex-dead-bug"), true);
  assert.ok(exercises.every((item) => item.level === "beginner"));
  assert.equal(foods.some((item) => item.id === "food-almond"), false, "tree nut allergy");
  assert.match(prompt, /3 training days in every 7-day block/);
  assert.match(prompt, /between 1320 and 1680 kcal/);
});

test("reads the function result out of tcb invoke output in its common shapes", () => {
  const result = { statusCode: 200, body: { jobs: [] } };
  assert.deepEqual(parseInvokeOutput(JSON.stringify(result)), result);
  assert.deepEqual(parseInvokeOutput(JSON.stringify({ RetMsg: JSON.stringify(result), Duration: 12 })), result);
  assert.deepEqual(parseInvokeOutput(JSON.stringify({ data: { result } })), result);
  assert.deepEqual(parseInvokeOutput(`调用成功\n${JSON.stringify({ result })}`), result);
  assert.equal(parseInvokeOutput("error: not logged in"), null);
});
