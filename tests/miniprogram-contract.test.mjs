import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const app = path.join(root, "apps", "miniprogram");
const read = (relative) => readFile(path.join(app, relative), "utf8");

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(entries.map((entry) => entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]));
  return files.flat();
}

const sourceFiles = async (extensions) => (await walk(app)).filter((file) => extensions.some((extension) => file.endsWith(extension)));

test("all data access goes through the api cloud function, never wx.request or an API origin", async () => {
  const api = await read("utils/api.js");
  assert.match(api, /wx\.cloud\.callFunction\(\{\s*name: 'api'/);
  for (const file of await sourceFiles([".js", ".json", ".wxml"])) {
    const text = await readFile(file, "utf8");
    assert.doesNotMatch(text, /wx\.request\(|apiBaseUrl|YOUR_CUSTOMER_API_ORIGIN|sessionToken|devOpenid|chatgpt\.site/, path.relative(app, file));
  }
});

test("preview data is only reachable without a real AppID", async () => {
  const preview = await read("utils/preview.js");
  assert.match(preview, /appId === '' \|\| appId === 'touristappid'/);
  const config = JSON.parse(await read("project.config.json"));
  assert.equal(config.appid, "touristappid");
  const gitignore = await readFile(path.join(root, ".gitignore"), "utf8");
  assert.match(gitignore, /\/apps\/miniprogram\/project\.private\.config\.json/);
  assert.match(await read("app.js"), /preview = isPreview\(\)/);
});

test("today page follows v3: training before meals, per-food kcal, meal and day totals", async () => {
  const wxml = await read("pages/today/today.wxml");
  const dayMarkup = await read("components/plan-day/plan-day.wxml");
  const training = dayMarkup.indexOf("今天练什么");
  const meals = dayMarkup.indexOf("今天吃什么");
  assert.ok(training > 0 && meals > training, "training section precedes meals");
  assert.match(dayMarkup, /food\.kcal\}\} kcal/);
  assert.match(dayMarkup, /meal\.kcal\}\} kcal/);
  assert.match(dayMarkup, /day\.dailyKcal/);
  assert.match(dayMarkup, /教练已确认/);
  assert.match(wxml, /<plan-day day="\{\{day\}\}" done="\{\{done\}\}" bind:toggle="onToggle">/);
  const component = await read("components/plan-day/plan-day.wxml");
  assert.match(component, /<character catalog-id="\{\{item\.id\}\}"/);
  assert.doesNotMatch(wxml + component, /mediaPath|\.gif/);
});

test("check-ins start tilted and snap upright, with reduced motion respected", async () => {
  const wxss = await read("app.wxss");
  assert.match(wxss, /\.check-button \{[^}]*transform: rotate\(-9deg\)/);
  assert.match(wxss, /\.check-button\.on \{[^}]*transform: rotate\(0deg\) scale\(1\.08\)/);
  assert.match(wxss, /prefers-reduced-motion: reduce/);
  const page = await read("components/plan-day/plan-day.wxss");
  assert.match(page, /\.pill-badge \{[^}]*rotate\(-9deg\)/);
  assert.match(await read("components/character/character.wxss"), /@import "\.\/motions\.wxss"/);
  assert.match(await read("components/character/motions.wxss"), /prefers-reduced-motion: reduce/);
});

test("every catalog exercise and food has a character", async () => {
  const catalogs = (await Promise.all(["exercises.ts", "foods.ts"].map((file) => readFile(path.join(root, "packages", "catalogs", "src", file), "utf8")))).join("\n");
  const characters = await read("utils/characters.js");
  const exerciseIds = [...catalogs.matchAll(/id: "(ex-[\w-]+)"/g)].map((match) => match[1]);
  const foodIds = [...catalogs.matchAll(/id: "(food-[\w-]+)"/g)].map((match) => match[1]);
  assert.ok(exerciseIds.length >= 40 && foodIds.length >= 50, `${exerciseIds.length} exercises, ${foodIds.length} foods`);
  for (const id of [...exerciseIds, ...foodIds]) assert.match(characters, new RegExp(`"${id}"`), id);
  for (const file of (await walk(path.join(app, "assets"))).filter((item) => item.endsWith(".svg"))) {
    const svg = await readFile(file, "utf8");
    assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/, path.relative(app, file));
    assert.doesNotMatch(svg, /<style|\d%|currentColor/, `${path.relative(app, file)} must render inside <image>`);
  }
});

test("styles use only the v3 palette and pages carry no emoji, arrows or generation vocabulary", async () => {
  const palette = new Set(["#F3EEE3", "#FFFFFF", "#FBF6EA", "#2E2A24", "#6B6255", "#A79C8B", "#E6DDC9", "#D8CBAE", "#D85C28", "#FBE4D3", "#4F9D6E", "#E4F1E6", "#A9720A", "#F7ECD3", "#7A5205", "#FFF", "#fff"]);
  for (const file of await sourceFiles([".wxss", ".wxml"])) {
    if (file.endsWith("numerals.wxss")) continue;
    const text = await readFile(file, "utf8");
    for (const [color] of text.matchAll(/#[0-9A-Fa-f]{3,6}\b/g)) assert.ok(palette.has(color) || palette.has(color.toUpperCase()), `${path.relative(app, file)} uses off-palette ${color}`);
  }
  const clientFacing = (await sourceFiles([".wxml", ".js"])).filter((file) => !file.includes(`${path.sep}onboarding${path.sep}`) && !file.includes(`${path.sep}coach${path.sep}`) && !file.includes(`${path.sep}privacy${path.sep}`) && !file.endsWith("utils/coach.js") && !file.endsWith("preview-data.js"));
  for (const file of clientFacing) {
    const text = await readFile(file, "utf8");
    assert.doesNotMatch(text, /\p{Extended_Pictographic}|[→↗▦]/u, `${path.relative(app, file)} has decorative characters`);
    assert.doesNotMatch(text, /AI|模型|草案|provider|prompt|Codex|codex/, `${path.relative(app, file)} exposes generation vocabulary`);
  }
});

test("generated mini-program assets match packages/illustrations", () => {
  execFileSync(process.execPath, ["--import", "tsx", path.join(root, "scripts", "build-miniprogram-assets.ts"), "--check"], { cwd: root, stdio: "pipe" });
});

test("onboarding gates on the two required consents and uses the shared profile vocabulary", async () => {
  const js = await read("pages/onboarding/onboarding.js");
  const wxml = await read("pages/onboarding/onboarding.wxml");
  assert.match(js, /REQUIRED_CONSENTS = \['health_processing', 'third_party_model'\]/);
  assert.match(js, /require\('\.\.\/\.\.\/utils\/profile-options'\)/);
  assert.match(js, /query\.invite \|\| \(query\.scene && decodeURIComponent\(query\.scene\)\)/, "invitation links and QR scenes prefill the code");
  assert.doesNotMatch(js, /knee_discomfort|tree_nut|pregnancy|sessionToken|devOpenid|wx\.login/, "flag values come only from the generated options");
  for (const type of ["health_processing", "third_party_model", "subscription_message"]) assert.match(wxml, new RegExp(`data-type="${type}"`));
  assert.match(wxml, /第三方模型/, "the consent text discloses third-party drafting");
  const options = await read("utils/profile-options.js");
  for (const flag of ["knee_discomfort", "tree_nut", "shellfish", "pregnancy", "under_18", "gym"]) assert.match(options, new RegExp(`"${flag}"`));
});

test("pain feedback alerts the coach and tells the client to stop, without swapping moves", async () => {
  const js = await read("pages/today/today.js");
  const wxml = await read("pages/today/today.wxml");
  assert.match(js, /request\('\/api\/wellness-feedback'/);
  assert.match(wxml, /先停下让你疼的动作/);
  const sendFeeling = js.slice(js.indexOf("async sendFeeling"), js.indexOf("openCalendar()"));
  assert.doesNotMatch(sendFeeling, /exercises|catalogId|checkins/, "feedback never edits the plan");
});

test("coach mode reuses the client's plan-day view, reads only coach endpoints and never loosens identity", async () => {
  const preview = await read("pages/coach/preview/preview.wxml");
  assert.match(preview, /<plan-day wx:if="\{\{day\}\}" day="\{\{day\}\}" done="\{\{emptyDone\}\}" readonly badge=/, "the review screen renders the same component, read-only");
  const coachJs = (await Promise.all(["pages/coach/home/home.js", "pages/coach/client/client.js", "pages/coach/preview/preview.js", "pages/coach/edit/edit.js"].map(read))).join("\n");
  for (const [, route] of coachJs.matchAll(/request\(`?'?(\/api\/[^`'$?]+)/g)) assert.match(route, /^\/api\/coach\//, route);
  assert.doesNotMatch(coachJs, /x-coach-token|COACH_TOKEN|openid/i);
  assert.match(await read("pages/coach/preview/preview.js"), /plan-drafts\/\$\{this\.data\.draftId\}\/publish/);
  const app = JSON.parse(await read("app.json"));
  for (const page of ["pages/coach/home/home", "pages/coach/client/client", "pages/coach/preview/preview", "pages/coach/edit/edit"]) assert.ok(app.pages.includes(page), page);
  assert.equal(app.tabBar.list.some((item) => item.pagePath.includes("coach")), false, "coach pages are not in the client tab bar");
  const today = await read("pages/today/today.wxml");
  assert.doesNotMatch(today, /badge=/, "the client never sees a draft badge");
});

test("the day editor sends the whole plan to the server validator and shows its reasons", async () => {
  const editor = await read("pages/coach/edit/edit.js");
  assert.match(editor, /plan-drafts\/\$\{this\.data\.draftId\}\/options/, "swap choices come from the server");
  assert.match(editor, /method: 'PATCH', data: \{ payload \}/, "saves the full plan");
  assert.match(editor, /details\.messages/, "shows the validator's explanation");
  assert.doesNotMatch(editor, /contraindication|allergens|equipmentTags|injuryFlags/, "no client-side safety rules");
});

test("the week card encourages and never counts missed days against the client", async () => {
  const js = await read("pages/today/today.js");
  const wxml = await read("pages/today/today.wxml");
  assert.match(js, /request\('\/api\/me\/week'\)/);
  assert.match(wxml, /class="card week rise"/);
  assert.match(wxml, /week\.message/);
  assert.doesNotMatch(js + wxml, /没练|没打卡|落后|偷懒|已经 \$\{[^}]+\} 天/);
});

test("privacy notice matches the declared guide and is reachable from consent and 我的", async () => {
  const guide = await readFile(path.join(root, "docs", "privacy", "user-privacy-guide.md"), "utf8");
  const page = await read("pages/privacy/privacy.js");
  for (const phrase of ["30 天冷静期", "第三方大模型", "腾讯云微信云开发", "剪切板"]) {
    assert.ok(guide.includes(phrase), `guide: ${phrase}`);
    assert.ok(page.includes(phrase.replace("30 天冷静期", "30 天冷静期")), `page: ${phrase}`);
  }
  assert.match(await read("pages/onboarding/onboarding.wxml"), /bindtap="openPrivacy"/);
  assert.match(await read("pages/profile/profile.wxml"), /bindtap="openPrivacy"/);
  // Every privacy-gated API the app calls must be declared in the guide.
  const gated = { "wx.setClipboardData": "剪切板", "wx.getLocation": "位置", "wx.chooseImage": "相册", "wx.chooseMedia": "相册", "wx.getPhoneNumber": "手机号", "wx.getWeRunData": "微信运动", "wx.startRecord": "麦克风" };
  const code = (await sourceFiles([".js"])).filter((file) => !file.endsWith("preview-data.js"));
  const used = new Set();
  for (const file of code) for (const api of Object.keys(gated)) if ((await readFile(file, "utf8")).includes(api)) used.add(api);
  for (const api of used) assert.match(guide, new RegExp(`\`${api}\``), `${api} is used but not declared`);
});
