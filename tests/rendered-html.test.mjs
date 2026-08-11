import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
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
  assert.match(html, /今天吃什么/);
  assert.match(html, /水煮蛋/);
  assert.match(html, /144<!-- --> kcal/);
  assert.match(html, /今天注意什么/);
  assert.match(html, /不构成个人健康建议/);
  assert.doesNotMatch(html, /codex-preview|Building your site|react-loading-skeleton/);
});

test("ships the original food illustration sheet and removes the starter preview", async () => {
  await access(new URL("public/food-sprite.png", projectRoot));
  await assert.rejects(access(new URL("app/_sites-preview/SkeletonPreview.tsx", projectRoot)));
});
