// Bulk-import the 12 starter photos in ./picture/ as memories.
// Each file is uploaded to POST /api/memories exactly like the frontend does
// (multipart/form-data, image only, no userNote/locationText), so the server's
// waitUntil(processMemory) pipeline runs Vision + LLM the same way as a real
// capture. AI is responsible for title/tags/summary — filename is metadata-free.
//
// Usage:
//   node scripts/seed-initial-memories.mjs [baseUrl]
//
// baseUrl defaults to the env var SEED_API_BASE, then NEXT_PUBLIC_API_BASE,
// then http://localhost:3000.
//
// Requires Node 18+ (uses native fetch, FormData, Blob).

import fs from "node:fs/promises";
import path from "node:path";

const PICTURE_DIR = path.resolve(process.cwd(), "picture");
const POLL_INTERVAL_MS = 4000;
const POLL_TIMEOUT_MS = 180_000; // 3 min per memory; pipeline is ~15-30s typical

const baseUrl = (
  process.argv[2] ||
  process.env.SEED_API_BASE ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "http://localhost:3000"
).replace(/\/$/, "");

const apiToken = process.env.API_TOKEN || process.env.NEXT_PUBLIC_API_TOKEN || "";

const MIME_BY_EXT = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

function authHeaders() {
  return apiToken ? { Authorization: `Bearer ${apiToken}` } : {};
}

async function uploadOne(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mime = MIME_BY_EXT[ext];
  if (!mime) throw new Error(`Unsupported extension: ${ext}`);

  const buffer = await fs.readFile(filePath);
  const blob = new Blob([buffer], { type: mime });
  const form = new FormData();
  form.append("image", blob, path.basename(filePath));

  const res = await fetch(`${baseUrl}/api/memories`, {
    method: "POST",
    headers: authHeaders(),
    body: form,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`POST /api/memories ${res.status}: ${text.slice(0, 200)}`);
  }
  return JSON.parse(text);
}

async function pollUntilDone(id) {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const res = await fetch(`${baseUrl}/api/memories/${id}`, {
      headers: authHeaders(),
    });
    if (!res.ok) {
      throw new Error(`GET /api/memories/${id} ${res.status}`);
    }
    const memory = await res.json();
    if (["completed", "partial", "failed"].includes(memory.status)) {
      return memory;
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  throw new Error(`Timed out waiting for memory ${id} (>${POLL_TIMEOUT_MS}ms)`);
}

async function main() {
  console.log(`[seed] base: ${baseUrl}`);
  console.log(`[seed] auth: ${apiToken ? "Bearer ***" : "(none)"}`);

  const entries = await fs.readdir(PICTURE_DIR);
  const files = entries
    .filter((name) => MIME_BY_EXT[path.extname(name).toLowerCase()])
    .map((name) => path.join(PICTURE_DIR, name))
    .sort();

  if (files.length === 0) {
    console.error(`[seed] no supported images in ${PICTURE_DIR}`);
    process.exit(1);
  }
  console.log(`[seed] found ${files.length} images in ${PICTURE_DIR}`);

  // Upload sequentially — pipeline runs in waitUntil() and the gateway has
  // rate limits + a single shared LLM key. Burst-uploading 12 at once would
  // make the AI gateway throttle and slow the whole batch down.
  const uploaded = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const name = path.basename(file);
    process.stdout.write(`[seed] (${i + 1}/${files.length}) uploading ${name} ... `);
    try {
      const created = await uploadOne(file);
      console.log(`id=${created.id}`);
      uploaded.push({ name, id: created.id });
    } catch (err) {
      console.log(`FAILED: ${err.message}`);
    }
  }

  console.log(`\n[seed] waiting for AI pipeline to finish on ${uploaded.length} memories ...`);

  const results = await Promise.allSettled(
    uploaded.map(async (m) => {
      const final = await pollUntilDone(m.id);
      return { ...m, status: final.status, title: final.title, errorMessage: final.errorMessage };
    })
  );

  console.log("\n[seed] final report:");
  let ok = 0;
  let fail = 0;
  for (const r of results) {
    if (r.status === "fulfilled") {
      const v = r.value;
      const flag =
        v.status === "completed" ? "✓" : v.status === "partial" ? "~" : "✗";
      const tail =
        v.status === "completed" || v.status === "partial"
          ? `title="${v.title ?? ""}"`
          : `err="${v.errorMessage ?? ""}"`;
      console.log(`  ${flag} ${v.name}  →  ${v.status}  ${tail}`);
      if (v.status === "failed") fail++;
      else ok++;
    } else {
      console.log(`  ✗ poll error: ${r.reason?.message ?? r.reason}`);
      fail++;
    }
  }

  console.log(`\n[seed] ${ok} ok, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("[seed] fatal:", err);
  process.exit(1);
});
