import { exerciseCatalog, foodCatalog } from "../../packages/catalogs/src/index";
import { PLAN_TIMEZONE, validatePlanPayload, type CatalogContext } from "../../packages/plan-schema/src/index";
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
  return validatePlanPayload(parsed, catalogContext(profile));
}

export const planGenerationContract = {
  schemaVersion: "plan.v1",
  timezone: PLAN_TIMEZONE,
  provider: "codex_cli",
  reviewRequired: true,
} as const;
