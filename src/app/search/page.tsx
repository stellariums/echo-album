"use client";

import { useState } from "react";
import Link from "next/link";

interface SearchResult {
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

interface SearchResponse {
  query: string;
  answer: string;
  confidence: number;
  tier: "high" | "medium" | "low" | "empty";
  results: SearchResult[];
  suggestions?: string[];
}

const EXAMPLE_QUERIES = [
  "我上次说很好吃的甜品是哪张？",
  "客户 Wi-Fi 密码截图在哪？",
  "上周在咖啡店拍了什么？",
  "那张写实验数据的截图",
];

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<SearchResponse | null>(null);

  async function runSearch(q: string) {
    const cleaned = q.trim();
    if (!cleaned) return;
    setQuery(cleaned);
    setSubmitting(true);
    setError(null);
    setResponse(null);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: cleaned }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}) as { error?: string });
        throw new Error(data.error || `请求失败 (${res.status})`);
      }
      const data = (await res.json()) as SearchResponse;
      setResponse(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "搜索失败");
    } finally {
      setSubmitting(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    void runSearch(query);
  }

  return (
    <div className="space-y-5 py-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">搜索记忆</h1>
        <p className="text-sm text-stone-600">
          用自然语言描述你要找的照片。
        </p>
      </header>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="例：我上次说很好吃的甜品？"
          className="flex-1 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
          disabled={submitting}
        />
        <button
          type="submit"
          disabled={submitting || !query.trim()}
          className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition ${
            submitting || !query.trim()
              ? "bg-stone-300 cursor-not-allowed"
              : "bg-stone-900 hover:bg-stone-700"
          }`}
        >
          {submitting ? "搜索中…" : "搜索"}
        </button>
      </form>

      {/* Example queries shown when no response yet */}
      {!response && !submitting && !error && (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
            试试这样问
          </div>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_QUERIES.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => void runSearch(q)}
                className="text-xs rounded-full border border-stone-300 bg-white px-3 py-1 text-stone-700 hover:border-stone-500 hover:bg-stone-50"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {submitting && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 flex items-center gap-3">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
          </span>
          <span>AI 正在改写问题、查找候选、重排…</span>
        </div>
      )}

      {response && <SearchResults response={response} onSuggestion={runSearch} />}
    </div>
  );
}

function SearchResults({
  response,
  onSuggestion,
}: {
  response: SearchResponse;
  onSuggestion: (q: string) => void;
}) {
  const { answer, confidence, tier, results, suggestions } = response;

  const tierStyle = {
    high: {
      bg: "bg-emerald-50 border-emerald-200 text-emerald-900",
      label: "找到了",
    },
    medium: {
      bg: "bg-amber-50 border-amber-200 text-amber-900",
      label: "可能相关",
    },
    low: {
      bg: "bg-stone-50 border-stone-200 text-stone-800",
      label: "不太确定",
    },
    empty: {
      bg: "bg-stone-50 border-stone-200 text-stone-700",
      label: "没找到",
    },
  }[tier];

  return (
    <div className="space-y-4">
      <div className={`rounded-lg border p-3 text-sm ${tierStyle.bg}`}>
        <div className="text-xs font-semibold uppercase tracking-wider mb-1">
          {tierStyle.label} · 置信度 {Math.round(confidence * 100)}%
        </div>
        <div>{answer}</div>
      </div>

      {results.length > 0 && (
        <div className="space-y-3">
          {results.map((r) => (
            <ResultCard key={r.id} result={r} />
          ))}
        </div>
      )}

      {tier === "low" && suggestions && suggestions.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
            换个词试试
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onSuggestion(s)}
                className="text-xs rounded-full border border-stone-300 bg-white px-3 py-1 text-stone-700 hover:border-stone-500"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ResultCard({ result }: { result: SearchResult }) {
  return (
    <Link
      href={`/memory/${result.id}`}
      className={`block rounded-xl overflow-hidden bg-white transition ${
        result.isBestMatch
          ? "border-2 border-emerald-400 shadow-sm"
          : "border border-stone-200 hover:border-stone-400"
      }`}
    >
      <div className="flex">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={result.imageUrl}
          alt={result.title ?? ""}
          className="w-28 h-28 object-cover bg-stone-100 shrink-0"
        />
        <div className="p-3 flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <div className="font-medium text-sm truncate">
              {result.title ?? "未命名记忆"}
            </div>
            {result.isBestMatch && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 shrink-0">
                最匹配
              </span>
            )}
          </div>
          <div className="text-xs text-stone-500 mt-0.5">
            {new Date(result.createdAt).toLocaleString("zh-CN")}
            {result.locationText ? ` · ${result.locationText}` : ""}
          </div>
          {result.summary && (
            <div className="text-xs text-stone-600 mt-1.5 line-clamp-2">
              {result.summary}
            </div>
          )}
          {result.reason && (
            <div className="text-xs text-emerald-700 mt-1.5 leading-snug">
              <span className="font-semibold">匹配原因：</span>
              {result.reason}
            </div>
          )}
          {result.matchedKeywords.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {result.matchedKeywords.slice(0, 6).map((k) => (
                <span
                  key={k}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-stone-100 text-stone-700"
                >
                  {k}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
