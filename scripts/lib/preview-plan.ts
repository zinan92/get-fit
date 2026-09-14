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

type Move = { catalogId: string; sets: number; reps: number; restSeconds: number };
const move = (catalogId: string, sets: number, reps: number, restSeconds: number): Move => ({ catalogId, sets, reps, restSeconds });

// A beginner three-day split that rotates weekly, as a coach would program it.
const trainingDays: Array<{ title: string; reminder: string; moves: Move[] }> = [
  { title: "下肢力量日", reminder: "动作不用赶，今天把每次下蹲都做稳。", moves: [move("ex-goblet-squat", 4, 12, 75), move("ex-reverse-lunge", 3, 10, 60), move("ex-glute-bridge", 3, 15, 45), move("ex-plank", 3, 30, 30)] },
  { title: "上背与推举", reminder: "划船时想着把手肘往后带，背会更有感觉。", moves: [move("ex-dumbbell-row", 4, 10, 60), move("ex-incline-push-up", 3, 10, 60), move("ex-shoulder-press", 3, 10, 60), move("ex-dead-bug", 3, 10, 30)] },
  { title: "全身激活日", reminder: "一圈做完记得喝口水，心率上来就放慢一点。", moves: [move("ex-bodyweight-squat", 3, 15, 45), move("ex-romanian-deadlift", 3, 12, 60), move("ex-lateral-raise", 3, 12, 45), move("ex-jumping-jack", 3, 30, 30)] },
];

const breakfasts = [
  [["food-egg", 100], ["food-yogurt", 150], ["food-toast", 73]],
  [["food-oats", 50], ["food-milk", 250], ["food-blueberry", 80]],
  [["food-mantou", 80], ["food-soymilk", 300], ["food-egg", 50]],
] as const;
const lunches = [
  [["food-chicken", 150], ["food-rice", 120], ["food-broccoli", 200]],
  [["food-beef", 120], ["food-white-rice", 130], ["food-bok-choy", 200]],
  [["food-shrimp", 150], ["food-soba", 180], ["food-cucumber", 150]],
] as const;
const snacks = [
  [["food-banana", 120], ["food-almond", 15]],
  [["food-apple", 180], ["food-greek-yogurt", 150]],
  [["food-kiwi", 150], ["food-walnut", 15]],
] as const;
const dinners = [
  [["food-salmon", 160], ["food-sweet-potato", 180], ["food-spinach", 120]],
  [["food-tofu", 150], ["food-millet-porridge", 300], ["food-tomato", 150]],
  [["food-cod", 160], ["food-corn", 150], ["food-asparagus", 120]],
] as const;
const foods = (items: ReadonlyArray<readonly [string, number]>) => items.map(([foodCatalogId, grams]) => ({ foodCatalogId, grams }));

export function previewPlan(): PlanPayload {
  return {
    schemaVersion: PLAN_SCHEMA_VERSION,
    timezone: PLAN_TIMEZONE,
    startDate: PREVIEW_START,
    days: Array.from({ length: 30 }, (_, index) => {
      const slot = [0, 2, 4].indexOf(index % 7);
      const week = Math.floor(index / 7);
      const theme = slot >= 0 ? trainingDays[(slot + week) % trainingDays.length] : null;
      const rotation = index % 3;
      return {
        dayIndex: index + 1,
        localDate: addDays(PREVIEW_START, index),
        title: theme ? theme.title : "恢复与轻活动",
        exercises: theme ? theme.moves.map((item) => ({ ...item, cues: [] })) : [{ catalogId: "ex-walk", sets: 1, reps: 30, restSeconds: 0, cues: [] }, { catalogId: "ex-cat-cow", sets: 2, reps: 8, restSeconds: 20, cues: [] }],
        meals: [
          { mealType: "breakfast" as const, foods: foods(breakfasts[rotation]) },
          { mealType: "lunch" as const, foods: foods(lunches[(rotation + 1) % 3]) },
          { mealType: "snack" as const, foods: foods(snacks[rotation]) },
          { mealType: "dinner" as const, foods: foods(dinners[(rotation + 2) % 3]) },
        ],
        reminders: [theme ? theme.reminder : "今天让身体恢复一下：轻松散步 30 分钟，睡前做几组猫牛式。"],
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
