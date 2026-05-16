// Build the Next.js app as a static export suitable for bundling into the
// Capacitor APK. Why this exists: `output: 'export'` cannot coexist with
// route handlers under src/app/api (POST/dynamic handlers can't be exported),
// so we move them aside, run the export, then move them back.
//
// Usage:
//   pnpm build:static
//
// Output: ./out/ — a tree of static HTML/JS/CSS ready for `npx cap copy`.

import { existsSync, renameSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const API_DIR = path.join(ROOT, "src", "app", "api");
const API_BACKUP = path.join(ROOT, "src", "app", "_api_disabled_for_export");

function moveApiAside() {
  if (existsSync(API_DIR)) {
    if (existsSync(API_BACKUP)) {
      throw new Error(
        `Backup path already exists: ${API_BACKUP}. Previous build crashed mid-way? ` +
          `Move it back to src/app/api manually.`
      );
    }
    renameSync(API_DIR, API_BACKUP);
    return true;
  }
  return false;
}

function restoreApi() {
  if (existsSync(API_BACKUP)) {
    renameSync(API_BACKUP, API_DIR);
  }
}

function run(cmd, args, env) {
  const result = spawnSync(cmd, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: { ...process.env, ...env },
    cwd: ROOT,
  });
  return result.status ?? 1;
}

const moved = moveApiAside();
let exitCode = 1;
try {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE ?? "";
  if (!apiBase) {
    console.error(
      "[build-static] NEXT_PUBLIC_API_BASE is not set. The Capacitor APK " +
        "needs an absolute URL to reach the backend. Re-run with:\n" +
        "  NEXT_PUBLIC_API_BASE=https://<tunnel>.trycloudflare.com pnpm build:static"
    );
    restoreApi();
    process.exit(1);
  }
  console.log(`[build-static] Baking NEXT_PUBLIC_API_BASE = ${apiBase}`);
  exitCode = run("pnpm", ["exec", "next", "build"], { EXPORT_STATIC: "1" });
} finally {
  if (moved) restoreApi();
}

process.exit(exitCode);
