import { requiresManualReview } from "../packages/contracts/src/index";
import assert from "node:assert/strict";
import test from "node:test";
import { exerciseCatalog, foodCatalog } from "../packages/catalogs/src/index";
import { PLAN_SCHEMA_VERSION, PLAN_TIMEZONE, calculateFoodKcal, validatePlanPayload } from "../packages/plan-schema/src/index";

const catalog = {
  exerciseIds: new Set(exerciseCatalog.map((item) => item.id)),
  foodKcalPer100g: new Map(foodCatalog.map((item) => [item.id, item.kcalPer100g])),
};

function makePlan() {
  const start = new Date("2026-08-12T00:00:00Z");
  return {
    schemaVersion: PLAN_SCHEMA_VERSION,
    timezone: PLAN_TIMEZONE,
    startDate: "2026-08-12",
    days: Array.from({ length: 30 }, (_, index) => {
      const date = new Date(start);
      date.setUTCDate(date.getUTCDate() + index);
      return {
        dayIndex: index + 1,
        localDate: date.toISOString().slice(0, 10),
        title: index % 2 ? "恢复日" : "下肢力量日",
        exercises: [{ catalogId: "ex-goblet-squat", sets: 3, reps: 12, restSeconds: 75 }],
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

test("accepts exactly 30 consecutive catalog-backed days and calculates kcal", () => {
  const result = validatePlanPayload(makePlan(), catalog);
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.dailyKcal["2026-08-12"], 1320);
  assert.equal(calculateFoodKcal("food-egg", 100, catalog), 155);
});

test("rejects unknown ids, duplicates and negative grams", () => {
  const plan = makePlan();
  plan.days[1].localDate = plan.days[0].localDate;
  plan.days[2].exercises[0].catalogId = "unknown";
  plan.days[3].meals[0].foods[0].grams = -1;
  const result = validatePlanPayload(plan, catalog);
  assert.equal(result.ok, false);
  if (!result.ok) assert.ok(result.errors.some((error) => error.includes("duplicate")) && result.errors.some((error) => error.includes("unknown catalog id")) && result.errors.some((error) => error.includes("grams")));
});

test("rejects a blocked food even when the catalog id exists", () => {
  const plan = makePlan();
  const result = validatePlanPayload(plan, { ...catalog, blockedFoodIds: new Set(["food-egg"]) });
  assert.equal(result.ok, false);
  if (!result.ok) assert.ok(result.errors.some((error) => error.includes("blocked by profile")));
});

test("exercise catalog exposes customer-facing coaching metadata without licensed media", () => {
  const squat = exerciseCatalog.find((item) => item.id === "ex-goblet-squat");
  const walk = exerciseCatalog.find((item) => item.id === "ex-walk");
  assert.equal(squat?.equipment, "哑铃");
  assert.ok(squat?.steps.length && squat.steps.length > 0);
  assert.equal(walk?.unit, "minutes");
  for (const item of exerciseCatalog) {
    assert.equal(item.mediaPath, undefined, `${item.id} must not reference licensed media`);
    assert.ok(item.name && item.target && item.steps.length >= 2 && item.cues.length >= 1, item.id);
    assert.ok(item.steps.every((step) => !/重复所需|英寸/.test(step)), `${item.id} has an unedited dataset sentence`);
  }
});

test("catalogs are large enough to plan 30 varied days, with unique ids and traceable sources", () => {
  assert.ok(exerciseCatalog.length >= 40, `exercises: ${exerciseCatalog.length}`);
  assert.ok(foodCatalog.length >= 50, `foods: ${foodCatalog.length}`);
  assert.equal(new Set(exerciseCatalog.map((item) => item.id)).size, exerciseCatalog.length);
  assert.equal(new Set(foodCatalog.map((item) => item.id)).size, foodCatalog.length);
  const beginnerPatterns = new Set(exerciseCatalog.filter((item) => item.level === "beginner").map((item) => item.pattern));
  for (const pattern of ["squat", "lunge", "hinge", "bridge", "row", "pushup", "overhead", "crunch", "plank", "walk"]) assert.ok(beginnerPatterns.has(pattern as never), `beginner ${pattern}`);
  for (const item of exerciseCatalog) if (item.source.kind === "dataset") assert.match(item.source.datasetId, /^\d{4}$/);
  for (const food of foodCatalog) {
    assert.ok(food.kcalPer100g > 0 && food.kcalPer100g < 900, food.id);
    if (food.source.kind === "usda-sr-legacy") assert.ok(food.source.fdcId > 100000, food.id);
    else assert.equal(Math.round(food.source.energyKj / 4.184), food.kcalPer100g, food.id);
  }
  for (const category of ["staple", "protein", "dairy", "vegetable", "fruit", "fat"]) assert.ok(foodCatalog.filter((food) => food.category === category).length >= 4, category);
});

test("risk tiers: common discomfort and known allergens stay automatic, serious or unknown flags go to the coach", () => {
  const base = { riskFlags: [] as string[], injuryFlags: [] as string[], allergyFlags: [] as string[] };
  assert.equal(requiresManualReview(base), false);
  assert.equal(requiresManualReview({ ...base, injuryFlags: ["knee_discomfort", "wrist_discomfort"] }), false);
  assert.equal(requiresManualReview({ ...base, allergyFlags: ["peanut", "shellfish", "tree_nut"] }), false);
  for (const flag of ["acute_knee_pain", "acute_back_pain", "sprained_something"]) assert.equal(requiresManualReview({ ...base, injuryFlags: [flag] }), true, flag);
  for (const flag of ["minor", "pregnancy", "acute_pain", "chronic_disease", "eating_disorder", "pain", "anything"]) assert.equal(requiresManualReview({ ...base, riskFlags: [flag] }), true, flag);
  assert.equal(requiresManualReview({ ...base, allergyFlags: ["sesame"] }), true);
  assert.equal(requiresManualReview({ ...base, ageBand: "under_18" }), true);
  assert.equal(requiresManualReview({ ...base, ageBand: "25_34" }), false);
});
