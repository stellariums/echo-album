"use client";

import { useState } from "react";
import Link from "next/link";
import { AudioPlayer } from "@/components/AudioPlayer";

interface InitialMemory {
  id: string;
  title: string | null;
  summary: string | null;
  imageUrl: string;
  audioUrl: string | null;
  tags: string[];
  createdAt: string;
  locationText: string | null;
  status: string;
}

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
  "我上次说很好吃的甜品",
  "客户 Wi-Fi 密码截图",
  "上周拍的票据",
  "适合写东西的咖啡店",
];

export function MemoriesBrowser({ initial }: { initial: InitialMemory[] }) {
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

  function clearSearch() {
    setQuery("");
    setResponse(null);
    setError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    void runSearch(query);
  }

  const inSearchMode = response !== null || submitting || error !== null;

  return (
    <div className="space-y-5 py-2">
      <header className="space-y-2 pt-2">
        <div className="text-xs font-semibold text-brand-teal uppercase tracking-[0.2em]">
          Memories
        </div>
        <h1 className="text-2xl font-bold text-ink-main tracking-tight">
          回忆
        </h1>
      </header>

      {/* Pill search bar */}
      <form onSubmit={handleSubmit}>
        <div className="rounded-full bg-white h-14 flex items-center px-5 gap-3 shadow-soft-sm focus-within:shadow-soft transition">
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-ink-sub shrink-0">
            <path d="M15.5 14h-.8l-.27-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.6 4.23-1.57l.27.28v.79L19 20.49 20.49 19l-4.99-5zm-6 0a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9z" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="用自然语言找：我上次说很好吃的甜品？"
            disabled={submitting}
            className="flex-1 bg-transparent border-0 outline-none text-[15px] text-ink-main placeholder:text-ink-mute font-medium min-w-0"
          />
          {inSearchMode ? (
            <button
              type="button"
              onClick={clearSearch}
              aria-label="清除搜索"
              className="w-9 h-9 rounded-full bg-paper-bg text-ink-sub flex items-center justify-center hover:bg-paper-edge transition shrink-0"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                <path d="M19 6.4 17.6 5 12 10.6 6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12z" />
              </svg>
            </button>
          ) : (
            <button
              type="submit"
              disabled={submitting || !query.trim()}
              aria-label="搜索"
              className={`w-9 h-9 rounded-full flex items-center justify-center transition shrink-0 ${
                submitting || !query.trim()
                  ? "bg-paper-edge text-ink-mute cursor-not-allowed"
                  : "bg-brand-teal text-white shadow-glow-teal hover:bg-brand-teal-deep"
              }`}
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                <path d="M19 8l-1.5 3.5L14 13l3.5 1.5L19 18l1.5-3.5L24 13l-3.5-1.5L19 8zm-8 1.5L8.5 2 6 9.5 2 12l4 2.5L8.5 22l2.5-7.5L15 12l-4-2.5z" />
              </svg>
            </button>
          )}
        </div>
      </form>

      {/* Browse mode: examples + grid */}
      {!inSearchMode && (
        <BrowseMode initial={initial} onExample={runSearch} />
      )}

      {/* Search mode states */}
      {error && (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {submitting && (
        <div className="rounded-3xl glass p-4 text-sm text-brand-teal flex items-center gap-3 shadow-soft-sm">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-teal opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-teal"></span>
          </span>
          <span>AI 正在改写问题、查找候选、重排…</span>
        </div>
      )}

      {response && <SearchResultsView response={response} onSuggestion={runSearch} />}
    </div>
  );
}

function BrowseMode({
  initial,
  onExample,
}: {
  initial: InitialMemory[];
  onExample: (q: string) => void;
}) {
  return (
    <>
      <div className="space-y-2 pt-1">
        <div className="text-xs font-semibold text-ink-mute uppercase tracking-[0.2em] px-1">
          试试这样问
        </div>
        <div className="flex flex-wrap gap-2">
          {EXAMPLE_QUERIES.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => onExample(q)}
              className="text-sm rounded-full bg-white border border-paper-edge px-4 py-2 text-ink-sub hover:border-brand-teal hover:text-brand-teal transition"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      <section className="space-y-3 pt-2">
        <div className="flex items-baseline justify-between px-1">
          <h2 className="text-xs font-semibold text-ink-mute uppercase tracking-[0.2em]">
            全部 · {initial.length} 张
          </h2>
        </div>

        {initial.length === 0 ? (
          <div className="rounded-3xl bg-white p-10 text-center shadow-soft-sm">
            <div className="text-4xl mb-3">📷</div>
            <div className="text-sm text-ink-sub mb-3">还没有记忆</div>
            <Link
              href="/create"
              className="inline-flex items-center gap-1.5 rounded-full bg-brand-teal text-white px-4 py-2 text-sm font-medium shadow-glow-teal hover:bg-brand-teal-deep transition"
            >
              创建第一张
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {initial.map((m) => (
              <Link
                key={m.id}
                href={`/memory/${m.id}`}
                className="block rounded-3xl bg-white p-1.5 shadow-soft-sm hover:shadow-soft transition group"
              >
                <div className="relative aspect-square rounded-[18px] overflow-hidden bg-paper-bg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={m.imageUrl}
                    alt={m.title ?? "memory"}
                    className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                  />
                  {m.audioUrl && (
                    <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/40 backdrop-blur flex items-center justify-center">
                      <svg viewBox="0 0 24 24" className="w-3 h-3 fill-white">
                        <path d="M12 2a5 5 0 0 0-5 5v6a5 5 0 0 0 10 0V7a5 5 0 0 0-5-5zM5 11a1 1 0 0 1 2 0 5 5 0 0 0 10 0 1 1 0 0 1 2 0 7 7 0 0 1-6 6.93V21a1 1 0 0 1-2 0v-3.07A7 7 0 0 1 5 11z" />
                      </svg>
                    </div>
                  )}
                  {(m.status === "pending" || m.status === "processing") && (
                    <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-black/50 backdrop-blur text-[10px] text-white">
                      处理中
                    </div>
                  )}
                </div>
                <div className="px-2 pt-2 pb-1">
                  <div className="text-sm font-medium text-ink-main truncate">
                    {m.title ?? "未命名记忆"}
                  </div>
                  <div className="text-[11px] text-ink-mute mt-0.5">
                    {new Date(m.createdAt).toLocaleDateString("zh-CN")}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function SearchResultsView({
  response,
  onSuggestion,
}: {
  response: SearchResponse;
  onSuggestion: (q: string) => void;
}) {
  const { answer, confidence, tier, results, suggestions } = response;

  const tierMap = {
    high: { label: "找到了", chipBg: "bg-brand-teal" },
    medium: { label: "可能相关", chipBg: "bg-brand-orange" },
    low: { label: "不太确定", chipBg: "bg-ink-mute" },
    empty: { label: "没找到", chipBg: "bg-ink-mute" },
  };
  const tierStyle = tierMap[tier];

  return (
    <div className="space-y-4">
      <div className="rounded-3xl bg-white p-5 shadow-soft-sm">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span
            className={`text-[11px] font-semibold tracking-wider uppercase text-white px-2 py-0.5 rounded-full ${tierStyle.chipBg}`}
          >
            {tierStyle.label}
          </span>
          <span className="text-xs text-ink-mute">
            置信度 {Math.round(confidence * 100)}%
          </span>
          <span className="text-xs text-ink-mute ml-auto">
            找到 <span className="text-ink-main font-semibold">{results.length}</span> 张
          </span>
        </div>
        <div className="text-[15px] text-ink-main leading-relaxed">{answer}</div>
      </div>

      {results.length > 0 && (
        <div className="space-y-4">
          {results.map((r, idx) =>
            r.isBestMatch ? (
              <FeaturedResult key={r.id} result={r} />
            ) : (
              <CompactResult key={r.id} result={r} rank={idx + 1} />
            )
          )}
        </div>
      )}

      {tier === "low" && suggestions && suggestions.length > 0 && (
        <div className="space-y-2 pt-2">
          <div className="text-xs font-semibold text-ink-mute uppercase tracking-[0.2em] px-1">
            换个词试试
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onSuggestion(s)}
                className="text-sm rounded-full bg-white border border-paper-edge px-4 py-1.5 text-ink-sub hover:border-brand-teal hover:text-brand-teal transition"
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

function FeaturedResult({ result }: { result: SearchResult }) {
  return (
    <Link href={`/memory/${result.id}`} className="block group">
      <div className="relative">
        <div className="rounded-4xl bg-white p-1.5 shadow-soft">
          <div className="relative aspect-[4/5] rounded-[24px] overflow-hidden bg-paper-bg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={result.imageUrl}
              alt={result.title ?? ""}
              className="w-full h-full object-cover group-hover:scale-[1.01] transition-transform duration-300"
            />
            <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-brand-teal text-white text-[11px] font-semibold shadow-glow-teal">
              ✦ 最匹配
            </div>
          </div>
        </div>

        <div className="-mt-12 mx-3 sm:mx-4 rounded-4xl glass p-5 shadow-soft relative">
          <h3 className="text-lg font-semibold text-ink-main truncate mb-1">
            {result.title ?? "未命名记忆"}
          </h3>
          <div className="text-xs text-ink-mute mb-3">
            {new Date(result.createdAt).toLocaleDateString("zh-CN")}
            {result.locationText ? ` · ${result.locationText}` : ""}
          </div>
          {result.summary && (
            <p className="text-sm text-ink-sub leading-relaxed mb-3">
              {result.summary}
            </p>
          )}
          {result.reason && (
            <div className="text-xs text-brand-teal leading-snug mb-3 bg-brand-teal/8 rounded-2xl px-3 py-2">
              <span className="font-semibold">匹配原因：</span>
              {result.reason}
            </div>
          )}
          {result.audioUrl && (
            <div onClick={(e) => e.preventDefault()}>
              <AudioPlayer src={result.audioUrl} seed={result.id} />
            </div>
          )}
          {result.matchedKeywords.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {result.matchedKeywords.slice(0, 6).map((k) => (
                <span
                  key={k}
                  className="text-[11px] px-2 py-0.5 rounded-full bg-paper-bg text-ink-sub"
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

function CompactResult({ result, rank }: { result: SearchResult; rank: number }) {
  return (
    <Link
      href={`/memory/${result.id}`}
      className="block rounded-3xl bg-white p-3 shadow-soft-sm hover:shadow-soft transition"
    >
      <div className="flex gap-3">
        <div className="relative w-24 h-24 shrink-0 rounded-2xl overflow-hidden bg-paper-bg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={result.imageUrl}
            alt={result.title ?? ""}
            className="w-full h-full object-cover"
          />
          <div className="absolute top-1 left-1 w-5 h-5 rounded-full bg-white/95 flex items-center justify-center text-[10px] font-bold text-ink-sub">
            {rank}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-ink-main truncate">
            {result.title ?? "未命名记忆"}
          </div>
          <div className="text-[11px] text-ink-mute mt-0.5">
            {new Date(result.createdAt).toLocaleDateString("zh-CN")}
            {result.locationText ? ` · ${result.locationText}` : ""}
          </div>
          {result.summary && (
            <div className="text-xs text-ink-sub mt-1.5 line-clamp-2 leading-relaxed">
              {result.summary}
            </div>
          )}
          {result.matchedKeywords.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {result.matchedKeywords.slice(0, 4).map((k) => (
                <span
                  key={k}
                  className="text-[10px] px-1.5 py-0.5 rounded-full bg-paper-bg text-ink-sub"
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
