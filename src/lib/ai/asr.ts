// ASR: speech-to-text via Whisper (whisper-large-v3) through the OpenAI-compatible
// /v1/audio/transcriptions endpoint. Supports webm/opus from browser MediaRecorder.

import fs from "node:fs";
import { getClient, modelId } from "./client";

// Whisper's Chinese model is known to hallucinate boilerplate phrases on silence
// or very low-volume audio. These are training-set artifacts (subtitled YouTube
// videos, podcasts, etc.). When we detect a transcription that's *only* one of
// these phrases, we treat it as if the user said nothing.
const HALLUCINATION_PATTERNS = [
  /请不吝点[赞讚]/,
  /订阅.{0,8}转发/,
  /[订訂]閱.{0,8}[轉转][發发]/,
  /打[赏賞]支持/,
  /明[镜鏡].{0,4}点点/,
  /字幕由.{0,20}提供/,
  /Amara\.org/i,
  /感[谢謝][观觀]看/,
  /^[\s。，、！？.,!?]*$/, // punctuation/whitespace only
];

function isLikelyHallucination(text: string): boolean {
  const t = text.trim();
  if (t.length === 0) return true;
  if (t.length > 40) return false; // long transcripts are almost certainly real
  return HALLUCINATION_PATTERNS.some((re) => re.test(t));
}

export async function transcribeAudio(audioAbsPath: string): Promise<string> {
  const client = getClient();
  const stream = fs.createReadStream(audioAbsPath);

  const res = await client.audio.transcriptions.create({
    model: modelId("ASR"),
    file: stream,
    // Force Chinese to avoid Whisper auto-detecting wrong language on short clips
    language: "zh",
    // Plain text is enough for our pipeline; we don't need timestamps
    response_format: "text",
  });

  // When response_format is "text", res is a string; with default JSON it's { text: "..." }
  const raw = typeof res === "string" ? res : ((res as { text?: string }).text ?? "");
  const text = raw.trim();

  if (isLikelyHallucination(text)) {
    return "";
  }
  return text;
}
