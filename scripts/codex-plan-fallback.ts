#!/usr/bin/env node
/**
 * Explicit coach-operated fallback. This never runs from the Worker and never
 * reads local secret files. The input must come from the authenticated
 * /codex-input endpoint and is already de-identified by the API.
 */
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { exerciseCatalog, foodCatalog } from "../packages/catalogs/src/index";
import { validateProviderPayload } from "../server/api/deepseek";
import type { HealthProfile } from "../server/api/types";

const execFileAsync = promisify(execFile);

type Input = { job: { id: string; startDate: string; schemaVersion: string }; profile: HealthProfile };

function arg(name: string): string | null {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] ?? null : null;
}

function usage(): never {
  throw new Error("Usage: npm run codex:fallback -- --input codex-input.json --output plan.json [--post-url URL --token TOKEN]");
}

function prompt(input: Input): string {
  return [
    "You are a local drafting assistant for a human fitness coach.",
    "Return JSON only, with no markdown and no commentary.",
    "Create exactly 30 consecutive days in the plan.v1 schema, using only the supplied catalog IDs.",
    "Never diagnose, prescribe medication, promise treatment, invent calories, or add unknown keys.",
    JSON.stringify({
      schemaVersion: input.job.schemaVersion,
      startDate: input.job.startDate,
      profile: input.profile,
      exercises: exerciseCatalog,
      foods: foodCatalog,
    }),
  ].join("\n");
}

async function main(): Promise<void> {
  const inputPath = arg("--input"); const outputPath = arg("--output");
  if (!inputPath || !outputPath) usage();
  const input = JSON.parse(await readFile(inputPath!, "utf8")) as Input;
  const tempDir = await mkdtemp(join(tmpdir(), "fit-plan-codex-"));
  const responsePath = join(tempDir, "response.txt");
  try {
    await execFileAsync("codex", ["exec", "--ephemeral", "--sandbox", "read-only", "--output-last-message", responsePath, prompt(input)], { timeout: 90_000, maxBuffer: 2_000_000 });
    const raw = (await readFile(responsePath, "utf8")).trim();
    let parsed: unknown;
    try { parsed = JSON.parse(raw); } catch { throw new Error("Codex returned non-JSON output; nothing was uploaded"); }
    const validation = validateProviderPayload(input.profile, parsed);
    if (!validation.ok) throw new Error(`Codex plan failed safety validation: ${validation.errors.slice(0, 5).join("; ")}`);
    await writeFile(outputPath!, JSON.stringify(validation.value, null, 2), { mode: 0o600 });
    const postUrl = arg("--post-url"); const token = arg("--token");
    if (postUrl || token) {
      if (!postUrl || !token) throw new Error("--post-url and --token must be supplied together");
      const response = await fetch(postUrl, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token, payload: validation.value }) });
      if (!response.ok) throw new Error(`Fallback upload failed with HTTP ${response.status}`);
      console.log(`Validated fallback uploaded for job ${input.job.id}`);
    } else {
      console.log(`Validated fallback written to ${outputPath}`);
    }
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "Codex fallback failed"); process.exitCode = 1; });
