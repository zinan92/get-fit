#!/usr/bin/env node
// Bundles the shared API source into a single CommonJS CloudBase function.
// The output is a build artifact (gitignored); source stays in server/ and packages/.
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "rolldown";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "dist-cloudfunctions", "api");

// CloudBase runtime and SDK chosen for the pilot; mirrors zinan92/wechat-xingqiu.
export const CLOUDBASE_RUNTIME = "Nodejs20.19";
export const CLOUDBASE_SDK_VERSION = "3.18.3";

export async function buildCloudFunction() {
  await mkdir(outDir, { recursive: true });
  await build({
    input: path.join(root, "server", "cloudfunction", "entry.ts"),
    platform: "node",
    // Provided by the CloudBase function's own node_modules at deploy time.
    external: ["@cloudbase/node-sdk"],
    // Downlevel syntax for the CloudBase runtime rather than the local Node version.
    transform: { target: "node20.19" },
    output: { file: path.join(outDir, "index.js"), format: "cjs", exports: "named" },
    logLevel: "warn",
  });
  await writeFile(
    path.join(outDir, "package.json"),
    `${JSON.stringify({ name: "qinglian-api", private: true, main: "index.js", engines: { node: ">=20.19" }, cloudbaseRuntime: CLOUDBASE_RUNTIME, dependencies: { "@cloudbase/node-sdk": CLOUDBASE_SDK_VERSION } }, null, 2)}\n`,
  );
  return path.join(outDir, "index.js");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const file = await buildCloudFunction();
  console.log(`cloud function bundle: ${path.relative(root, file)}`);
}
