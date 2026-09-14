#!/usr/bin/env node
// Operator-side CloudBase chores. Secrets live only in ~/.config/qinglian (chmod 600), never in the repo.
//
//   node scripts/cloudbase-ops.mjs init                 create the storage key and operator key (once)
//   node scripts/cloudbase-ops.mjs add-coach <id>       allowlist a coach by the account id shown in 我的
//   node scripts/cloudbase-ops.mjs deploy [--dry-run]   build, deploy the api function, then run its health check
//   node scripts/cloudbase-ops.mjs health               run the health check only
import { spawnSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { chmod, mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildCloudFunction, CLOUDBASE_RUNTIME } from "./build-cloudfunction.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const configDir = process.env.QINGLIAN_CONFIG_DIR ?? path.join(homedir(), ".config", "qinglian");
const functionEnvFile = () => path.join(configDir, "function-env.json");
const operatorKeyFile = () => path.join(configDir, "operator-key");

async function readPrivate(file) {
  const info = await stat(file).catch(() => null);
  if (!info) return null;
  if ((info.mode & 0o077) !== 0) throw new Error(`${file} must be chmod 600`);
  return readFile(file, "utf8");
}

async function writePrivate(file, content) {
  await mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
  await writeFile(file, content, { mode: 0o600 });
  await chmod(file, 0o600);
}

export async function init() {
  if (await readPrivate(functionEnvFile())) throw new Error(`${functionEnvFile()} already exists; the storage key must never be replaced, or existing data becomes unreadable`);
  const operatorKey = randomBytes(32).toString("base64url");
  await writePrivate(operatorKeyFile(), `${operatorKey}\n`);
  await writePrivate(functionEnvFile(), `${JSON.stringify({
    DATA_ENCRYPTION_KEY: randomBytes(32).toString("base64url"),
    COACH_OPENID_HASHES: "",
    OPERATOR_KEY_SHA256: createHash("sha256").update(operatorKey).digest("hex"),
  }, null, 2)}\n`);
  return { functionEnv: functionEnvFile(), operatorKey: operatorKeyFile() };
}

export async function addCoach(accountId) {
  if (!/^[0-9a-f]{64}$/i.test(accountId ?? "")) throw new Error("account id is the 64-character code copied from 我的 → 账号编号");
  const raw = await readPrivate(functionEnvFile());
  if (!raw) throw new Error("run init first");
  const env = JSON.parse(raw);
  const coaches = new Set(String(env.COACH_OPENID_HASHES ?? "").split(",").map((item) => item.trim().toLowerCase()).filter(Boolean));
  coaches.add(accountId.toLowerCase());
  env.COACH_OPENID_HASHES = [...coaches].join(",");
  await writePrivate(functionEnvFile(), `${JSON.stringify(env, null, 2)}\n`);
  return coaches.size;
}

function tcb(args) {
  const result = spawnSync("tcb", args, { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`tcb ${args.slice(0, 3).join(" ")} failed: ${(result.stderr || result.stdout).trim().slice(0, 400)}`);
  return result.stdout;
}

function envId() {
  const id = process.env.QINGLIAN_ENV_ID;
  if (!id) throw new Error("set QINGLIAN_ENV_ID to the CloudBase environment id");
  return id;
}

export async function deploy({ dryRun = false } = {}) {
  const raw = await readPrivate(functionEnvFile());
  if (!raw) throw new Error("run init first");
  const envVariables = JSON.parse(raw);
  // The first deploy has no coach yet: the coach needs the deployed function to read their account id.
  const warning = envVariables.COACH_OPENID_HASHES ? null : "no coach on the list yet: have the coach copy their account id from 我的, then add-coach and deploy again";
  const bundle = await buildCloudFunction();
  const functionRoot = path.dirname(path.dirname(bundle));
  const work = await mkdtemp(path.join(tmpdir(), "qinglian-deploy-"));
  const configFile = path.join(work, "cloudbaserc.json");
  await writeFile(configFile, JSON.stringify({
    envId: dryRun ? "dry-run" : envId(),
    functionRoot,
    functions: [{ name: "api", runtime: CLOUDBASE_RUNTIME, handler: "index.main", timeout: 20, memorySize: 256, installDependency: true, envVariables }],
  }, null, 2), { mode: 0o600 });
  try {
    if (dryRun) return { bundle: path.relative(root, bundle), runtime: CLOUDBASE_RUNTIME, variables: Object.keys(envVariables), warning };
    tcb(["fn", "deploy", "api", "--force", "--runtime", CLOUDBASE_RUNTIME, "-e", envId(), "--config-file", configFile]);
    return { deployed: true, warning, health: health() };
  } finally {
    await rm(work, { recursive: true, force: true });
  }
}

export function health() {
  const output = tcb(["fn", "invoke", "api", "-e", envId(), "--json", "--params", JSON.stringify({ action: "health" })]);
  return output.trim();
}

async function main() {
  const [command, argument] = process.argv.slice(2);
  if (command === "init") { const files = await init(); console.log(`created ${files.functionEnv} and ${files.operatorKey}`); return; }
  if (command === "add-coach") { console.log(`coach list now has ${await addCoach(argument)} account(s); run deploy to apply`); return; }
  if (command === "deploy") { console.log(JSON.stringify(await deploy({ dryRun: process.argv.includes("--dry-run") }), null, 2)); return; }
  if (command === "health") { console.log(health()); return; }
  throw new Error("usage: node scripts/cloudbase-ops.mjs init | add-coach <accountId> | deploy [--dry-run] | health");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
