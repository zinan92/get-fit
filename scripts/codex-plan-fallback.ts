#!/usr/bin/env node
/**
 * Explicit coach-operated plan generator. This never runs from the Worker and
 * never reads local secret files. The input must come from the authenticated
 * /codex-input endpoint and is already de-identified by the API.
 */
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { exerciseCatalog, foodCatalog } from "../packages/catalogs/src/index";
import { validateProviderPayload } from "../server/api/plan-validation";
import type { HealthProfile } from "../server/api/types";

type Input = { job: { id: string; startDate: string; schemaVersion: string }; profile: HealthProfile };

// A 30-day JSON plan is a large structured response; allow the local CLI
// enough time to finish while still providing a hard upper bound.
const CODEX_TIMEOUT_MS = 180_000;
const CODEX_OUTPUT_LIMIT = 2_000_000;

function arg(name: string): string | null {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] ?? null : null;
}

function usage(): never {
  throw new Error("Usage: npm run codex:plan -- --input codex-input.json --output plan.json [--post-url URL --token TOKEN]");
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

function runCodex(promptText: string, responsePath: string): Promise<void> {
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

async function main(): Promise<void> {
  const inputPath = arg("--input"); const outputPath = arg("--output");
  if (!inputPath || !outputPath) usage();
  const input = JSON.parse(await readFile(inputPath!, "utf8")) as Input;
  const tempDir = await mkdtemp(join(tmpdir(), "fit-plan-codex-"));
  const responsePath = join(tempDir, "response.txt");
  try {
    await runCodex(prompt(input), responsePath);
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

main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "Codex plan failed"); process.exitCode = 1; });
