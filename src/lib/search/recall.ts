// Keyword recall + weighted scoring (doc section 7.4-7.5).
// SQLite + Prisma: in-memory scoring of all completed/partial memories.
// For MVP scale (<1k memories) this is fast enough; later we can switch to FTS5.

import { prisma } from "@/lib/db";
import type { QueryPlan } from "@/lib/ai/llm";

export interface ScoredMemory {
  id: string;
  score: number;
  hitFields: string[];
  matchedKeywords: string[];
}

// Doc section 7.4 field weights
const FIELD_WEIGHTS: Record<string, number> = {
  title: 5,
  tags: 5,
  searchText: 4,
  speechText: 4,
  userNote: 4,
  summary: 3,
  ocrText: 3,
  visionCaption: 2,
  locationText: 2,
};

function countOccurrences(haystack: string | null, needle: string): number {
  if (!haystack || !needle || needle.length === 0) return 0;
  // Case-insensitive for English; Chinese is case-insensitive by default
  const h = haystack.toLowerCase();
  const n = needle.toLowerCase();
  let count = 0;
  let pos = 0;
  while ((pos = h.indexOf(n, pos)) !== -1) {
    count++;
    pos += n.length;
  }
  return count;
}

function uniqueNonEmpty(arr: string[]): string[] {
  return Array.from(new Set(arr.filter((s) => s && s.trim().length > 0).map((s) => s.trim())));
}

export async function recallCandidates(
  plan: QueryPlan,
  limit = 10
): Promise<ScoredMemory[]> {
  const memories = await prisma.memory.findMany({
    where: { status: { in: ["completed", "partial"] } },
    orderBy: { createdAt: "desc" },
  });

  const allKeywords = uniqueNonEmpty([
    ...plan.keywords,
    ...plan.possibleEntities,
    ...plan.mustHave,
    ...plan.shouldHave,
  ]);

  if (allKeywords.length === 0 || memories.length === 0) return [];

  const mustHaveSet = new Set(plan.mustHave.map((k) => k.trim()).filter(Boolean));

  type Scored = {
    id: string;
    createdAt: Date;
    score: number;
    hitFields: Set<string>;
    matchedKeywords: Set<string>;
    mustHits: Set<string>;
  };

  const scored: Scored[] = memories.map((m) => {
    const fields: Record<string, string | null> = {
      title: m.title,
      tags: m.tags,
      searchText: m.searchText,
      speechText: m.speechText,
      userNote: m.userNote,
      summary: m.summary,
      ocrText: m.ocrText,
      visionCaption: m.visionCaption,
      locationText: m.locationText,
    };

    let score = 0;
    const hitFields = new Set<string>();
    const matchedKeywords = new Set<string>();
    const mustHits = new Set<string>();

    for (const kw of allKeywords) {
      let kwMatched = false;
      for (const [fieldName, weight] of Object.entries(FIELD_WEIGHTS)) {
        const hits = countOccurrences(fields[fieldName], kw);
        if (hits > 0) {
          score += hits * weight;
          hitFields.add(fieldName);
          kwMatched = true;
        }
      }
      if (kwMatched) {
        matchedKeywords.add(kw);
        if (mustHaveSet.has(kw)) mustHits.add(kw);
      }
    }

    // Mild recency bonus (doc section 7.5 — small effect, doesn't dominate)
    const ageDays = (Date.now() - m.createdAt.getTime()) / 86400000;
    if (ageDays < 1) score += 2;
    else if (ageDays < 7) score += 1;

    return {
      id: m.id,
      createdAt: m.createdAt,
      score,
      hitFields,
      matchedKeywords,
      mustHits,
    };
  });

  // Must-have filter: candidates need to hit ALL must-have keywords.
  // Fallback: if filter wipes everyone, drop the filter (better to surface
  // *something* than to leave the user empty-handed).
  const mustHaveCount = mustHaveSet.size;
  let usable = scored;
  if (mustHaveCount > 0) {
    const strict = scored.filter((c) => c.mustHits.size === mustHaveCount);
    if (strict.length > 0) usable = strict;
  }

  return usable
    .filter((c) => c.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.createdAt.getTime() - a.createdAt.getTime();
    })
    .slice(0, limit)
    .map((c) => ({
      id: c.id,
      score: c.score,
      hitFields: Array.from(c.hitFields),
      matchedKeywords: Array.from(c.matchedKeywords),
    }));
}
