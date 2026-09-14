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
  // Today: tell the coach how the body feels (pain path).
  page = await mini.switchTab("/pages/today/today");
  await wait(1500);
  for (const [field, value] of [["pain", "present"], ["energy", "low"], ["hunger", "normal"]]) {
    const option = await page.$(`.feel-opt[data-field="${field}"][data-value="${value}"]`);
    if (option) await option.tap();
  }
  const feelingCard = await page.$(".feeling");
  if (feelingCard) { const { top } = await feelingCard.offset(); await mini.pageScrollTo(Math.max(0, top - 120)); }
  await shot("07-feeling-picked");
  const send = await page.$(".feel-send");
  if (send) await send.tap();
  await wait(700);
  await shot("08-feeling-pain");

  // Onboarding walk-through with preview responses.
  page = await mini.reLaunch("/pages/onboarding/onboarding?preview=onboarding&invite=demo-invite");
  await wait(1500);
  await shot("09-onboarding-invite");
  await (await page.$(".primary")).tap();
  await wait(1200);
  const consentCards = await page.$$(".consent-card");
  await consentCards[0].tap();
  await wait(300);
  await shot("10-onboarding-consent");
  await consentCards[1].tap();
  await (await page.$(".primary")).tap();
  await wait(1200);
  await page.setData({ "form.heightCm": "163", "form.weightKg": "58" });
  for (const selector of ['.chip-opt[data-field="equipment"][data-value="dumbbell"]', '.chip-opt[data-field="injury"][data-value="knee_discomfort"]', '.chip-opt[data-field="allergy"][data-value="tree_nut"]']) {
    const chip = await page.$(selector);
    if (chip) await chip.tap();
  }
  await shot("11-onboarding-profile-top");
  await mini.pageScrollTo(900);
  await shot("12-onboarding-profile-bottom");
  await (await page.$(".primary")).tap();
  await wait(1200);
  await mini.pageScrollTo(0);
  await shot("13-onboarding-done");
  // Coach workbench.
  page = await mini.reLaunch("/pages/coach/home/home");
  await wait(1500);
  await shot("14-coach-home");
  const inviteInput = await page.$(".invite .field");
  if (inviteInput) { await page.setData({ inviteName: "小周" }); await (await page.$(".invite .primary")).tap(); await wait(800); await mini.pageScrollTo(1200); await shot("15-coach-invite"); }
  const overview = await page.data("clients");
  const draftClient = overview.find((item) => item.stage === "draft_ready");
  const reviewClient = overview.find((item) => item.stage === "profile_submitted");
  const liveClient = overview.find((item) => item.stage === "published");
  page = await mini.navigateTo(`/pages/coach/client/client?id=${reviewClient.id}`);
  await wait(1500);
  await shot("16-coach-client-review");
  page = await mini.redirectTo(`/pages/coach/client/client?id=${liveClient.id}`);
  await wait(1500);
  await shot("17-coach-client-live");
  page = await mini.redirectTo(`/pages/coach/preview/preview?draftId=${draftClient.draft.id}`);
  await wait(1800);
  await shot("18-coach-draft-preview");
  const cells = await page.$$(".strip .dcell");
  if (cells[3]) { await cells[3].tap(); await wait(1500); await mini.pageScrollTo(700); await shot("19-coach-draft-day4"); }
  // Day editor: bump sets, open the swap sheet, pick a food.
  if (await page.$(".edit-btn")) {
    page = await mini.navigateTo(`/pages/coach/edit/edit?draftId=${draftClient.draft.id}&date=${await page.data("date")}&name=${encodeURIComponent(draftClient.client.displayName)}`);
    await wait(2000);
    const plus = await page.$$(".stepper .pm");
    if (plus[1]) await plus[1].tap();
    await shot("30-coach-edit-top");
    const swap = await page.$(".mini-btn");
    if (swap) { await swap.tap(); await wait(900); await shot("31-coach-edit-swap-sheet"); await page.callMethod("closeSheet"); }
    const meal = await page.$(".meal");
    if (meal) { const { top } = await meal.offset(); await mini.pageScrollTo(Math.max(0, top - 160)); }
    await shot("32-coach-edit-meals");
  }
  // Member management: filters, a member near the end of a period, the archived list.
  page = await mini.reLaunch("/pages/coach/home/home");
  await wait(1600);
  const list = await page.$(".finder");
  if (list) { const { top } = await list.offset(); await mini.pageScrollTo(Math.max(0, top - 200)); }
  await shot("33-coach-members");
  await page.callMethod("pickFilter", { currentTarget: { dataset: { key: "ending" } } });
  await shot("34-coach-members-ending");
  const members = await page.data("clients");
  const ending = members.find((item) => item.attention.some((entry) => entry.kind === "ending"));
  if (ending) {
    page = await mini.navigateTo(`/pages/coach/client/client?id=${ending.id}`);
    await wait(1800);
    await shot("35-coach-member-renewal");
    await mini.pageScrollTo(900);
    await shot("36-coach-member-note");
  }
  // Weekly card on the client's today page, and where the coach writes the line on it.
  page = await mini.reLaunch("/pages/today/today");
  await wait(1800);
  const weekCard = await page.$(".week");
  if (weekCard) { const { top } = await weekCard.offset(); await mini.pageScrollTo(Math.max(0, top - 140)); }
  await shot("37-today-week");
  const live = members.find((item) => item.message);
  if (live) {
    page = await mini.reLaunch(`/pages/coach/client/client?id=${live.id}`);
    await wait(1800);
    const noteCard = await page.$(".note-card");
    if (noteCard) { const { top } = await noteCard.offset(); await mini.pageScrollTo(Math.max(0, top - 160)); }
    await shot("38-coach-message");
  }
  console.log(logs.slice(-20).join("\n"));
} finally {
  mini.disconnect();
}
