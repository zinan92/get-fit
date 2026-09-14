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
