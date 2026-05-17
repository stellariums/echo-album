"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AudioPlayer } from "@/components/AudioPlayer";
import { apiFetch, assetUrl } from "@/lib/config";

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

export function MemoriesBrowser() {
  const [initial, setInitial] = useState<InitialMemory[] | null>(null);
  const [initialError, setInitialError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<SearchResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await apiFetch("/api/memories", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const rows = (await res.json()) as Array<{
          id: string;
          title: string | null;
          summary: string | null;
          imageUrl: string;
          audioUrl: string | null;
          tags: string | null;
          createdAt: string;
          locationText: string | null;
          status: string;
        }>;
        if (cancelled) return;
        setInitial(
          rows.map((m) => ({
            id: m.id,
            title: m.title,
            summary: m.summary,
            imageUrl: m.imageUrl,
            audioUrl: m.audioUrl,
            tags: m.tags ? (JSON.parse(m.tags) as string[]) : [],
            createdAt: m.createdAt,
            locationText: m.locationText,
            status: m.status,
          }))
        );
      } catch (err) {
        if (!cancelled) {
          setInitialError(err instanceof Error ? err.message : "加载失败");
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function runSearch(q: string) {
    const cleaned = q.trim();
    if (!cleaned) return;
    setQuery(cleaned);
    setSubmitting(true);
    setError(null);
    setResponse(null);
    try {
      const res = await apiFetch("/api/search", {
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
        <div className="text-xs font-semibold text-brand-coral uppercase tracking-[0.2em]">
          Memories
        </div>
        <h1 className="text-2xl font-bold text-ink-main tracking-tight">
          回忆
        </h1>
      </header>

      {/* Pill search bar */}
      <form onSubmit={handleSubmit}>
        <div
          className={`relative search-underline rounded-full bg-white h-14 flex items-center px-5 gap-3 shadow-soft-sm focus-within:shadow-soft transition ${
            inSearchMode ? "is-active" : ""
          }`}
        >
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
              className="w-7 h-7 rounded-full bg-ink-mute/70 text-white flex items-center justify-center hover:bg-ink-sub transition shrink-0"
            >
              <svg viewBox="0 0 24 24" className="w-3 h-3 fill-current">
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
                  : "bg-coral-button text-white shadow-glow-coral hover:opacity-95"
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
        <BrowseMode
          initial={initial}
          initialError={initialError}
          onExample={runSearch}
        />
      )}

      {/* Search mode states */}
      {error && (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {submitting && (
        <div className="rounded-3xl glass p-4 text-sm text-brand-coral flex items-center gap-3 shadow-soft-sm">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-coral opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-coral"></span>
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
  initialError,
  onExample,
}: {
  initial: InitialMemory[] | null;
  initialError: string | null;
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
              className="text-sm rounded-full bg-white border border-paper-edge px-4 py-2 text-ink-sub hover:border-brand-coral hover:text-brand-coral transition"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      <section className="space-y-3 pt-2">
        <div className="flex items-baseline justify-between px-1">
          <h2 className="text-xs font-semibold text-ink-mute uppercase tracking-[0.2em]">
            全部 · {initial?.length ?? 0} 张
          </h2>
        </div>

        {initialError ? (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            加载失败：{initialError}
          </div>
        ) : initial === null ? (
          <div className="rounded-3xl bg-white p-8 text-center text-sm text-ink-mute shadow-soft-sm">
            加载中…
          </div>
        ) : initial.length === 0 ? (
          <div className="rounded-3xl bg-white p-10 text-center shadow-soft-sm">
            <div className="text-4xl mb-3">📷</div>
            <div className="text-sm text-ink-sub mb-3">还没有记忆</div>
            <Link
              href="/create"
              className="inline-flex items-center gap-1.5 rounded-full bg-coral-button text-white px-4 py-2 text-sm font-medium shadow-glow-coral hover:opacity-95 transition"
            >
              创建第一张
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {initial.map((m) => (
              <Link
                key={m.id}
                href={`/memory?id=${m.id}`}
                className="block rounded-3xl bg-white p-1.5 shadow-soft-sm hover:shadow-soft transition group"
              >
                <div className="relative aspect-square rounded-[18px] overflow-hidden bg-paper-bg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={assetUrl(m.imageUrl)}
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
                  {(m.status === "pending" ||
                    m.status === "processing" ||
                    m.status === "analyzing" ||
                    m.status === "composing") && (
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
  const { query, answer, confidence, tier, results, suggestions } = response;

  // Tier label is only worth showing when we're not in the confident path —
  // for "high" the count line speaks for itself (matches mockup).
  const showTierChip = tier !== "high";
  const tierMap = {
    high: { label: "找到了", chipBg: "bg-brand-coral" },
    medium: { label: "可能相关", chipBg: "bg-brand-sunset" },
    low: { label: "不太确定", chipBg: "bg-ink-mute" },
    empty: { label: "没找到", chipBg: "bg-ink-mute" },
  };
  const tierStyle = tierMap[tier];

  // For the high-tier featured card, use the runner-ups as the stacked
  // background photos (mockup-style polaroid stack).
  const otherPhotos = results.filter((r) => !r.isBestMatch).slice(0, 2);

  return (
    <div className="space-y-4">
      {/* Single-line result count, mockup-style */}
      <div className="px-1 pt-1 space-y-1.5">
        <div className="flex items-center gap-2 text-[15px] text-ink-main font-semibold">
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-brand-coral shrink-0">
            <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
          </svg>
          {results.length > 0 ? (
            <span>
              找到了 <span className="text-brand-coral">{results.length}</span> 张
              <span className="text-ink-sub font-medium">「{query}」</span>
            </span>
          ) : (
            <span className="text-ink-sub">没找到「{query}」</span>
          )}
          {showTierChip && results.length > 0 && (
            <span
              className={`ml-auto text-[10px] font-semibold tracking-wider uppercase text-white px-2 py-0.5 rounded-full ${tierStyle.chipBg}`}
            >
              {tierStyle.label}
            </span>
          )}
        </div>
        {answer && (
          <div className="text-[13px] text-ink-sub leading-relaxed pl-6">
            {answer}
            {tier !== "high" && (
              <span className="text-ink-mute ml-1.5">
                · 置信度 {Math.round(confidence * 100)}%
              </span>
            )}
          </div>
        )}
      </div>

      {results.length > 0 && (
        <div className="space-y-4">
          {results.map((r, idx) =>
            r.isBestMatch ? (
              <FeaturedResult key={r.id} result={r} stack={otherPhotos} />
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
                className="text-sm rounded-full bg-white border border-paper-edge px-4 py-1.5 text-ink-sub hover:border-brand-coral hover:text-brand-coral transition"
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

function FeaturedResult({
  result,
  stack,
}: {
  result: SearchResult;
  stack: SearchResult[];
}) {
  const hasStack = stack.length > 0;

  return (
    <Link href={`/memory?id=${result.id}`} className="block group">
      {hasStack ? (
        // Mockup-style polaroid stack: best match centered, runner-ups tilted behind
        <div className="relative h-[260px] flex justify-center items-center mb-2">
          {stack[1] && (
            <div className="absolute photo-frame w-[280px] h-[220px] rotate-[8deg] translate-x-5 -translate-y-2 z-10 opacity-80 scale-95">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={assetUrl(stack[1].imageUrl)}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
          )}
          {stack[0] && (
            <div className="absolute photo-frame w-[280px] h-[220px] -rotate-6 -translate-x-4 z-20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={assetUrl(stack[0].imageUrl)}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div className="absolute photo-frame w-[280px] h-[220px] rotate-2 translate-y-3 z-30 shadow-photo-card group-hover:scale-[1.02] transition-transform">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={assetUrl(result.imageUrl)}
              alt={result.title ?? ""}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-2 left-2 px-2.5 py-1 rounded-full bg-coral-button text-white text-[10px] font-semibold shadow-glow-coral">
              ✦ 最匹配
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-4xl bg-white p-1.5 shadow-soft">
          <div className="relative aspect-[4/5] rounded-[24px] overflow-hidden bg-paper-bg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={assetUrl(result.imageUrl)}
              alt={result.title ?? ""}
              className="w-full h-full object-cover group-hover:scale-[1.01] transition-transform duration-300"
            />
            <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-coral-button text-white text-[11px] font-semibold shadow-glow-coral">
              ✦ 最匹配
            </div>
          </div>
        </div>
      )}

      <div
        className={`mx-3 sm:mx-4 rounded-4xl glass p-6 shadow-soft relative ${
          hasStack ? "-mt-4" : "-mt-12"
        }`}
      >
        <div className="flex items-center justify-between dashed-divider pb-3 mb-3">
          <span className="text-[13px] text-ink-sub font-semibold tracking-wide">
            随记感受
          </span>
          <svg
            viewBox="0 0 24 24"
            className="w-[18px] h-[18px] fill-brand-coral drop-shadow-[0_2px_4px_rgba(255,107,139,0.35)]"
          >
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        </div>

        <h3 className="text-lg font-semibold text-ink-main truncate mb-1">
          {result.title ?? "未命名记忆"}
        </h3>
        <div className="text-xs text-ink-mute mb-3">
          {new Date(result.createdAt).toLocaleDateString("zh-CN")}
          {result.locationText ? ` · ${result.locationText}` : ""}
        </div>
        {result.summary && (
          <div className="text-sm leading-relaxed mb-3 space-y-0.5">
            <div className="text-ink-mute font-semibold text-[13px]">随记：</div>
            <p className="text-ink-sub pl-0.5">「{result.summary}」</p>
          </div>
        )}
        {result.reason && (
          <div className="text-xs text-brand-coral leading-snug mb-3 bg-brand-coral/10 rounded-2xl px-3 py-2">
            <span className="font-semibold">匹配原因：</span>
            {result.reason}
          </div>
        )}
        {result.audioUrl && (
          <div onClick={(e) => e.preventDefault()}>
            <AudioPlayer src={assetUrl(result.audioUrl)} seed={result.id} />
          </div>
        )}
        {result.matchedKeywords.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {result.matchedKeywords.slice(0, 6).map((k) => (
              <span
                key={k}
                className="text-[11px] px-2 py-0.5 rounded-full bg-paper-warm text-ink-sub"
              >
                {k}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}

function CompactResult({ result, rank }: { result: SearchResult; rank: number }) {
  return (
    <Link
      href={`/memory?id=${result.id}`}
      className="block rounded-3xl bg-white p-3 shadow-soft-sm hover:shadow-soft transition"
    >
      <div className="flex gap-3">
        <div className="relative w-24 h-24 shrink-0 rounded-2xl overflow-hidden bg-paper-bg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={assetUrl(result.imageUrl)}
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
