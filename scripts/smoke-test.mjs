// Smoke test for the openai-next gateway.
// Verifies all three model types are reachable via OpenAI-compatible APIs.
// Run with: node --env-file=.env.local scripts/smoke-test.mjs

import OpenAI from "openai";
import fs from "node:fs";

const client = new OpenAI({
  apiKey: process.env.AI_API_KEY,
  baseURL: process.env.AI_BASE_URL,
});

const LLM = process.env.LLM_MODEL;
const VISION = process.env.VISION_MODEL;
const ASR = process.env.ASR_MODEL;

console.log("Gateway:", process.env.AI_BASE_URL);
console.log("Models: ", { LLM, VISION, ASR });
console.log("");

// ---- Test 1: LLM (DeepSeek) chat completion ----
async function testLLM() {
  console.log("[1/3] LLM (chat.completions) ...");
  const t = Date.now();
  const res = await client.chat.completions.create({
    model: LLM,
    messages: [
      { role: "system", content: "你是简洁的助手，只用一句话回答。" },
      { role: "user", content: "用一句话夸我学得快。" },
    ],
    max_tokens: 80,
  });
  console.log(`  ✓ ${Date.now() - t}ms  →  ${res.choices[0]?.message?.content}`);
}

// ---- Test 2: Vision (Gemini) via image_url chat completion ----
async function testVision() {
  console.log("[2/3] Vision (chat.completions + image_url) ...");
  const t = Date.now();
  // Tiny 1x1 transparent PNG, base64-inlined as data URL
  const dataUrl =
    "data:image/png;base64," +
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwAEhgGAhKmMIQAAAABJRU5ErkJggg==";
  const res = await client.chat.completions.create({
    model: VISION,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: "What color is this 1x1 image? Reply in 5 words." },
          { type: "image_url", image_url: { url: dataUrl } },
        ],
      },
    ],
    max_tokens: 80,
  });
  console.log(`  ✓ ${Date.now() - t}ms  →  ${res.choices[0]?.message?.content}`);
}

// ---- Test 3: ASR (Qwen) via audio.transcriptions ----
async function testASR() {
  console.log("[3/3] ASR (audio.transcriptions) ...");
  const wavPath = "/tmp/silence.wav";
  // Synthesize a 1-second mono 8kHz silence WAV
  const sampleRate = 8000;
  const samples = sampleRate;
  const buf = Buffer.alloc(44 + samples * 2);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + samples * 2, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(samples * 2, 40);
  fs.writeFileSync(wavPath, buf);

  const t = Date.now();
  const res = await client.audio.transcriptions.create({
    model: ASR,
    file: fs.createReadStream(wavPath),
  });
  console.log(`  ✓ ${Date.now() - t}ms  →  text="${res.text ?? "(empty)"}"`);
}

const tests = [
  ["LLM", testLLM],
  ["VISION", testVision],
  ["ASR", testASR],
];

let pass = 0;
let fail = 0;
for (const [name, fn] of tests) {
  try {
    await fn();
    pass++;
  } catch (err) {
    fail++;
    const status = err?.status ?? "?";
    const msg = err?.message?.split("\n")[0] ?? String(err);
    console.log(`  ✗ ${name} failed (status=${status}): ${msg}`);
    if (err?.error) console.log("    error:", JSON.stringify(err.error).slice(0, 300));
  }
  console.log("");
}

console.log(`Result: ${pass} pass, ${fail} fail`);
process.exit(fail === 0 ? 0 : 1);
