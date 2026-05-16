// LLM (DeepSeek-V3.2) for:
//   1. generateMemoryCard — combine extracted info into a structured memory card
//   2. planQuery         — turn user query into a structured search plan
//   3. rerankCandidates  — pick the best match + explain why

import { getClient, modelId } from "./client";
import { extractJson, isJsonExtractionError } from "./json-utils";

// ---------------- Memory Card ----------------

export interface MemoryCard {
  title: string;
  summary: string;
  tags: string[];
  entities: Record<string, string[]>;
  searchText: string;
}

export interface MemoryCardInput {
  visionCaption: string;
  ocrText: string;
  speechText: string;
  userNote: string;
  createdAt: string;
  locationText: string;
}

const MEMORY_CARD_SYSTEM = `你是一个"私人记忆整理助手"。你的任务是把一张照片附带的信息整理成可被自然语言搜索的"记忆卡片"。

最重要的产出是 search_text：这是一段用空格分隔的中文检索关键词，必须主动扩展同义词、情绪词、意图词，让用户用任何模糊说法都能命中。

例：
- 如果用户语音里说"酒味很浓、入口即化、下次还想来"，search_text 必须包含 好吃 推荐 喜欢 满足 想再来 美味 等扩展词。
- 如果用户语音里说"挺适合下午写东西"，search_text 必须包含 学习 写作 安静 适合 推荐 等扩展词。`;

function buildMemoryCardPrompt(input: MemoryCardInput): string {
  return `请基于以下信息生成"记忆卡片"，并以严格 JSON 返回。

【图片描述】${input.visionCaption || "（无）"}
【图片中文字 OCR】${input.ocrText || "（无）"}
【用户语音转录】${input.speechText || "（无）"}
【用户文字备注】${input.userNote || "（无）"}
【拍摄时间】${input.createdAt}
【拍摄地点】${input.locationText || "（未提供）"}

请输出：
{
  "title": "8 字以内的简短标题，要能让用户一眼想起这张照片",
  "summary": "1-2 句话的中文摘要，重点是用户当时的体验/感受/情境",
  "tags": ["6-8 个中文标签，覆盖物体、场景、情绪、意图、同义词"],
  "entities": {
    "food": [],
    "place": [],
    "person": [],
    "emotion": [],
    "action_intent": []
  },
  "search_text": "15-30 个空格分隔的中文关键词，必须主动扩展同义词和情绪词"
}

要求：
- 只返回 JSON，不要任何额外文字、不要代码块标记
- entities 中没有内容的子字段返回空数组 []
- entities 每个子字段最多 6 项
- title 控制在 8 个汉字以内，简洁有画面感
- search_text 要覆盖：物体、场景、情绪、用户原话精炼、同义词、可能的搜索词
- 不要输出 Markdown，不要解释字段含义`;
}

function buildCompactMemoryCardPrompt(input: MemoryCardInput): string {
  return `上一次输出不是合法 JSON。请基于以下信息重新生成一张简短记忆卡，只返回可被 JSON.parse 解析的 JSON 对象。

输入：
${JSON.stringify(
  {
    vision_caption: input.visionCaption,
    ocr_text: input.ocrText.slice(0, 800),
    speech_text: input.speechText,
    user_note: input.userNote,
    created_at: input.createdAt,
    location_text: input.locationText,
  },
  null,
  2
)}

输出格式：
{
  "title": "8字以内标题",
  "summary": "1句话摘要",
  "tags": ["4-8个中文标签"],
  "entities": {
    "food": [],
    "place": [],
    "person": [],
    "emotion": [],
    "action_intent": []
  },
  "search_text": "15-25个空格分隔关键词"
}

只返回 JSON，不要 Markdown，不要额外解释。`;
}

interface RawMemoryCard {
  title?: string;
  summary?: string;
  tags?: string[];
  entities?: Record<string, string[]>;
  search_text?: string;
}

export async function generateMemoryCard(
  input: MemoryCardInput
): Promise<MemoryCard> {
  async function requestCard(prompt: string, maxTokens: number): Promise<RawMemoryCard> {
    const client = getClient();
    const res = await client.chat.completions.create({
      model: modelId("LLM"),
      messages: [
        { role: "system", content: MEMORY_CARD_SYSTEM },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
    });

    const text = res.choices[0]?.message?.content ?? "";
    if (!text.trim()) throw new Error("LLM returned empty response");
    return extractJson<RawMemoryCard>(text);
  }

  let parsed: RawMemoryCard;
  try {
    parsed = await requestCard(buildMemoryCardPrompt(input), 2200);
  } catch (err) {
    if (!isJsonExtractionError(err)) throw err;
    parsed = await requestCard(buildCompactMemoryCardPrompt(input), 1600);
  }

  return {
    title: parsed.title?.trim() ?? "未命名记忆",
    summary: parsed.summary?.trim() ?? "",
    tags: Array.isArray(parsed.tags) ? parsed.tags : [],
    entities: parsed.entities && typeof parsed.entities === "object" ? parsed.entities : {},
    searchText: parsed.search_text?.trim() ?? "",
  };
}

// ---------------- Query Plan ----------------

export interface QueryPlan {
  intent: string;
  queryType: "exact_lookup" | "fuzzy_memory" | "time_location" | "context";
  keywords: string[];
  possibleEntities: string[];
  timeHint: string;
  locationHint: string;
  mustHave: string[];
  shouldHave: string[];
}

const QUERY_PLAN_SYSTEM = `你是一个"记忆检索意图分析助手"。把用户的自然语言问题转成结构化检索计划，主动扩展同义词、情绪词、意图词。`;

function buildQueryPlanPrompt(userQuery: string, nowIso: string): string {
  return `当前时间：${nowIso}
用户问题：${userQuery}

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
}

interface RawQueryPlan {
  intent?: string;
  query_type?: string;
  keywords?: string[];
  possible_entities?: string[];
  time_hint?: string;
  location_hint?: string;
  must_have?: string[];
  should_have?: string[];
}

export async function planQuery(userQuery: string): Promise<QueryPlan> {
  const client = getClient();
  const res = await client.chat.completions.create({
    model: modelId("LLM"),
    messages: [
      { role: "system", content: QUERY_PLAN_SYSTEM },
      { role: "user", content: buildQueryPlanPrompt(userQuery, new Date().toISOString()) },
    ],
    temperature: 0.2,
    max_tokens: 1000,
    response_format: { type: "json_object" },
  });

  const text = res.choices[0]?.message?.content ?? "";
  if (!text.trim()) throw new Error("LLM returned empty response (planQuery)");
  const parsed = extractJson<RawQueryPlan>(text);

  const qt = parsed.query_type ?? "fuzzy_memory";
  const queryType: QueryPlan["queryType"] =
    qt === "exact_lookup" || qt === "fuzzy_memory" || qt === "time_location" || qt === "context"
      ? qt
      : "fuzzy_memory";

  return {
    intent: parsed.intent ?? "find_memory",
    queryType,
    keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
    possibleEntities: Array.isArray(parsed.possible_entities) ? parsed.possible_entities : [],
    timeHint: parsed.time_hint ?? "",
    locationHint: parsed.location_hint ?? "",
    mustHave: Array.isArray(parsed.must_have) ? parsed.must_have : [],
    shouldHave: Array.isArray(parsed.should_have) ? parsed.should_have : [],
  };
}

// ---------------- Rerank ----------------

export interface RerankCandidate {
  id: string;
  title: string | null;
  summary: string | null;
  tags: string[];
  speechText: string | null;
  userNote: string | null;
  ocrText: string | null;
  createdAt: string;
  locationText: string | null;
}

export interface RerankResult {
  bestMatchId: string;
  confidence: number;
  answer: string;
  reason: string;
}

const RERANK_SYSTEM = `你是一个"记忆检索复核助手"。从候选记忆中选出与用户问题最匹配的一条，给出置信度和理由。`;

function buildRerankPrompt(userQuery: string, candidates: RerankCandidate[]): string {
  return `用户问题：${userQuery}

候选记忆（共 ${candidates.length} 条）：
${JSON.stringify(candidates, null, 2)}

请输出严格 JSON：
{
  "best_match_id": "选中候选的 id",
  "confidence": 0.0 到 1.0 的浮点数,
  "answer": "一句话回答用户的问题，可直接展示给用户",
  "reason": "为什么这条最匹配，要引用候选记忆里的具体词语"
}

置信度评分标准：
- ≥ 0.75：高置信，候选明确匹配问题
- 0.45 ~ 0.75：中置信，看起来相关但不完全确定
- < 0.45：低置信，没有真正匹配的候选

只返回 JSON，不要任何额外文字。`;
}

interface RawRerank {
  best_match_id?: string;
  confidence?: number;
  answer?: string;
  reason?: string;
}

export async function rerankCandidates(
  userQuery: string,
  candidates: RerankCandidate[]
): Promise<RerankResult> {
  if (candidates.length === 0) {
    return {
      bestMatchId: "",
      confidence: 0,
      answer: "暂时没有找到相关记忆。",
      reason: "候选列表为空",
    };
  }

  const client = getClient();
  const res = await client.chat.completions.create({
    model: modelId("LLM"),
    messages: [
      { role: "system", content: RERANK_SYSTEM },
      { role: "user", content: buildRerankPrompt(userQuery, candidates) },
    ],
    temperature: 0.2,
    max_tokens: 1000,
    response_format: { type: "json_object" },
  });

  const text = res.choices[0]?.message?.content ?? "";
  if (!text.trim()) throw new Error("LLM returned empty response (rerank)");
  const parsed = extractJson<RawRerank>(text);

  const confidence = typeof parsed.confidence === "number" ? parsed.confidence : 0;
  return {
    bestMatchId: parsed.best_match_id ?? candidates[0].id,
    confidence: Math.max(0, Math.min(1, confidence)),
    answer: parsed.answer ?? "",
    reason: parsed.reason ?? "",
  };
}
