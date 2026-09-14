#!/usr/bin/env node
/**
 * Operator drafting tool. Runs on the operator's machine, talks to the deployed
 * `api` cloud function through the CloudBase CLI, and never stores health data:
 *
 *   npm run operator -- list
 *   npm run operator -- run <jobId>                 # draft with the local Codex CLI
 *   npm run operator -- run <jobId> --plan-file p.json   # import a plan written by hand
 *
 * Needs `tcb login`, QINGLIAN_ENV_ID, and the operator key in OPERATOR_KEY or
 * ~/.config/qinglian/operator-key (chmod 600). The cloud function stores only
 * the key's SHA-256 (OPERATOR_KEY_SHA256).
 */
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { validateProviderPayload } from "../server/api/plan-validation";
import { planPrompt, runCodex, type CodexInput } from "./lib/codex-runner";

export type OperatorEvent = { path: string; method: string; body?: unknown };
export type OperatorResponse = { statusCode: number; body: Record<string, unknown> };
export type Transport = (event: OperatorEvent) => Promise<OperatorResponse>;
export type Drafter = (input: CodexInput) => Promise<unknown>;

export class OperatorError extends Error {}

async function expectOk(transport: Transport, event: OperatorEvent): Promise<Record<string, unknown>> {
  const response = await transport(event);
  if (response.statusCode >= 300) {
    const detail = response.body?.error as { code?: string; message?: string; details?: unknown } | undefined;
    throw new OperatorError(`${event.method} ${event.path} → ${response.statusCode} ${detail?.code ?? ""} ${detail?.details ? JSON.stringify(detail.details) : detail?.message ?? ""}`.trim());
  }
  return response.body;
}

export async function listJobs(transport: Transport) {
  const body = await expectOk(transport, { path: "/api/operator/jobs", method: "GET" });
  return body.jobs as Array<{ id: string; status: string; startDate: string; createdAt: string }>;
}

/**
 * Drafts one job: fetch the de-identified input, draft, validate locally with the
 * same validator the server uses, then import with a one-time token. A draft that
 * fails validation is never uploaded.
 */
export async function draftJob(transport: Transport, jobId: string, drafter: Drafter) {
  const input = await expectOk(transport, { path: `/api/operator/jobs/${jobId}/input`, method: "GET" }) as unknown as CodexInput;
  const payload = await drafter(input);
  const local = validateProviderPayload(input.profile, payload);
  if (!local.ok) throw new OperatorError(`draft failed validation, nothing uploaded: ${local.errors.slice(0, 5).join("; ")}`);
  const token = await expectOk(transport, { path: `/api/operator/jobs/${jobId}/import-token`, method: "POST" });
  const imported = await expectOk(transport, { path: "/api/codex-fallback/import", method: "POST", body: { token: token.token, payload: local.value } });
  const draft = imported.draft as { id: string; validation: { warnings: string[] } };
  return { draftId: draft.id, warnings: draft.validation.warnings };
}

export const codexDrafter: Drafter = async (input) => {
  const dir = await mkdtemp(join(tmpdir(), "qinglian-draft-"));
  try {
    const responsePath = join(dir, "response.txt");
    await runCodex(planPrompt(input), responsePath);
    const raw = (await readFile(responsePath, "utf8")).trim().replace(/^```(?:json)?\s*|\s*```$/g, "");
    try { return JSON.parse(raw); } catch { throw new OperatorError("Codex returned something that is not JSON; nothing uploaded"); }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
};

/** Invokes the deployed function with `tcb fn invoke`; the event (with the operator key) goes in a private temp file, never on the command line. */
export function tcbTransport(envId: string, operatorKey: string): Transport {
  return async (event) => {
    const dir = await mkdtemp(join(tmpdir(), "qinglian-invoke-"));
    const eventFile = join(dir, "event.json");
    await writeFile(eventFile, JSON.stringify({ ...event, operatorKey }), { mode: 0o600 });
    try {
      return await new Promise<OperatorResponse>((resolve, reject) => {
        const child = spawn("tcb", ["fn", "invoke", "api", "-e", envId, "--json", "-d", `@${eventFile}`], { stdio: ["ignore", "pipe", "pipe"] });
        let out = "";
        let err = "";
        child.stdout.on("data", (chunk: Buffer) => { out += chunk.toString("utf8"); });
        child.stderr.on("data", (chunk: Buffer) => { err += chunk.toString("utf8"); });
        child.on("error", reject);
        child.on("close", (code) => {
          if (code !== 0) return reject(new OperatorError(`tcb fn invoke failed (exit ${code}): ${err.trim().slice(0, 300)}`));
          const result = parseInvokeOutput(out);
          if (!result) return reject(new OperatorError(`could not read the function result: ${out.trim().slice(0, 300)}`));
          resolve(result);
        });
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  };
}

/** `tcb fn invoke --json` wraps the function's return value; accept the result wherever it sits. */
export function parseInvokeOutput(output: string): OperatorResponse | null {
  const candidates: unknown[] = [];
  try { candidates.push(JSON.parse(output)); } catch { /* not a single JSON document */ }
  for (const match of output.matchAll(/\{[\s\S]*\}/g)) { try { candidates.push(JSON.parse(match[0])); } catch { /* keep looking */ } }
  const visit = (value: unknown, depth = 0): OperatorResponse | null => {
    if (!value || typeof value !== "object" || depth > 5) return null;
    const record = value as Record<string, unknown>;
    if (typeof record.statusCode === "number" && record.body && typeof record.body === "object") return record as OperatorResponse;
    for (const key of ["RetMsg", "retMsg", "result", "Result", "data"]) {
      const inner = record[key];
      if (typeof inner === "string") { try { const found = visit(JSON.parse(inner), depth + 1); if (found) return found; } catch { /* not JSON */ } }
      else { const found = visit(inner, depth + 1); if (found) return found; }
    }
    return null;
  };
  for (const candidate of candidates) { const found = visit(candidate); if (found) return found; }
  return null;
}

async function operatorKey(): Promise<string> {
  if (process.env.OPERATOR_KEY) return process.env.OPERATOR_KEY.trim();
  const file = join(homedir(), ".config", "qinglian", "operator-key");
  const info = await stat(file).catch(() => null);
  if (!info) throw new OperatorError(`no operator key: set OPERATOR_KEY or create ${file}`);
  if ((info.mode & 0o077) !== 0) throw new OperatorError(`${file} must not be readable by others (chmod 600)`);
  return (await readFile(file, "utf8")).trim();
}

async function main() {
  const [command, jobId] = process.argv.slice(2).filter((value) => !value.startsWith("--"));
  const envId = process.env.QINGLIAN_ENV_ID;
  if (!envId) throw new OperatorError("set QINGLIAN_ENV_ID to the CloudBase environment id");
  const transport = tcbTransport(envId, await operatorKey());
  if (command === "list") {
    const jobs = await listJobs(transport);
    if (!jobs.length) { console.log("no plans waiting"); return; }
    for (const job of jobs) console.log(`${job.id}  ${job.status}  starts ${job.startDate}  requested ${job.createdAt}`);
    return;
  }
  if (command === "run" && jobId) {
    const planFileIndex = process.argv.indexOf("--plan-file");
    const drafter: Drafter = planFileIndex > 0 ? async () => JSON.parse(await readFile(process.argv[planFileIndex + 1], "utf8")) : codexDrafter;
    const result = await draftJob(transport, jobId, drafter);
    console.log(`draft ${result.draftId} is ready for the coach to review`);
    for (const warning of result.warnings) console.log(`  · ${warning}`);
    return;
  }
  throw new OperatorError("usage: npm run operator -- list | run <jobId> [--plan-file plan.json]");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
}
