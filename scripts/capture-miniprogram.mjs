// Opens the mini-program in WeChat DevTools (tourist AppID → preview data) and saves screenshots.
// First start an automation window: cli auto --project apps/miniprogram --auto-port 9420
// Usage: node scripts/capture-miniprogram.mjs <outDir> [port]
import automator from "miniprogram-automator";
import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.resolve(process.argv[2] ?? path.join(root, "outputs", "miniprogram"));
const port = Number(process.argv[3] ?? 9420);
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Stable DevTools omits SDKVersion from Tool.getInfo (same workaround as zinan92/wechat-xingqiu).
const MiniProgram = createRequire(import.meta.url)("miniprogram-automator/out/MiniProgram").default;
MiniProgram.prototype.checkVersion = async function checkRuntimeVersion() {
  const { SDKVersion } = await this.systemInfo();
  if (SDKVersion !== "dev" && String(SDKVersion).split(".").map(Number)[0] < 2) throw new Error(`Runtime SDKVersion ${SDKVersion} is too old`);
};

await mkdir(outDir, { recursive: true });
const mini = await automator.connect({ wsEndpoint: `ws://127.0.0.1:${port}` });
try {
  const shot = async (name) => { await wait(1600); await mini.screenshot({ path: path.join(outDir, `${name}.png`) }); console.log(`saved ${name}`); };
  const logs = [];
  mini.on("console", (message) => logs.push(`[${message.type}] ${message.args?.join(" ")}`));
  mini.on("exception", (error) => logs.push(`[exception] ${error.message}`));

  let page = await mini.reLaunch("/pages/today/today");
  await wait(1500);
  console.log("path", (await mini.currentPage()).path);
  await shot("01-today-top");
  const checks = await page.$$(".check-button");
  if (checks[0]) await checks[0].tap();
  await wait(700);
  await mini.pageScrollTo(330);
  await shot("02-today-checked");
  const pills = await page.$$(".pill");
  if (pills[0]) await pills[0].tap();
  await wait(400);
  await mini.pageScrollTo(1080);
  await shot("03-today-meals");
  const done = await page.data("done");
  console.log("done", JSON.stringify(done), "progress", await page.data("progress"));
  page = await mini.switchTab("/pages/calendar/calendar");
  await wait(1500);
  await shot("04-calendar");
  const rest = await page.$$(".calcell.rest");
  if (rest[0]) await rest[0].tap();
  await wait(900);
  await mini.pageScrollTo(600);
  await shot("05-calendar-rest-day");
  const later = await page.$$(".calcell");
  const target = later.length > 20 ? later[20] : later[later.length - 1];
  await target.tap();
  await wait(900);
  const cta = await page.$(".cta");
  await cta.tap();
  await wait(1800);
  page = await mini.currentPage();
  console.log("after goToDay", page.path, await page.data("date"), JSON.stringify((await page.data("strip")).map((cell) => `${cell.weekday}${cell.day}${cell.selected ? "*" : ""}`)));
  await mini.pageScrollTo(0);
  await shot("06-today-from-calendar");
  console.log(logs.slice(-20).join("\n"));
} finally {
  mini.disconnect();
}
