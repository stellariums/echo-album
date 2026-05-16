// Probe candidate replacements. Run with:
//   node --env-file=.env.local scripts/probe-alts.mjs
import OpenAI from "openai";
import fs from "node:fs";

const client = new OpenAI({
  apiKey: process.env.AI_API_KEY,
  baseURL: process.env.AI_BASE_URL,
});

const visionCandidates = ["gemini-2.5-flash", "gemini-2.0-flash", "qwen-vl-max", "qwen3-vl-plus"];
const asrCandidates = ["qwen3-asr-flash-realtime", "whisper-large-v3", "whisper-1"];

// Tiny image — 4x4 red square JPEG (real visual content, not transparent)
const redSquare = Buffer.from(
  "ffd8ffe000104a46494600010100000100010000ffdb004300080606070605080707070909080a0c140d0c0b0b0c1912130f141d1a1f1e1d1a1c1c20242e2720222c231c1c2837292c30313434341f27393d38323c2e333432ffdb0043010909090c0b0c180d0d1832211c213232323232323232323232323232323232323232323232323232323232323232323232323232323232323232323232323232ffc00011080004000403012200021101031101ffc4001f0000010501010101010100000000000000000102030405060708090a0bffc400b5100002010303020403050504040000017d01020300041105122131410613516107227114328191a1082342b1c11552d1f02433627282090a161718191a25262728292a3435363738393a434445464748494a535455565758595a636465666768696a737475767778797a838485868788898a92939495969798999aa2a3a4a5a6a7a8a9aab2b3b4b5b6b7b8b9bac2c3c4c5c6c7c8c9cad2d3d4d5d6d7d8d9dae1e2e3e4e5e6e7e8e9eaf1f2f3f4f5f6f7f8f9faffc4001f0100030101010101010101010000000000000102030405060708090a0bffc400b51100020102040403040705040400010277000102031104052131061241510761711322328108144291a1b1c109233352f0156272d10a162434e125f11718191a262728292a35363738393a434445464748494a535455565758595a636465666768696a737475767778797a82838485868788898a92939495969798999aa2a3a4a5a6a7a8a9aab2b3b4b5b6b7b8b9bac2c3c4c5c6c7c8c9cad2d3d4d5d6d7d8d9dae2e3e4e5e6e7e8e9eaf2f3f4f5f6f7f8f9faffda000c03010002110311003f00fbf8a280a00ffd9",
  "hex"
);
const dataUrl = "data:image/jpeg;base64," + redSquare.toString("base64");

async function probeVision(model) {
  const t = Date.now();
  try {
    const res = await client.chat.completions.create({
      model,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "What color is this image? Reply in 3 words." },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
      max_tokens: 30,
    });
    console.log(`  ✓ ${model.padEnd(35)} ${Date.now() - t}ms  →  "${res.choices[0]?.message?.content?.trim()}"`);
  } catch (err) {
    const msg = err?.message?.split("\n")[0]?.slice(0, 100);
    console.log(`  ✗ ${model.padEnd(35)} status=${err?.status ?? "?"}  ${msg}`);
  }
}

async function probeASR(model) {
  const wavPath = "/tmp/silence.wav";
  if (!fs.existsSync(wavPath)) {
    const sr = 8000, n = sr;
    const b = Buffer.alloc(44 + n * 2);
    b.write("RIFF", 0); b.writeUInt32LE(36 + n * 2, 4); b.write("WAVE", 8);
    b.write("fmt ", 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20);
    b.writeUInt16LE(1, 22); b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 2, 28);
    b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write("data", 36);
    b.writeUInt32LE(n * 2, 40);
    fs.writeFileSync(wavPath, b);
  }
  const t = Date.now();
  try {
    const res = await client.audio.transcriptions.create({
      model,
      file: fs.createReadStream(wavPath),
    });
    console.log(`  ✓ ${model.padEnd(35)} ${Date.now() - t}ms  →  text="${res.text ?? "(empty)"}"`);
  } catch (err) {
    const msg = err?.message?.split("\n")[0]?.slice(0, 100);
    console.log(`  ✗ ${model.padEnd(35)} status=${err?.status ?? "?"}  ${msg}`);
  }
}

console.log("=== Vision candidates ===");
for (const m of visionCandidates) await probeVision(m);
console.log("\n=== ASR candidates ===");
for (const m of asrCandidates) await probeASR(m);
