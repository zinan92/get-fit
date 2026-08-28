import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import test from "node:test";

const execFileAsync = promisify(execFile);

test("pilot preflight verifies the source package without printing secrets", async () => {
  const { stdout, stderr } = await execFileAsync(process.execPath, ["scripts/pilot-preflight.mjs"], { cwd: new URL("../", import.meta.url), env: { PATH: process.env.PATH } });
  const output = `${stdout}${stderr}`;
  assert.match(output, /customer API origin: operator configuration required/);
  assert.match(output, /real WeChat\/device trial: operator gate required/);
  assert.doesNotMatch(output, /DATA_ENCRYPTION_KEY=|WECHAT_APP_SECRET=|COACH_TOKEN=/);
});
