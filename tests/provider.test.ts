import assert from "node:assert/strict";
import test from "node:test";
import { generateWithDeepSeek } from "../server/api/deepseek";
import { PLAN_SCHEMA_VERSION, PLAN_TIMEZONE } from "../packages/plan-schema/src/index";
import type { HealthProfile } from "../server/api/types";

const profile: HealthProfile = {
  target: "general_fitness", ageBand: "25_34", heightCm: 170, weightKg: 65,
  trainingExperience: "beginner", sessionsPerWeek: 3, minutesPerSession: 45,
  equipment: ["dumbbell"], injuryFlags: [], allergyFlags: [], dietaryPreferences: [], riskFlags: [], timezone: PLAN_TIMEZONE,
};

function validPlan() {
  const start = new Date("2026-08-12T00:00:00Z");
  return {
    schemaVersion: PLAN_SCHEMA_VERSION, timezone: PLAN_TIMEZONE, startDate: "2026-08-12",
    days: Array.from({ length: 30 }, (_, index) => {
      const date = new Date(start); date.setUTCDate(date.getUTCDate() + index);
      return { dayIndex: index + 1, localDate: date.toISOString().slice(0, 10), title: "轻量训练日", exercises: [{ catalogId: "ex-walk", sets: 2, reps: 20, restSeconds: 30 }], meals: [
        { mealType: "breakfast" as const, foods: [{ foodCatalogId: "food-egg", grams: 100 }, { foodCatalogId: "food-toast", grams: 80 }] },
        { mealType: "lunch" as const, foods: [{ foodCatalogId: "food-chicken", grams: 150 }, { foodCatalogId: "food-rice", grams: 200 }, { foodCatalogId: "food-broccoli", grams: 200 }] },
        { mealType: "dinner" as const, foods: [{ foodCatalogId: "food-salmon", grams: 120 }, { foodCatalogId: "food-sweet-potato", grams: 200 }] },
      ], reminders: ["动作不适时停止并联系教练"] };
    }),
  };
}

const env = { DEEPSEEK_API_KEY: "unit-test-key", DEEPSEEK_MODEL: "deepseek-v4-flash" };

test("DeepSeek adapter accepts only validated JSON and returns output hash", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(validPlan()) } }] }), { status: 200 });
  try {
    const result = await generateWithDeepSeek(env, profile, "2026-08-12", "trace-test");
    assert.equal(result.ok, true);
    if (result.ok) { assert.equal(result.payload.days.length, 30); assert.equal(result.outputHash.length, 64); }
  } finally { globalThis.fetch = originalFetch; }
});

test("DeepSeek adapter fails closed for invalid JSON and rate limits", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ choices: [{ message: { content: "not-json" } }] }), { status: 200 });
  try { const invalid = await generateWithDeepSeek(env, profile, "2026-08-12", "trace-invalid"); assert.equal(invalid.ok, false); if (!invalid.ok) assert.equal(invalid.code, "PROVIDER_INVALID_JSON"); }
  finally { globalThis.fetch = originalFetch; }
  globalThis.fetch = async () => new Response("", { status: 429 });
  try { const limited = await generateWithDeepSeek(env, profile, "2026-08-12", "trace-limited"); assert.equal(limited.ok, false); if (!limited.ok) assert.equal(limited.code, "PROVIDER_RATE_LIMITED"); }
  finally { globalThis.fetch = originalFetch; }
});
