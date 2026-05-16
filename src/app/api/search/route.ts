// POST /api/search — natural-language memory retrieval.
// Pipeline: planQuery (LLM) -> recall (keyword scoring) -> rerank (LLM or
// local synthesis when the candidate set is unambiguous) -> tiered response.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  planQuery,
  rerankCandidates,
  type RerankCandidate,
  type RerankResult,
} from "@/lib/ai/llm";
import { recallCandidates } from "@/lib/search/recall";
import {
  shouldSkipRerank,
  synthesizeRerankResult,
} from "@/lib/search/synthesize";

export const runtime = "nodejs";

export interface SearchResult {
  id: string;
  title: string | null;
  summary: string | null;
  imageUrl: string;
  audioUrl: string | null;
  tags: string[];
  createdAt: string;
  locationText: string | null;
  score: number;
  isBestMatch: boolean;
  reason: string | null;
  matchedKeywords: string[];
}

export interface SearchResponse {
  query: string;
  answer: string;
  confidence: number;
  tier: "high" | "medium" | "low" | "empty";
  plan: Awaited<ReturnType<typeof planQuery>>;
  rerankMode: "llm" | "single_candidate" | "dominant_score";
  results: SearchResult[];
  suggestions?: string[];
}

const SUGGESTION_POOL = [
  "甜品",
  "截图",
  "票据",
  "上周",
  "咖啡",
  "密码",
  "餐厅",
  "好吃的",
];

export async function POST(req: NextRequest) {
  let body: { query?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const query = body.query?.trim();
  if (!query) {
    return NextResponse.json({ error: "query is required" }, { status: 400 });
  }

  // --- Step 1: plan ---
  const plan = await planQuery(query);

  // --- Step 2: recall ---
  const recalled = await recallCandidates(plan, 10);

  if (recalled.length === 0) {
    const response: SearchResponse = {
      query,
      answer:
        "我暂时没有找到匹配的记忆。你可以换个说法试试，比如直接说物品、时间或地点。",
      confidence: 0,
      tier: "empty",
      plan,
      rerankMode: "llm",
      results: [],
      suggestions: SUGGESTION_POOL,
    };
    return NextResponse.json(response);
  }

  // --- Step 3: load full memory objects (preserving recall order) ---
  const recalledIds = recalled.map((r) => r.id);
  const fetchedMemories = await prisma.memory.findMany({
    where: { id: { in: recalledIds } },
  });
  const memoriesById = new Map(
    fetchedMemories.map((m) => [m.id, m] as const)
  );
  const orderedMemories = recalledIds
    .map((id) => memoriesById.get(id))
    .filter((m): m is NonNullable<typeof m> => m != null);

  // --- Step 4: rerank — LLM call or local synthesis ---
  // Skip the LLM rerank when the candidate set is unambiguous (one result
  // or a clear winner). Saves ~7s per query in the common case.
  const skip = shouldSkipRerank(recalled);
  let rerank: RerankResult;
  let rerankMode: SearchResponse["rerankMode"] = "llm";
  if (skip.skip && skip.reason) {
    rerank = synthesizeRerankResult(recalled, plan, {
      id: orderedMemories[0].id,
      title: orderedMemories[0].title,
    });
    rerankMode = skip.reason;
  } else {
    const rerankInput: RerankCandidate[] = orderedMemories.map((m) => ({
      id: m.id,
      title: m.title,
      summary: m.summary,
      tags: m.tags ? (JSON.parse(m.tags) as string[]) : [],
      speechText: m.speechText,
      userNote: m.userNote,
      ocrText: m.ocrText,
      createdAt: m.createdAt.toISOString(),
      locationText: m.locationText,
    }));
    rerank = await rerankCandidates(query, rerankInput);
  }

  // --- Step 5: tier the response by confidence (doc section 7.7) ---
  const tier: SearchResponse["tier"] =
    rerank.confidence >= 0.75 ? "high"
    : rerank.confidence >= 0.45 ? "medium"
    : "low";

  // Assemble result list — best match first, then by recall score
  const scoreById = new Map(recalled.map((r) => [r.id, r]));
  const results: SearchResult[] = orderedMemories.map((m) => {
    const s = scoreById.get(m.id);
    const isBest = m.id === rerank.bestMatchId;
    return {
      id: m.id,
      title: m.title,
      summary: m.summary,
      imageUrl: m.imageUrl,
      audioUrl: m.audioUrl,
      tags: m.tags ? (JSON.parse(m.tags) as string[]) : [],
      createdAt: m.createdAt.toISOString(),
      locationText: m.locationText,
      score: s?.score ?? 0,
      isBestMatch: isBest,
      reason: isBest ? rerank.reason : null,
      matchedKeywords: s?.matchedKeywords ?? [],
    };
  });

  // Apply confidence-tier rendering rules:
  //   high   -> single result
  //   medium -> 2-3 candidates
  //   low    -> top 5 candidates + suggestions
  let trimmed = results;
  if (tier === "high") {
    trimmed = results.filter((r) => r.isBestMatch).slice(0, 1);
    if (trimmed.length === 0) trimmed = results.slice(0, 1);
  } else if (tier === "medium") {
    trimmed = [
      ...results.filter((r) => r.isBestMatch),
      ...results.filter((r) => !r.isBestMatch),
    ].slice(0, 3);
  } else {
    trimmed = [
      ...results.filter((r) => r.isBestMatch),
      ...results.filter((r) => !r.isBestMatch),
    ].slice(0, 5);
  }

  const response: SearchResponse = {
    query,
    answer: rerank.answer,
    confidence: rerank.confidence,
    tier,
    plan,
    rerankMode,
    results: trimmed,
    suggestions: tier === "low" ? SUGGESTION_POOL : undefined,
  };
  return NextResponse.json(response);
}
