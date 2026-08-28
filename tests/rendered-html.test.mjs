import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("renders the complete approved daily plan mockup", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>轻练 · 今日计划<\/title>/);
  assert.match(html, /教练已确认/);
  assert.match(html, /第 8 \/ 30 天/);
  assert.match(html, /今天练什么/);
  assert.match(html, /高脚杯深蹲/);
  assert.match(html, /exercise-preview\/dumbbell-goblet-squat\.gif/);
  assert.match(html, /exercise-preview\/single-arm-dumbbell-row\.gif/);
  assert.match(html, /exercise-preview\/low-glute-bridge\.gif/);
  assert.match(html, /动作 GIF：© Gym visual/);
  assert.match(html, /动作要领/);
  assert.match(html, /目标：(?:<!-- -->)?股四头肌/);
  assert.match(html, /器械：(?:<!-- -->)?哑铃 \+ 上斜凳/);
  assert.match(html, /双脚分开与肩同宽站立/);
  assert.match(html, /设置一个 45 度角的上斜凳/);
  assert.match(html, /平躺，膝盖弯曲/);
  assert.match(html, /<details class="exercise-details" open(?:="")?>/);
  assert.match(html, /今天吃什么/);
  assert.match(html, /水煮蛋/);
  assert.match(html, /144<!-- --> kcal/);
  assert.match(html, /今天注意什么/);
  assert.match(html, /不构成个人健康建议/);
  assert.doesNotMatch(html, /codex-preview|Building your site|react-loading-skeleton/);
});

test("ships the original food illustration sheet and removes the starter preview", async () => {
  await access(new URL("public/food-sprite.webp", projectRoot));
  await assert.rejects(access(new URL("app/_sites-preview/SkeletonPreview.tsx", projectRoot)));
});

test("renders the private exercise GIF preview with real media references", async () => {
  const response = await render("/exercise-preview");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /轻练 · 动作 GIF 预览/);
  assert.match(html, /高脚杯深蹲/);
  assert.match(html, /单臂哑铃划船/);
  assert.match(html, /臀桥/);
  assert.match(html, /exercise-preview\/single-arm-dumbbell-row\.gif/);
  assert.match(html, /exercise-preview\/low-glute-bridge\.gif/);
  assert.match(html, /exercise-preview\/dumbbell-goblet-squat\.gif/);
  assert.match(html, /© Gym visual/);
});
