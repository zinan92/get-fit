import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
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
  assert.match(html, /food-face/);
  assert.match(html, /check-glyph/);
  assert.match(html, /今天注意什么/);
  assert.match(html, /href="\/plan"/);
  assert.match(html, /href="\/me"/);
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

test("renders the 30-day plan tab with selectable day details", async () => {
  const response = await render("/plan");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /30 天计划/);
  assert.match(html, /选择一天/);
  assert.match(html, /第 8 天/);
  assert.match(html, /下肢力量日/);
  assert.match(html, /href="\/me"/);
});

test("renders the my tab with profile, consent and delete controls", async () => {
  const response = await render("/me");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /我的/);
  assert.match(html, /小满/);
  assert.match(html, /基础情况/);
  assert.match(html, /申请删除/);
  assert.match(html, /href="\/plan"/);
});

test("renders the local customer sandbox without production identity claims", async () => {
  const response = await render("/sandbox");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /轻练 · LOCAL SANDBOX/);
  assert.match(html, /正在检查本地环境/);
  const source = await readFile(new URL("app/sandbox/page.tsx", projectRoot), "utf8");
  assert.match(source, /CUSTOMER SANDBOX/);
  assert.match(source, /输入教练邀请/);
  assert.match(source, /本地开发身份/);
  assert.match(source, /不会在生产地址尝试开发身份登录/);
  assert.match(source, /browserMediaPath/);
  assert.match(source, /exercise-preview/);
  assert.doesNotMatch(html, /WECHAT_APP_SECRET|COACH_TOKEN|DATA_ENCRYPTION_KEY/);
});

test("uses native anchors for navigation in the Sites/vinext runtime", async () => {
  const navigationSources = [
    "app/page.tsx",
    "app/components/mini-nav.tsx",
    "app/plan/page.tsx",
    "app/me/page.tsx",
    "app/coach/page.tsx",
    "app/exercise-preview/page.tsx",
  ];

  for (const relativePath of navigationSources) {
    const source = await readFile(new URL(relativePath, projectRoot), "utf8");
    assert.doesNotMatch(source, /from ["']next\/link["']/);
  }
});
