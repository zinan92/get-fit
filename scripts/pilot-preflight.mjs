#!/usr/bin/env node

import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const strict = process.argv.includes("--strict");
const requiredFiles = [
  "apps/miniprogram/app.js",
  "apps/miniprogram/pages/onboarding/onboarding.js",
  "apps/miniprogram/pages/today/today.js",
  "apps/miniprogram/pages/calendar/calendar.js",
  "apps/miniprogram/utils/api.js",
  "server/api/handlers.ts",
  "server/api/persistence.ts",
  "server/cloudfunction/entry.ts",
  "server/cloudfunction/cloudbase-storage.ts",
  "docs/specs/2026-08-28-fit-plan-v1-real-client-pilot.md",
  "docs/specs/2026-09-14-first-customer-shortest-path.md",
];

const missing = [];
for (const relativePath of requiredFiles) {
  try { await access(path.join(root, relativePath)); }
  catch { missing.push(relativePath); }
}

const apiSource = await readFile(path.join(root, "apps/miniprogram/utils/api.js"), "utf8");
if (!apiSource.includes("wx.cloud.callFunction")) missing.push("mini-program must call the api cloud function");
if (/wx\.request\(|chatgpt\.site/.test(apiSource)) missing.push("mini-program must not call an HTTP API origin");
const projectConfig = JSON.parse(await readFile(path.join(root, "apps/miniprogram/project.config.json"), "utf8"));
if (projectConfig.appid !== "touristappid") missing.push("committed project config must keep the tourist AppID");

// Cloud function environment (CloudBase console), never committed.
const requiredSecrets = ["DATA_ENCRYPTION_KEY", "COACH_OPENIDS"];
const missingSecrets = requiredSecrets.filter((name) => !process.env[name]);
const sourceStatus = missing.length ? "source-check-failed" : "ready-for-human";
const gateStatus = strict && missingSecrets.length ? "blocked-external" : sourceStatus;

console.log(`PILOT_PREFLIGHT status=${gateStatus}`);
console.log(`source package: ${missing.length ? `missing ${missing.join(", ")}` : "required surfaces present"}`);
console.log("mini-program AppID and CloudBase environment: operator configuration required (#8)");
console.log("cloud function deploy and health check: operator gate required (#11)");
console.log("real WeChat/device trial: operator gate required");
if (strict) console.log(`cloud function secrets: ${missingSecrets.length ? "operator configuration required" : "present (values not shown)"}`);

if (missing.length) process.exitCode = 1;
if (strict && missingSecrets.length) process.exitCode = 2;
