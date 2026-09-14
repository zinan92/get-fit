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
  const training = wxml.indexOf("今天练什么");
  const meals = wxml.indexOf("今天吃什么");
  assert.ok(training > 0 && meals > training, "training section precedes meals");
  assert.match(wxml, /food\.kcal\}\} kcal/);
  assert.match(wxml, /meal\.kcal\}\} kcal/);
  assert.match(wxml, /day\.dailyKcal/);
  assert.match(wxml, /教练已确认/);
  assert.match(wxml, /<character catalog-id="\{\{item\.id\}\}"/);
  assert.doesNotMatch(wxml, /mediaPath|\.gif/);
});

test("check-ins start tilted and snap upright, with reduced motion respected", async () => {
  const wxss = await read("app.wxss");
  assert.match(wxss, /\.check-button \{[^}]*transform: rotate\(-9deg\)/);
  assert.match(wxss, /\.check-button\.on \{[^}]*transform: rotate\(0deg\) scale\(1\.08\)/);
  assert.match(wxss, /prefers-reduced-motion: reduce/);
  const page = await read("pages/today/today.wxss");
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
  const clientFacing = (await sourceFiles([".wxml", ".js"])).filter((file) => !file.includes(`${path.sep}onboarding${path.sep}`) && !file.endsWith("preview-data.js"));
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
