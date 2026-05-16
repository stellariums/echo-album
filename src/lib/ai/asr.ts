// ASR: speech-to-text via Whisper (whisper-large-v3) through the OpenAI-compatible
// /v1/audio/transcriptions endpoint. Supports webm/opus from browser MediaRecorder
// and m4a/aac from Capacitor's voice recorder.

import fs from "node:fs";
import path from "node:path";
import { toFile } from "openai";
import { getClient, modelId } from "./client";

// Whisper accepts only this list. AAC raw streams are not on it, but the
// Capacitor voice-recorder plugin produces MP4-wrapped AAC even when its
// mimeType says "audio/aac" — so renaming the upload to .m4a makes Whisper
// happy without re-encoding.
const WHISPER_EXTS = new Set([
  "flac",
  "mp3",
  "mp4",
  "mpeg",
  "mpga",
  "m4a",
  "ogg",
  "opus",
  "wav",
  "webm",
]);

const HALLUCINATION_PATTERNS = [
  /请不吝点[赞讚]/,
  /订阅.{0,8}转发/,
  /[订訂]閱.{0,8}[轉转][發发]/,
  /打[赏賞]支持/,
  /明[镜鏡].{0,4}点点/,
  /字幕由.{0,20}提供/,
  /Amara\.org/i,
  /感[谢謝][观觀]看/,
  /^[\s。，、！？.,!?]*$/,
];

function isLikelyHallucination(text: string): boolean {
  const t = text.trim();
  if (t.length === 0) return true;
  if (t.length > 40) return false;
  return HALLUCINATION_PATTERNS.some((re) => re.test(t));
}

function normalizeExt(audioAbsPath: string): string {
  const raw = path.extname(audioAbsPath).slice(1).toLowerCase();
  if (WHISPER_EXTS.has(raw)) return raw;
  if (raw === "aac") return "m4a"; // see comment above
  return "m4a";
}

export async function transcribeAudio(audioAbsPath: string): Promise<string> {
  const client = getClient();
  const ext = normalizeExt(audioAbsPath);
  // Read into a buffer + wrap with toFile so we control the filename Whisper
  // sees in multipart form-data (the SDK uses the stream's path otherwise).
  const buffer = await fs.promises.readFile(audioAbsPath);
  const file = await toFile(buffer, `audio.${ext}`);

  const res = await client.audio.transcriptions.create({
    model: modelId("ASR"),
    file,
    language: "zh",
    response_format: "text",
  });

  const raw = typeof res === "string" ? res : ((res as { text?: string }).text ?? "");
  const text = raw.trim();

  if (isLikelyHallucination(text)) {
    return "";
  }
  return text;
}
