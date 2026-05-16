// Local synthesis of the rerank step's output when an LLM call would be
// wasteful — e.g. the candidate list is unambiguous (single result or one
// candidate dominates by score). Saves ~7s on the search round-trip.

import type { QueryPlan, RerankResult } from "@/lib/ai/llm";
import type { ScoredMemory } from "./recall";

interface CandidateSummary {
  id: string;
  title: string | null;
}

const FIELD_LABELS: Record<string, string> = {
  title: "标题",
  tags: "标签",
  searchText: "搜索关键词",
  speechText: "语音转录",
  userNote: "你的备注",
  summary: "摘要",
  ocrText: "OCR 文字",
  visionCaption: "图片描述",
  locationText: "地点",
};

const FIELD_ORDER = [
  "title",
  "tags",
  "userNote",
  "speechText",
  "ocrText",
  "searchText",
  "summary",
  "visionCaption",
  "locationText",
];

export interface SkipDecision {
  skip: boolean;
  reason: "single_candidate" | "dominant_score" | null;
}

/**
 * Decide whether the rerank LLM call can be safely skipped.
 *
 * Two conditions:
 *   - only one candidate (LLM has nothing to choose from), or
 *   - the top candidate's score is dominantScoreRatio× the runner-up's
 *     (clear winner — LLM would almost certainly pick the same one).
 */
export function shouldSkipRerank(
  recalled: ScoredMemory[],
  dominantScoreRatio = 1.8
): SkipDecision {
  if (recalled.length === 0) return { skip: false, reason: null };
  if (recalled.length === 1) {
    return { skip: true, reason: "single_candidate" };
  }
  const top = recalled[0];
  const second = recalled[1];
  if (second.score <= 0) {
    // Runner-up has zero score — top is the only real match.
    return { skip: true, reason: "dominant_score" };
  }
  if (top.score >= second.score * dominantScoreRatio) {
    return { skip: true, reason: "dominant_score" };
  }
  return { skip: false, reason: null };
}

function uniqueNonEmpty(arr: string[]): string[] {
  return Array.from(
    new Set(arr.filter((s) => s && s.trim().length > 0).map((s) => s.trim()))
  );
}

/**
 * Heuristic confidence derived from how many of the queried keywords actually
 * landed on the top candidate. Calibrated to align with the LLM's tiering:
 *   ≥ 0.75 → high · 0.45–0.75 → medium · < 0.45 → low.
 */
export function deterministicConfidence(
  top: ScoredMemory,
  plan: QueryPlan,
  candidatesCount: number
): number {
  const queryKeywords = uniqueNonEmpty([
    ...plan.keywords,
    ...plan.mustHave,
    ...plan.shouldHave,
  ]);
  const matched = top.matchedKeywords.length;
  const hitRatio = queryKeywords.length > 0
    ? Math.min(1, matched / queryKeywords.length)
    : 0.5;

  let conf = 0.55 + hitRatio * 0.32;

  // Single-candidate bonus — no ambiguity.
  if (candidatesCount === 1) conf += 0.05;
  // Title hits are a strong signal that the candidate is on-topic.
  if (top.hitFields.includes("title")) conf += 0.05;
  // Tag hits are also strong.
  if (top.hitFields.includes("tags")) conf += 0.03;

  return Math.min(0.95, Math.max(0.45, conf));
}

function formatReason(top: ScoredMemory): string {
  const orderedFields = FIELD_ORDER.filter((f) => top.hitFields.includes(f));
  const fieldLabels = orderedFields
    .slice(0, 3)
    .map((f) => FIELD_LABELS[f] ?? f);
  const fieldPart =
    fieldLabels.length > 0 ? `${fieldLabels.join(" + ")}命中` : "关键词命中";

  const kwSample = top.matchedKeywords.slice(0, 5).map((k) => `「${k}」`).join("、");
  const extra =
    top.matchedKeywords.length > 5
      ? `（共 ${top.matchedKeywords.length} 个关键词）`
      : "";
  return `${fieldPart}：${kwSample}${extra}`;
}

function formatAnswer(
  topMemory: CandidateSummary,
  confidence: number,
  candidatesCount: number
): string {
  const title = topMemory.title?.trim() || "未命名记忆";
  if (candidatesCount === 1) {
    return `只有一张相关记忆——「${title}」。`;
  }
  if (confidence >= 0.75) {
    return `你找的应该是这张「${title}」。`;
  }
  return `可能是这张「${title}」。`;
}

export function synthesizeRerankResult(
  recalled: ScoredMemory[],
  plan: QueryPlan,
  topMemory: CandidateSummary
): RerankResult {
  const top = recalled[0];
  const confidence = deterministicConfidence(top, plan, recalled.length);
  return {
    bestMatchId: top.id,
    confidence,
    answer: formatAnswer(topMemory, confidence, recalled.length),
    reason: formatReason(top),
  };
}
