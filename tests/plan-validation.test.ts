import assert from "node:assert/strict";
import test from "node:test";
import { catalogContext, planGenerationContract, validateProviderPayload } from "../server/api/plan-validation";
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

test("plan validator accepts catalog-backed JSON for the Codex contract", () => {
  const result = validateProviderPayload(profile, validPlan());
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.value.days.length, 30);
  assert.deepEqual(planGenerationContract, { schemaVersion: "plan.v1", timezone: "Asia/Shanghai", provider: "codex_cli", reviewRequired: true });
});

test("plan validator fails closed for malformed JSON and blocked catalog items", () => {
  const invalid = validateProviderPayload(profile, null);
  assert.equal(invalid.ok, false);
  const context = catalogContext({ ...profile, injuryFlags: ["acute_knee_pain"] });
  assert.equal(context.blockedExerciseIds?.has("ex-goblet-squat"), true);
});

test("moves needing equipment the client lacks are blocked, and a gym covers everything", () => {
  const bodyweightOnly = catalogContext({ ...profile, equipment: [] });
  assert.equal(bodyweightOnly.blockedExerciseIds?.has("ex-goblet-squat"), true);
  assert.equal(bodyweightOnly.blockedExerciseIds?.has("ex-band-squat"), true);
  assert.equal(bodyweightOnly.blockedExerciseIds?.has("ex-bodyweight-squat"), false);
  assert.equal(bodyweightOnly.blockedExerciseIds?.has("ex-plank"), false);
  const dumbbells = catalogContext(profile);
  assert.equal(dumbbells.blockedExerciseIds?.has("ex-dumbbell-bench-press"), true, "a bench is not implied by dumbbells");
  assert.equal(dumbbells.blockedExerciseIds?.has("ex-floor-press"), false);
  const gym = catalogContext({ ...profile, equipment: ["gym"] });
  assert.equal(gym.blockedExerciseIds?.size, 0);
  const plan = validPlan();
  plan.days[0].exercises = [{ catalogId: "ex-kettlebell-swing", sets: 3, reps: 12, restSeconds: 60 }];
  const result = validateProviderPayload(profile, plan);
  assert.equal(result.ok, false);
});
