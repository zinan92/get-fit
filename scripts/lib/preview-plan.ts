// Builds the mini-program preview dataset by running a demo plan through the
// real API seam, so preview screens always match the shapes a client receives.
import { handleApi } from "../../server/api/handlers";
import { createMemoryStore, sha256 } from "../../server/api/store";
import type { PlatformIdentity } from "../../server/api/types";
import { PLAN_SCHEMA_VERSION, PLAN_TIMEZONE, type PlanPayload } from "../../packages/plan-schema/src/index";

export const PREVIEW_START = "2026-09-08";
export const PREVIEW_TODAY = "2026-09-12";
const COACH = "preview-coach";
const CLIENT = "preview-client";

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

const trainingDays = [
  { title: "下肢力量日", reminder: "动作不用赶，今天把每次下蹲都做稳。" },
  { title: "上背与臀腿", reminder: "划船时想着把手肘往后带，背会更有感觉。" },
  { title: "全身激活日", reminder: "三个动作一圈就好，做完记得喝口水。" },
];

export function previewPlan(): PlanPayload {
  return {
    schemaVersion: PLAN_SCHEMA_VERSION,
    timezone: PLAN_TIMEZONE,
    startDate: PREVIEW_START,
    days: Array.from({ length: 30 }, (_, index) => {
      const training = [0, 2, 4].includes(index % 7);
      const theme = trainingDays[Math.floor(index / 7) % trainingDays.length];
      return {
        dayIndex: index + 1,
        localDate: addDays(PREVIEW_START, index),
        title: training ? theme.title : "恢复与轻活动",
        exercises: training
          ? [
            { catalogId: "ex-goblet-squat", sets: 4, reps: 12, restSeconds: 75, cues: [] },
            { catalogId: "ex-dumbbell-row", sets: 4, reps: 10, restSeconds: 60, cues: [] },
            { catalogId: "ex-glute-bridge", sets: 3, reps: 15, restSeconds: 45, cues: [] },
          ]
          : [],
        meals: [
          { mealType: "breakfast" as const, foods: [{ foodCatalogId: "food-egg", grams: 100 }, { foodCatalogId: "food-yogurt", grams: 150 }, { foodCatalogId: "food-toast", grams: 73 }] },
          { mealType: "lunch" as const, foods: [{ foodCatalogId: "food-chicken", grams: 150 }, { foodCatalogId: "food-rice", grams: training ? 120 : 100 }, { foodCatalogId: "food-broccoli", grams: 200 }] },
          { mealType: "snack" as const, foods: [{ foodCatalogId: "food-banana", grams: 120 }, { foodCatalogId: "food-milk", grams: 250 }, { foodCatalogId: "food-almond", grams: 15 }] },
          { mealType: "dinner" as const, foods: [{ foodCatalogId: "food-salmon", grams: 160 }, { foodCatalogId: "food-sweet-potato", grams: training ? 180 : 150 }, { foodCatalogId: "food-spinach", grams: 120 }] },
        ],
        reminders: [training ? theme.reminder : "今天让身体恢复一下：轻松散步 30 分钟，睡前做 8 分钟拉伸。"],
      };
    }),
  };
}

export async function buildPreviewDataset() {
  const store = createMemoryStore();
  const identity = async (openid: string, isCoach = false): Promise<PlatformIdentity> => ({ openid, openidHash: await sha256(openid), isCoach });
  const coach = await identity(COACH, true);
  const client = await identity(CLIENT);
  const ctx = { waitUntil() {}, passThroughOnException() {} } as unknown as ExecutionContext;
  const call = async (platform: PlatformIdentity, path: string, method = "GET", body?: unknown) => {
    const request = new Request(`https://preview.invalid${path}`, { method, headers: { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
    const response = await handleApi({ request, env: { DATA_ENCRYPTION_KEY: "preview" }, store, ctx, platform });
    const payload = await response.json() as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
    if (response.status >= 300) throw new Error(`${method} ${path} -> ${response.status} ${JSON.stringify(payload)}`);
    return payload;
  };
  const invitation = await call(coach, "/api/coach/invitations", "POST", { displayName: "小满" });
  const token = invitation.invitation.token;
  const clientId = (await call(client, "/api/invitations/accept", "POST", { token })).client.id;
  await call(client, "/api/wx/auth/login", "POST", { invitationToken: token });
  await call(client, "/api/me/consents", "POST", { types: ["health_processing", "third_party_model"] });
  await call(client, "/api/me/profile", "PUT", { target: "fat_loss", ageBand: "25_34", heightCm: 165, weightKg: 62, trainingExperience: "beginner", sessionsPerWeek: 3, minutesPerSession: 45, equipment: ["dumbbell"], injuryFlags: [], allergyFlags: [], dietaryPreferences: [], riskFlags: [], timezone: "Asia/Shanghai" });
  await call(coach, `/api/coach/clients/${clientId}/profile/confirm`, "POST");
  const job = await call(coach, `/api/coach/clients/${clientId}/plan-generations`, "POST", { startDate: PREVIEW_START });
  const importToken = await call(coach, `/api/coach/generation-jobs/${job.job.id}/codex-fallback-token`, "POST");
  const draft = await call(coach, "/api/codex-fallback/import", "POST", { token: importToken.token, payload: previewPlan() });
  await call(coach, `/api/coach/plan-drafts/${draft.draft.id}/publish`, "POST", { changeReason: "preview" });

  const days: Record<string, unknown> = {};
  for (let index = 0; index < 30; index += 1) {
    const date = addDays(PREVIEW_START, index);
    days[date] = await call(client, `/api/plan/today?date=${date}`);
  }
  const months = [...new Set(Object.keys(days).map((date) => date.slice(0, 7)))];
  const calendar: Record<string, unknown> = {};
  for (const month of months) calendar[month] = await call(client, `/api/plans/calendar?month=${month}`);
  const me = await call(client, "/api/me");
  const dataset = { today: PREVIEW_TODAY, me: { client: { ...me.client, createdAt: `${PREVIEW_START}T09:00:00.000Z` } }, days, calendar };
  // Generated ids are random; pin them so the committed dataset is reproducible.
  const planId = (days[PREVIEW_TODAY] as { plan: { id: string } }).plan.id;
  return JSON.parse(JSON.stringify(dataset).replaceAll(planId, "plan_preview").replaceAll(clientId, "client_preview")) as typeof dataset;
}
