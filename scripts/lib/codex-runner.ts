/**
 * Local Codex CLI drafting for the operator. Nothing here runs in the cloud
 * function; input is the de-identified profile the API hands out.
 */
import { spawn } from "node:child_process";
import { exerciseCatalog, foodCatalog } from "../../packages/catalogs/src/index";
import { catalogContext, energyBand } from "../../server/api/plan-validation";
import type { HealthProfile } from "../../server/api/types";

export type CodexInput = { job: { id: string; startDate: string; schemaVersion: string }; profile: HealthProfile };

// A 30-day JSON plan is a large structured response; allow the local CLI
// enough time to finish while still providing a hard upper bound.
const CODEX_TIMEOUT_MS = Number(process.env.CODEX_TIMEOUT_MS ?? 600_000);
const CODEX_OUTPUT_LIMIT = 2_000_000;

export function planPrompt(input: CodexInput): string {
  const { profile } = input;
  // Only moves and foods this client may have: contraindications, allergens and equipment are already applied.
  const context = catalogContext(profile);
  const exercises = exerciseCatalog
    .filter((item) => !context.blockedExerciseIds?.has(item.id))
    .filter((item) => profile.trainingExperience !== "beginner" || item.level === "beginner")
    .map(({ id, name, pattern, level, target, unit }) => ({ id, name, pattern, level, target, unit }));
  const foods = foodCatalog
    .filter((item) => !context.blockedFoodIds?.has(item.id))
    .map(({ id, name, category, kcalPer100g, unit }) => ({ id, name, category, kcalPer100g, unit }));
  const [low, high] = energyBand(profile);
  const example = {
    schemaVersion: input.job.schemaVersion, timezone: "Asia/Shanghai", startDate: input.job.startDate,
    days: [{ dayIndex: 1, localDate: input.job.startDate, title: "下肢力量日", exercises: [{ catalogId: "ex-goblet-squat", sets: 3, reps: 12, restSeconds: 60, cues: [] }], meals: [{ mealType: "breakfast", foods: [{ foodCatalogId: "food-oats", grams: 50 }] }], reminders: ["一句教练口吻的提醒"] }],
  };
  return [
    "You are drafting a 30-day training and meal plan for a human fitness coach, who will review every day before the client sees it.",
    "Return JSON only, with no markdown and no commentary, exactly in the shape of EXAMPLE, with 30 consecutive days starting at startDate.",
    "Use only ids from EXERCISES and FOODS. Never diagnose, prescribe medication, promise treatment, or add keys that are not in EXAMPLE.",
    "Programming rules:",
    `- ${profile.sessionsPerWeek} training days in every 7-day block, spread out (avoid back-to-back when possible). Other days are recovery days with ex-walk (unit minutes: sets 1, reps = minutes) and optionally one stretch.`,
    `- Each training day: 3–5 moves covering lower body, upper body push or pull, and core, rotating themes across the week. Keep the estimated time (reps ≈ 3 s each, unit seconds = reps seconds, plus rest) within ${profile.minutesPerSession} minutes.`,
    "- Sets 2–4, reps 8–15 for strength moves, restSeconds 30–90. For unit seconds, reps is the hold or work time (20–45). Progress gently in weeks 3–4 (one more set or a few more reps), never a new difficulty level.",
    `- Meals: breakfast, lunch, dinner, and a snack when it helps. Each day between ${low} and ${high} kcal (kcal = kcalPer100g × grams / 100). Put a protein food in every main meal, vegetables at lunch and dinner. Realistic edible portions, grams in multiples of 5.`,
    "- Vary foods: do not repeat the same lunch or dinner on consecutive days.",
    "- title is a short Chinese theme for the day; reminders is one short, warm Chinese sentence in a coach's voice.",
    "EXAMPLE:", JSON.stringify(example),
    "PROFILE:", JSON.stringify(profile),
    "EXERCISES:", JSON.stringify(exercises),
    "FOODS:", JSON.stringify(foods),
  ].join("\n");
}

export function runCodex(promptText: string, responsePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn("codex", [
      "exec", "--ephemeral", "--sandbox", "read-only", "--skip-git-repo-check",
      "--ignore-user-config", "--ignore-rules", "--disable", "skill_search",
      "--color", "never", "--output-last-message", responsePath, "-",
    ], { stdio: ["pipe", "pipe", "pipe"] });
    let settled = false;
    let outputBytes = 0;
    let errorText = "";
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) reject(error); else resolve();
    };
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      setTimeout(() => child.kill("SIGKILL"), 2_000);
      finish(new Error("Codex CLI timed out"));
    }, CODEX_TIMEOUT_MS);
    const capture = (chunk: Buffer) => {
      outputBytes += chunk.byteLength;
      if (outputBytes > CODEX_OUTPUT_LIMIT) {
        child.kill("SIGTERM");
        finish(new Error("Codex CLI output exceeded the safety limit"));
      }
    };
    child.stdout.on("data", capture);
    child.stderr.on("data", (chunk: Buffer) => {
      if (errorText.length < 2_000) errorText += chunk.toString("utf8");
      capture(chunk);
    });
    child.on("error", (error) => finish(error));
    child.on("close", (code, signal) => {
      if (settled) return;
      if (code === 0) return finish();
      const suffix = errorText.trim() ? `: ${errorText.trim().slice(0, 300)}` : "";
      finish(new Error(`Codex CLI failed${signal ? ` (${signal})` : ` (exit ${code ?? "unknown"})`}${suffix}`));
    });
    child.stdin.end(promptText);
  });
}

