import assert from "node:assert/strict";
import { mkdtemp, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

process.env.QINGLIAN_CONFIG_DIR = await mkdtemp(path.join(tmpdir(), "qinglian-ops-test-"));
const ops = await import("../scripts/cloudbase-ops.mjs");

test("init writes private secrets once and refuses to replace the storage key", async () => {
  const files = await ops.init();
  for (const file of [files.functionEnv, files.operatorKey]) assert.equal((await stat(file)).mode & 0o777, 0o600, file);
  const env = JSON.parse(await readFile(files.functionEnv, "utf8"));
  assert.ok(env.DATA_ENCRYPTION_KEY.length >= 40);
  assert.match(env.OPERATOR_KEY_SHA256, /^[0-9a-f]{64}$/);
  await assert.rejects(ops.init(), /must never be replaced/);
});

test("coaches are added by account id; the first deploy without one only warns", async () => {
  assert.match((await ops.deploy({ dryRun: true })).warning, /no coach on the list yet/);
  await assert.rejects(ops.addCoach("not-an-id"), /64-character/);
  assert.equal(await ops.addCoach("a".repeat(64)), 1);
  assert.equal(await ops.addCoach("A".repeat(64)), 1, "case-insensitive, no duplicates");
  const plan = await ops.deploy({ dryRun: true });
  assert.equal(plan.warning, null);
  assert.equal(plan.runtime, "Nodejs20.19");
  assert.deepEqual(plan.triggers, ["daily-retention"]);
  assert.deepEqual(plan.variables.sort(), ["COACH_OPENID_HASHES", "DATA_ENCRYPTION_KEY", "OPERATOR_KEY_SHA256"]);
  assert.equal(JSON.stringify(plan).includes("DATA_ENCRYPTION_KEY\":"), false, "the dry run never prints secret values");
});
