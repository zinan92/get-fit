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
  if (result.ok) assert.equal(result.dailyKcal["2026-08-12"], 1311);
  assert.equal(calculateFoodKcal("food-egg", 100, catalog), 143);
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
