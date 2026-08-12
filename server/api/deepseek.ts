import { exerciseCatalog, foodCatalog } from "../../packages/catalogs/src/index";
import { PLAN_TIMEZONE, validatePlanPayload, type CatalogContext, type PlanPayload } from "../../packages/plan-schema/src/index";
import { sha256 } from "./store";
import type { ApiEnv, HealthProfile } from "./types";

export type ProviderResult =
  | { ok: true; payload: PlanPayload; outputHash: string; model: string; traceId: string; warnings: string[] }
  | { ok: false; code: string; message: string; traceId: string };

export function catalogContext(profile: HealthProfile): CatalogContext {
  const injuryFlags = new Set(profile.injuryFlags);
  const allergyFlags = new Set(profile.allergyFlags);
  const blockedExerciseIds = new Set(exerciseCatalog.filter((item) => item.contraindications.some((flag) => injuryFlags.has(flag))).map((item) => item.id));
  const blockedFoodIds = new Set(foodCatalog.filter((item) => item.allergens.some((flag) => allergyFlags.has(flag))).map((item) => item.id));
  return {
    exerciseIds: new Set(exerciseCatalog.map((item) => item.id)),
    foodKcalPer100g: new Map(foodCatalog.map((item) => [item.id, item.kcalPer100g])),
    blockedExerciseIds,
    blockedFoodIds,
  };
}

export function validateProviderPayload(profile: HealthProfile, parsed: unknown) {
  return validatePlanPayload(parsed, catalogContext(profile));
}

function providerInput(profile: HealthProfile): Record<string, unknown> {
  return {
    target: profile.target,
    age_band: profile.ageBand,
    height_cm: profile.heightCm,
    weight_kg: profile.weightKg,
    training_experience: profile.trainingExperience,
    sessions_per_week: profile.sessionsPerWeek,
    minutes_per_session: profile.minutesPerSession,
    equipment: profile.equipment,
    injury_flags: profile.injuryFlags,
    allergy_flags: profile.allergyFlags,
    dietary_preferences: profile.dietaryPreferences,
    timezone: PLAN_TIMEZONE,
    available_exercise_catalog: exerciseCatalog.map(({ id, name, contraindications, cues }) => ({ id, name, contraindications, cues })),
    available_food_catalog: foodCatalog.map(({ id, name, kcalPer100g, unit, allergens }) => ({ id, name, kcal_per_100g: kcalPer100g, unit, allergens })),
  };
}

function systemPrompt(): string {
  return `You are a fitness planning assistant supporting a human coach. Output JSON only. The JSON must match plan.v1 exactly: {"schemaVersion":"plan.v1","timezone":"Asia/Shanghai","startDate":"YYYY-MM-DD","days":[...]} with exactly 30 consecutive days. Each day must use only provided catalog IDs. Never invent food calories; the server calculates calories. Do not provide diagnosis, medication, treatment, or promises. If a requested profile is unsafe, return a conservative plan using allowed catalog items and reminders for coach review. Include the word JSON in this response by following the requested JSON format.`;
}

export async function generateWithDeepSeek(env: ApiEnv, profile: HealthProfile, startDate: string, traceId: string): Promise<ProviderResult> {
  const apiKey = env.DEEPSEEK_API_KEY;
  const apiUrl = env.DEEPSEEK_API_URL ?? "https://api.deepseek.com/chat/completions";
  const model = env.DEEPSEEK_MODEL ?? "deepseek-v4-flash";
  if (!apiKey) return { ok: false, code: "PROVIDER_UNCONFIGURED", message: "DeepSeek is not configured", traceId };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45_000);
  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      signal: controller.signal,
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt() },
          { role: "user", content: JSON.stringify({ start_date: startDate, profile: providerInput(profile) }) },
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
        max_tokens: 16_000,
      }),
    });
    if (!response.ok) return { ok: false, code: response.status === 429 ? "PROVIDER_RATE_LIMITED" : `PROVIDER_HTTP_${response.status}`, message: "DeepSeek request failed", traceId };
    const envelope = await response.json() as { choices?: Array<{ message?: { content?: string | null } }> };
    const content = envelope.choices?.[0]?.message?.content;
    if (!content) return { ok: false, code: "PROVIDER_EMPTY", message: "DeepSeek returned empty content", traceId };
    let parsed: unknown;
    try { parsed = JSON.parse(content); } catch { return { ok: false, code: "PROVIDER_INVALID_JSON", message: "DeepSeek returned invalid JSON", traceId }; }
    const validated = validateProviderPayload(profile, parsed);
    if (!validated.ok) return { ok: false, code: "VALIDATION_FAILED", message: validated.errors.slice(0, 5).join("; "), traceId };
    return { ok: true, payload: validated.value, outputHash: await sha256(JSON.stringify(validated.value)), model, traceId, warnings: validated.warnings };
  } catch (caught) {
    const message = caught instanceof DOMException && caught.name === "AbortError" ? "DeepSeek request timed out" : "DeepSeek request failed";
    return { ok: false, code: caught instanceof DOMException && caught.name === "AbortError" ? "PROVIDER_TIMEOUT" : "PROVIDER_NETWORK_ERROR", message, traceId };
  } finally {
    clearTimeout(timer);
  }
}
