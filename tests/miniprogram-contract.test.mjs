import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("mini-program customer API uses an explicit customer origin placeholder", async () => {
  const source = await readFile(new URL("../apps/miniprogram/app.js", import.meta.url), "utf8");
  assert.match(source, /YOUR_CUSTOMER_API_ORIGIN/);
  assert.doesNotMatch(source, /fit-plan-mockup\.parkzz\.chatgpt\.site/);
});
