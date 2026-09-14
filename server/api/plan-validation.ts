import { exerciseCatalog, exerciseCatalogById, foodCatalog } from "../../packages/catalogs/src/index";
import { PLAN_TIMEZONE, validatePlanPayload, type CatalogContext, type PlanPayload } from "../../packages/plan-schema/src/index";
import type { HealthProfile } from "./types";

export function catalogContext(profile: HealthProfile): CatalogContext {
  const injuryFlags = new Set(profile.injuryFlags);
  const allergyFlags = new Set(profile.allergyFlags);
  // "gym" means full equipment; otherwise a move is usable only if every tool it needs was declared.
  const equipment = new Set(profile.equipment);
  const hasEquipment = (tags: readonly string[]) => equipment.has("gym") || tags.every((tag) => equipment.has(tag));
  const blockedExerciseIds = new Set(exerciseCatalog.filter((item) => item.contraindications.some((flag) => injuryFlags.has(flag)) || !hasEquipment(item.equipmentTags)).map((item) => item.id));
  const blockedFoodIds = new Set(foodCatalog.filter((item) => item.allergens.some((flag) => allergyFlags.has(flag))).map((item) => item.id));
  return {
    exerciseIds: new Set(exerciseCatalog.map((item) => item.id)),
    foodKcalPer100g: new Map(foodCatalog.map((item) => [item.id, item.kcalPer100g])),
    blockedExerciseIds,
    blockedFoodIds,
  };
}

/**
 * The same validator is used for every local Codex CLI result before a draft
 * can enter the coach review state. Provider-specific parsing belongs in the
 * local CLI wrapper, never in the Worker.
 */
export function validateProviderPayload(profile: HealthProfile, parsed: unknown) {
  const result = validatePlanPayload(parsed, catalogContext(profile));
  if (!result.ok) return result;
  return { ...result, warnings: [...result.warnings, ...planQualityWarnings(profile, result.value, result.dailyKcal)] };
}

/** Daily energy band per kg of body weight; a planning heuristic for the coach, not a prescription. */
const KCAL_PER_KG: Record<HealthProfile["target"], [number, number]> = {
  fat_loss: [22, 28],
  general_fitness: [26, 32],
  muscle_gain: [30, 36],
};

export function energyBand(profile: HealthProfile): [number, number] {
  const [low, high] = KCAL_PER_KG[profile.target];
  return [Math.max(1200, Math.round(low * profile.weightKg)), Math.round(high * profile.weightKg)];
}

function exerciseSeconds(item: { catalogId: string; sets: number; reps: number; restSeconds: number }): number {
  const unit = exerciseCatalogById.get(item.catalogId)?.unit ?? "reps";
  const work = unit === "minutes" ? item.reps * 60 : unit === "seconds" ? item.reps : item.reps * 3;
  return item.sets * work + Math.max(0, item.sets - 1) * item.restSeconds;
}

const isRecovery = (day: PlanPayload["days"][number]) =>
  day.exercises.every((item) => ["walk", "stretch"].includes(exerciseCatalogById.get(item.catalogId)?.pattern ?? ""));

/**
 * Things a coach should look at before publishing. They never block a draft:
 * the coach decides, and the warnings travel with the draft to the review screen.
 */
export function planQualityWarnings(profile: HealthProfile, plan: PlanPayload, dailyKcal: Record<string, number>): string[] {
  const warnings: string[] = [];
  for (let week = 0; week * 7 < plan.days.length; week += 1) {
    const days = plan.days.slice(week * 7, week * 7 + 7);
    if (days.length < 7) break;
    const training = days.filter((day) => !isRecovery(day)).length;
    if (Math.abs(training - profile.sessionsPerWeek) > 1) warnings.push(`第 ${week + 1} 周安排了 ${training} 个训练日，客户说每周能练 ${profile.sessionsPerWeek} 次`);
  }
  const band = energyBand(profile);
  const outOfBand = plan.days.filter((day) => dailyKcal[day.localDate] < band[0] || dailyKcal[day.localDate] > band[1]);
  if (outOfBand.length) warnings.push(`${outOfBand.length} 天的饮食热量不在 ${band[0]}–${band[1]} kcal 的参考范围内（按体重和目标估算）`);
  const tooLong = plan.days.filter((day) => day.exercises.reduce((sum, item) => sum + exerciseSeconds(item), 0) / 60 + 5 > profile.minutesPerSession * 1.25);
  if (tooLong.length) warnings.push(`${tooLong.length} 天的训练预计超过客户每次 ${profile.minutesPerSession} 分钟的时间`);
  if (profile.trainingExperience === "beginner") {
    const advanced = new Set(plan.days.flatMap((day) => day.exercises).filter((item) => exerciseCatalogById.get(item.catalogId)?.level === "intermediate").map((item) => exerciseCatalogById.get(item.catalogId)?.name ?? item.catalogId));
    if (advanced.size) warnings.push(`新手客户的计划里有进阶动作：${[...advanced].join("、")}`);
  }
  return warnings;
}

export const planGenerationContract = {
  schemaVersion: "plan.v1",
  timezone: PLAN_TIMEZONE,
  provider: "codex_cli",
  reviewRequired: true,
} as const;

/** Moves and foods this client's plan may use, filtered by the same rules the validator enforces. */
export function allowedCatalog(profile: HealthProfile) {
  const context = catalogContext(profile);
  return {
    exercises: exerciseCatalog.filter((item) => !context.blockedExerciseIds?.has(item.id)).map((item) => ({ id: item.id, name: item.name, pattern: item.pattern, level: item.level, unit: item.unit, equipment: item.equipment, target: item.target })),
    foods: foodCatalog.filter((item) => !context.blockedFoodIds?.has(item.id)).map((item) => ({ id: item.id, name: item.name, category: item.category, kcalPer100g: item.kcalPer100g, unit: item.unit })),
  };
}

const MEAL_NAMES: Record<string, string> = { breakfast: "早餐", lunch: "午餐", snack: "加餐", dinner: "晚餐" };

/** Validator errors in words a coach can act on; anything unrecognised keeps its raw text. */
export function explainPlanErrors(errors: string[], payload: unknown): string[] {
  const days = (payload && typeof payload === "object" && Array.isArray((payload as PlanPayload).days) ? (payload as PlanPayload).days : []) as Array<Partial<PlanPayload["days"][number]>>;
  const messages = errors.map((raw) => {
    const match = raw.match(/^days\[(\d+)\](?:\.exercises\[(\d+)\])?(?:\.meals\[(\d+)\](?:\.foods\[(\d+)\])?)?(?:\.(\w+))?: (.*)$/);
    if (!match) return raw.startsWith("days: missing") ? "30 天的日期不完整" : `计划格式有问题（${raw}）`;
    const [, dayAt, exerciseAt, mealAt, foodAt, field, message] = match;
    const day = days[Number(dayAt)];
    const where = `第 ${day?.dayIndex ?? Number(dayAt) + 1} 天`;
    if (exerciseAt !== undefined) {
      const move = day?.exercises?.[Number(exerciseAt)];
      const name = exerciseCatalogById.get(String(move?.catalogId))?.name ?? "这个动作";
      if (message.startsWith("blocked")) return `${where}「${name}」不适合这位客户（身体情况或器械）`;
      if (field === "sets") return `${where}「${name}」组数要在 1–10 之间`;
      if (field === "reps") return `${where}「${name}」次数或时长要在 1–100 之间`;
      if (field === "restSeconds") return `${where}「${name}」组间休息要在 0–600 秒之间`;
      return `${where}「${name}」填写不完整`;
    }
    if (mealAt !== undefined) {
      const meal = day?.meals?.[Number(mealAt)];
      const mealName = MEAL_NAMES[String(meal?.mealType)] ?? "这一餐";
      if (foodAt !== undefined) {
        const food = foodCatalog.find((item) => item.id === meal?.foods?.[Number(foodAt)]?.foodCatalogId);
        const name = food?.name ?? "这样食物";
        if (message.startsWith("blocked")) return `${where}${mealName}「${name}」客户过敏或不能吃`;
        if (field === "grams") return `${where}${mealName}「${name}」克数要在 1–2000 之间`;
        return `${where}${mealName}「${name}」填写不完整`;
      }
      if (field === "foods") return `${where}${mealName}至少要有一样食物`;
      return `${where}${mealName}填写不完整`;
    }
    if (message.includes("below safe")) return `${where}饮食总热量低于 800 kcal`;
    if (message.includes("exceeds safe")) return `${where}饮食总热量超过 5000 kcal`;
    if (field === "title") return `${where}标题不能超过 80 个字`;
    if (field === "reminders") return `${where}每条提醒不能超过 160 个字`;
    return `${where}填写不完整`;
  });
  return [...new Set(messages)];
}
