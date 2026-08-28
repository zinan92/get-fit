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
  "server/api/handlers.ts",
  "server/api/persistence.ts",
  "drizzle/0001_lean_rhodey.sql",
  "docs/specs/2026-08-28-fit-plan-v1-real-client-pilot.md",
];

const missing = [];
for (const relativePath of requiredFiles) {
  try { await access(path.join(root, relativePath)); }
  catch { missing.push(relativePath); }
}

const appSource = await readFile(path.join(root, "apps/miniprogram/app.js"), "utf8");
if (!appSource.includes("YOUR_CUSTOMER_API_ORIGIN")) missing.push("customer API origin placeholder");
if (appSource.includes("fit-plan-mockup.parkzz.chatgpt.site")) missing.push("private Sites origin must not be the customer API");

const hosting = JSON.parse(await readFile(path.join(root, ".openai/hosting.json"), "utf8"));
if (!hosting.project_id || !hosting.d1) missing.push("Sites/D1 binding");

const requiredSecrets = ["DATA_ENCRYPTION_KEY", "WECHAT_APP_ID", "WECHAT_APP_SECRET"];
const missingSecrets = requiredSecrets.filter((name) => !process.env[name]);
const sourceStatus = missing.length ? "source-check-failed" : "ready-for-human";
const gateStatus = strict && missingSecrets.length ? "blocked-external" : sourceStatus;

console.log(`PILOT_PREFLIGHT status=${gateStatus}`);
console.log(`source package: ${missing.length ? `missing ${missing.join(", ")}` : "required surfaces present"}`);
console.log(`customer API origin: ${appSource.includes("YOUR_CUSTOMER_API_ORIGIN") ? "operator configuration required" : "configured"}`);
console.log(`D1 binding: ${hosting.d1 ? "declared" : "operator configuration required"}`);
console.log("real WeChat/device trial: operator gate required");
if (strict) console.log(`human secrets: ${missingSecrets.length ? "operator configuration required" : "present (values not shown)"}`);

if (missing.length) process.exitCode = 1;
if (strict && missingSecrets.length) process.exitCode = 2;
