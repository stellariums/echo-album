// Shared OpenAI-compatible client.
// All three models (DeepSeek, Gemini, Whisper) reach the gateway through this.

import OpenAI from "openai";

let client: OpenAI | null = null;

export function getClient(): OpenAI {
  if (client) return client;
  const baseURL = process.env.AI_BASE_URL;
  const apiKey = process.env.AI_API_KEY;
  if (!baseURL || !apiKey) {
    throw new Error(
      "AI gateway not configured. Set AI_BASE_URL and AI_API_KEY in .env.local."
    );
  }
  client = new OpenAI({ baseURL, apiKey });
  return client;
}

export function modelId(kind: "LLM" | "VISION" | "ASR"): string {
  const v = process.env[`${kind}_MODEL`];
  if (!v) throw new Error(`${kind}_MODEL not set in .env.local`);
  return v;
}
