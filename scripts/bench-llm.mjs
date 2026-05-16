// Compare LLM candidates on a planQuery-style prompt.
// Measures latency + checks JSON validity + key field coverage.
// Run with: node --env-file=.env.local scripts/bench-llm.mjs

import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.AI_API_KEY,
  baseURL: process.env.AI_BASE_URL,
});

// Realistic prompt — same shape as src/lib/ai/llm.ts planQuery
const SYSTEM = `你是一个"记忆检索意图分析助手"。把用户的自然语言问题转成结构化检索计划，主动扩展同义词、情绪词、意图词。`;

const USER = `当前时间：2026-05-16T12:00:00.000Z
用户问题：我上次说很好吃的甜品是哪张？

请输出严格 JSON：
{
  "intent": "find_memory",
  "query_type": "exact_lookup | fuzzy_memory | time_location | context 四选一",
  "keywords": ["从问题中提取的关键词"],
  "possible_entities": ["可能的食物/物体/地点名称"],
  "time_hint": "如果有时间线索（最近/上周/昨天/某天），用中文描述；否则空字符串",
  "location_hint": "如果有地点线索，描述；否则空字符串",
  "must_have": ["必须命中的关键词"],
  "should_have": ["最好命中的关键词，包括同义词扩展"]
}

要求：
- 只返回 JSON，不要任何额外文字
- should_have 必须主动扩展同义词。例如"很好吃的甜品" → should_have 应包含 好吃 美味 推荐 喜欢 想再来 满足 等
- query_type 严格四选一`;

const candidates = [
  "deepseek-v3.2",      // current baseline
  "deepseek-v3.1",
  "deepseek-chat",
  "qwen-flash",
  "qwen-turbo",
  "qwen-plus",
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gpt-4o-mini",
  "gpt-4.1-mini",
];

function checkJson(text) {
  try {
    const parsed = JSON.parse(text);
    const hasKeywords = Array.isArray(parsed.keywords) && parsed.keywords.length > 0;
    const hasShould = Array.isArray(parsed.should_have) && parsed.should_have.length > 0;
    const shouldHasGoodSynonyms = hasShould &&
      parsed.should_have.some((s) => ["美味", "推荐", "好吃", "喜欢", "想再来", "满足"].includes(s));
    return { ok: true, hasKeywords, hasShould, shouldHasGoodSynonyms, parsed };
  } catch {
    return { ok: false };
  }
}

async function bench(model) {
  const t0 = Date.now();
  let text = "";
  let usage = null;
  let err = null;
  try {
    const res = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: USER },
      ],
      temperature: 0.2,
      max_tokens: 600,
      response_format: { type: "json_object" },
    });
    text = res.choices[0]?.message?.content ?? "";
    usage = res.usage ?? null;
  } catch (e) {
    err = e;
  }
  const ms = Date.now() - t0;

  if (err) {
    const status = err?.status ?? "?";
    const msg = err?.message?.split("\n")[0]?.slice(0, 80) ?? String(err);
    return { model, ms, ok: false, status, msg };
  }

  const check = checkJson(text);
  return {
    model,
    ms,
    ok: check.ok,
    hasKeywords: check.hasKeywords,
    hasShould: check.hasShould,
    shouldHasGoodSynonyms: check.shouldHasGoodSynonyms,
    promptTokens: usage?.prompt_tokens,
    completionTokens: usage?.completion_tokens,
    sample: check.parsed?.should_have?.slice(0, 6),
  };
}

console.log(`Benchmark: planQuery prompt, ${candidates.length} candidates\n`);
console.log("model".padEnd(28) + "  ms     ok  kw  sh  syn  tokens  sample should_have");
console.log("-".repeat(120));

const results = [];
for (const m of candidates) {
  const r = await bench(m);
  results.push(r);
  if (!r.ok) {
    console.log(
      m.padEnd(28) +
        `  ${String(r.ms).padStart(5)}  FAIL  status=${r.status}  ${r.msg ?? ""}`
    );
  } else {
    const tokens = r.completionTokens ? `${r.promptTokens}/${r.completionTokens}` : "?";
    const sample = r.sample ? r.sample.join("/") : "";
    console.log(
      m.padEnd(28) +
        `  ${String(r.ms).padStart(5)}  ` +
        `${r.ok ? "Y" : "N"}   ` +
        `${r.hasKeywords ? "Y" : "N"}   ` +
        `${r.hasShould ? "Y" : "N"}   ` +
        `${r.shouldHasGoodSynonyms ? "Y" : "N"}    ` +
        tokens.padEnd(8) +
        `${sample}`
    );
  }
}

console.log("\nFastest passing models:");
results
  .filter((r) => r.ok && r.hasKeywords && r.hasShould)
  .sort((a, b) => a.ms - b.ms)
  .slice(0, 5)
  .forEach((r, i) => {
    console.log(`  ${i + 1}. ${r.model.padEnd(28)}  ${r.ms}ms  synonyms=${r.shouldHasGoodSynonyms ? "Y" : "N"}`);
  });
