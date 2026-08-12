export const PLAN_SCHEMA_VERSION = "plan.v1" as const;
export const PLAN_TIMEZONE = "Asia/Shanghai" as const;

export type CatalogExercise = {
  catalogId: string;
  sets: number;
  reps: number;
  restSeconds: number;
  cues?: string[];
};

export type CatalogFood = {
  foodCatalogId: string;
  grams: number;
};

export type PlanMeal = {
  mealType: "breakfast" | "lunch" | "snack" | "dinner";
  foods: CatalogFood[];
  note?: string;
};

export type PlanDay = {
  dayIndex: number;
  localDate: string;
  title: string;
  exercises: CatalogExercise[];
  meals: PlanMeal[];
  reminders: string[];
};

export type PlanPayload = {
  schemaVersion: typeof PLAN_SCHEMA_VERSION;
  timezone: typeof PLAN_TIMEZONE;
  startDate: string;
  days: PlanDay[];
};

export type PlanVersion = {
  versionNo: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  payload: PlanPayload;
};

export type CatalogContext = {
  exerciseIds: Set<string>;
  foodKcalPer100g: Map<string, number>;
  blockedExerciseIds?: Set<string>;
  blockedFoodIds?: Set<string>;
};

export type ValidationResult =
  | { ok: true; value: PlanPayload; warnings: string[]; dailyKcal: Record<string, number> }
  | { ok: false; errors: string[]; warnings: string[] };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ALLOWED_KEYS = new Set(["schemaVersion", "timezone", "startDate", "days"]);
const DAY_KEYS = new Set(["dayIndex", "localDate", "title", "exercises", "meals", "reminders"]);
const EXERCISE_KEYS = new Set(["catalogId", "sets", "reps", "restSeconds", "cues"]);
const MEAL_KEYS = new Set(["mealType", "foods", "note"]);
const FOOD_KEYS = new Set(["foodCatalogId", "grams"]);
const MEAL_TYPES = new Set(["breakfast", "lunch", "snack", "dinner"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, keys: Set<string>, path: string, errors: string[]): void {
  for (const key of Object.keys(value)) if (!keys.has(key)) errors.push(`${path}.${key}: unknown key`);
}

function isValidDate(value: unknown): value is string {
  if (typeof value !== "string" || !DATE_RE.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return Number.isFinite(date.getTime()) && date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function numberInRange(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}

export function calculateFoodKcal(foodCatalogId: string, grams: number, catalog: CatalogContext): number {
  const kcalPer100g = catalog.foodKcalPer100g.get(foodCatalogId);
  if (kcalPer100g === undefined) throw new Error(`unknown food catalog id: ${foodCatalogId}`);
  return Math.round((kcalPer100g * grams) / 100);
}

export function validatePlanPayload(input: unknown, catalog: CatalogContext): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!isRecord(input)) return { ok: false, errors: ["root: object required"], warnings };
  hasOnlyKeys(input, ALLOWED_KEYS, "root", errors);
  if (input.schemaVersion !== PLAN_SCHEMA_VERSION) errors.push("schemaVersion: unsupported");
  if (input.timezone !== PLAN_TIMEZONE) errors.push("timezone: must be Asia/Shanghai");
  if (!isValidDate(input.startDate)) errors.push("startDate: invalid YYYY-MM-DD");
  if (!Array.isArray(input.days) || input.days.length !== 30) errors.push("days: exactly 30 days required");
  const days = Array.isArray(input.days) ? input.days : [];
  const seenDates = new Set<string>();
  const seenIndexes = new Set<number>();
  const normalizedDays: PlanDay[] = [];
  const dailyKcal: Record<string, number> = {};

  days.forEach((rawDay, dayPosition) => {
    const path = `days[${dayPosition}]`;
    if (!isRecord(rawDay)) {
      errors.push(`${path}: object required`);
      return;
    }
    hasOnlyKeys(rawDay, DAY_KEYS, path, errors);
    const dayIndex = rawDay.dayIndex;
    const localDate = rawDay.localDate;
    if (!numberInRange(dayIndex, 1, 30) || !Number.isInteger(dayIndex)) errors.push(`${path}.dayIndex: must be integer 1..30`);
    if (typeof dayIndex === "number" && seenIndexes.has(dayIndex)) errors.push(`${path}.dayIndex: duplicate`);
    if (typeof dayIndex === "number") seenIndexes.add(dayIndex);
    if (!isValidDate(localDate)) errors.push(`${path}.localDate: invalid`);
    if (typeof localDate === "string" && seenDates.has(localDate)) errors.push(`${path}.localDate: duplicate`);
    if (typeof localDate === "string") seenDates.add(localDate);
    if (typeof rawDay.title !== "string" || rawDay.title.length > 80) errors.push(`${path}.title: short text required`);
    if (!Array.isArray(rawDay.exercises)) errors.push(`${path}.exercises: array required`);
    if (!Array.isArray(rawDay.meals)) errors.push(`${path}.meals: array required`);
    if (!Array.isArray(rawDay.reminders) || rawDay.reminders.some((item) => typeof item !== "string" || item.length > 160)) errors.push(`${path}.reminders: short strings required`);
    const exercises: CatalogExercise[] = [];
    const meals: PlanMeal[] = [];
    const dayKcal = { value: 0 };
    (Array.isArray(rawDay.exercises) ? rawDay.exercises : []).forEach((rawExercise, exercisePosition) => {
      const exercisePath = `${path}.exercises[${exercisePosition}]`;
      if (!isRecord(rawExercise)) { errors.push(`${exercisePath}: object required`); return; }
      hasOnlyKeys(rawExercise, EXERCISE_KEYS, exercisePath, errors);
      if (typeof rawExercise.catalogId !== "string" || !catalog.exerciseIds.has(rawExercise.catalogId)) errors.push(`${exercisePath}.catalogId: unknown catalog id`);
      if (catalog.blockedExerciseIds?.has(String(rawExercise.catalogId))) errors.push(`${exercisePath}.catalogId: blocked by profile contraindication`);
      if (!numberInRange(rawExercise.sets, 1, 10) || !Number.isInteger(rawExercise.sets)) errors.push(`${exercisePath}.sets: integer 1..10 required`);
      if (!numberInRange(rawExercise.reps, 1, 100) || !Number.isInteger(rawExercise.reps)) errors.push(`${exercisePath}.reps: integer 1..100 required`);
      if (!numberInRange(rawExercise.restSeconds, 0, 600) || !Number.isInteger(rawExercise.restSeconds)) errors.push(`${exercisePath}.restSeconds: integer 0..600 required`);
      if (rawExercise.cues !== undefined && (!Array.isArray(rawExercise.cues) || rawExercise.cues.some((item) => typeof item !== "string"))) errors.push(`${exercisePath}.cues: strings required`);
      if (typeof rawExercise.catalogId === "string" && typeof rawExercise.sets === "number" && typeof rawExercise.reps === "number" && typeof rawExercise.restSeconds === "number") exercises.push({ catalogId: rawExercise.catalogId, sets: rawExercise.sets, reps: rawExercise.reps, restSeconds: rawExercise.restSeconds, cues: Array.isArray(rawExercise.cues) ? rawExercise.cues as string[] : undefined });
    });
    (Array.isArray(rawDay.meals) ? rawDay.meals : []).forEach((rawMeal, mealPosition) => {
      const mealPath = `${path}.meals[${mealPosition}]`;
      if (!isRecord(rawMeal)) { errors.push(`${mealPath}: object required`); return; }
      hasOnlyKeys(rawMeal, MEAL_KEYS, mealPath, errors);
      if (typeof rawMeal.mealType !== "string" || !MEAL_TYPES.has(rawMeal.mealType)) errors.push(`${mealPath}.mealType: unsupported`);
      if (!Array.isArray(rawMeal.foods) || rawMeal.foods.length < 1) errors.push(`${mealPath}.foods: at least one food required`);
      if (rawMeal.note !== undefined && typeof rawMeal.note !== "string") errors.push(`${mealPath}.note: string required`);
      const foods: CatalogFood[] = [];
      (Array.isArray(rawMeal.foods) ? rawMeal.foods : []).forEach((rawFood, foodPosition) => {
        const foodPath = `${mealPath}.foods[${foodPosition}]`;
        if (!isRecord(rawFood)) { errors.push(`${foodPath}: object required`); return; }
        hasOnlyKeys(rawFood, FOOD_KEYS, foodPath, errors);
        if (typeof rawFood.foodCatalogId !== "string" || !catalog.foodKcalPer100g.has(rawFood.foodCatalogId)) errors.push(`${foodPath}.foodCatalogId: unknown catalog id`);
        if (catalog.blockedFoodIds?.has(String(rawFood.foodCatalogId))) errors.push(`${foodPath}.foodCatalogId: blocked by profile allergy/dietary restriction`);
        if (!numberInRange(rawFood.grams, 1, 2000)) errors.push(`${foodPath}.grams: number 1..2000 required`);
        if (typeof rawFood.foodCatalogId === "string" && typeof rawFood.grams === "number") {
          foods.push({ foodCatalogId: rawFood.foodCatalogId, grams: rawFood.grams });
          try { dayKcal.value += calculateFoodKcal(rawFood.foodCatalogId, rawFood.grams, catalog); } catch { /* already reported */ }
        }
      });
      if (typeof rawMeal.mealType === "string" && MEAL_TYPES.has(rawMeal.mealType) && foods.length) meals.push({ mealType: rawMeal.mealType as PlanMeal["mealType"], foods, note: typeof rawMeal.note === "string" ? rawMeal.note : undefined });
    });
    if (dayKcal.value < 800) errors.push(`${path}: daily kcal is below safe demo bound`);
    if (dayKcal.value > 5000) errors.push(`${path}: daily kcal exceeds safe demo bound`);
    if (typeof localDate === "string") dailyKcal[localDate] = dayKcal.value;
    if (typeof dayIndex === "number" && typeof localDate === "string" && typeof rawDay.title === "string") normalizedDays.push({ dayIndex, localDate, title: rawDay.title, exercises, meals, reminders: Array.isArray(rawDay.reminders) ? rawDay.reminders as string[] : [] });
  });

  if (typeof input.startDate === "string" && isValidDate(input.startDate)) {
    for (let index = 0; index < 30; index += 1) {
      const expected = addDays(input.startDate, index);
      if (!seenDates.has(expected)) errors.push(`days: missing local date ${expected}`);
    }
  }
  if (seenIndexes.size !== 30) errors.push("days: dayIndex values must cover 1..30 exactly");
  if (errors.length) return { ok: false, errors, warnings };
  normalizedDays.sort((a, b) => a.dayIndex - b.dayIndex);
  return { ok: true, value: { schemaVersion: PLAN_SCHEMA_VERSION, timezone: PLAN_TIMEZONE, startDate: input.startDate as string, days: normalizedDays }, warnings, dailyKcal };
}

export const planJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["schemaVersion", "timezone", "startDate", "days"],
  properties: {
    schemaVersion: { const: PLAN_SCHEMA_VERSION },
    timezone: { const: PLAN_TIMEZONE },
    startDate: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
    days: { type: "array", minItems: 30, maxItems: 30 },
  },
} as const;
