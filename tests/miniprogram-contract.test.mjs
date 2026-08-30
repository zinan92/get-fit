import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("mini-program customer API uses an explicit customer origin placeholder", async () => {
  const source = await readFile(new URL("../apps/miniprogram/app.js", import.meta.url), "utf8");
  assert.match(source, /YOUR_CUSTOMER_API_ORIGIN/);
  assert.doesNotMatch(source, /fit-plan-mockup\.parkzz\.chatgpt\.site/);
  assert.match(source, /devMode:\s*false/);
  assert.match(source, /devOpenid:\s*['"]openid-local-sandbox['"]/);
});

test("mini-program local login is explicitly scoped to localhost and the invited client", async () => {
  const source = await readFile(new URL("../apps/miniprogram/pages/onboarding/onboarding.js", import.meta.url), "utf8");
  const wxml = await readFile(new URL("../apps/miniprogram/pages/onboarding/onboarding.wxml", import.meta.url), "utf8");
  assert.match(source, /devMode === true/);
  assert.match(source, /http:\/\/localhost/);
  assert.match(source, /devClientId: accepted\.client\.id/);
  assert.match(source, /devOpenid: `\$\{app\.globalData\.devOpenid\}:\$\{accepted\.client\.id\}`/);
  assert.match(source, /wx\.login/);
  assert.match(wxml, /本地 DevTools 模式/);
});

test("mini-program today page projects rich exercise and meal details", async () => {
  const wxml = await readFile(new URL("../apps/miniprogram/pages/today/today.wxml", import.meta.url), "utf8");
  const js = await readFile(new URL("../apps/miniprogram/pages/today/today.js", import.meta.url), "utf8");
  assert.match(wxml, /item\.mediaPath/);
  assert.match(wxml, /item\.steps/);
  assert.match(wxml, /item\.mealKcal/);
  assert.match(wxml, /toggleMeal/);
  assert.match(wxml, /item\.mediaAttribution/);
  assert.match(wxml, /binderror="onMediaError"/);
  assert.match(js, /result\.checkins/);
  assert.match(js, /toggleExerciseDetails/);
  assert.match(js, /onMediaError/);
  await access(new URL("../apps/miniprogram/assets/exercises/dumbbell-goblet-squat.gif", import.meta.url));
  await access(new URL("../apps/miniprogram/assets/exercises/single-arm-dumbbell-row.gif", import.meta.url));
  await access(new URL("../apps/miniprogram/assets/exercises/low-glute-bridge.gif", import.meta.url));
});
