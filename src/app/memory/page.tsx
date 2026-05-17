"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { AudioPlayer } from "@/components/AudioPlayer";
import { apiFetch, assetUrl } from "@/lib/config";

interface MemoryDto {
  id: string;
  imageUrl: string;
  audioUrl: string | null;
  createdAt: string;
  locationText: string | null;
  userNote: string | null;
  speechText: string | null;
  ocrText: string | null;
  visionCaption: string | null;
  title: string | null;
  summary: string | null;
  tags: string | null;
  status: string;
  errorMessage: string | null;
}

const ACTIVE_STATUSES = new Set([
  "pending",
  "processing",
  "analyzing",
  "composing",
]);

const STAGES: Record<string, { label: string; progress: number }> = {
  pending: { label: "排队中…", progress: 5 },
  processing: { label: "AI 正在分析…", progress: 20 },
  analyzing: { label: "正在识别图片内容…", progress: 35 },
  composing: { label: "正在整理记忆卡…", progress: 75 },
};

export default function MemoryDetailRoute() {
  return (
    <Suspense fallback={<LoadingCard />}>
      <MemoryDetail />
    </Suspense>
  );
}

function MemoryDetail() {
  const params = useSearchParams();
  const router = useRouter();
  const id = params.get("id");

  const [memory, setMemory] = useState<MemoryDto | null>(null);
  const [notFoundState, setNotFoundState] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!id) {
      setNotFoundState(true);
      return;
    }
    let cancelled = false;

    async function fetchOnce() {
      try {
        const res = await apiFetch(`/api/memories/${id}`, {
          cache: "no-store",
        });
        if (res.status === 404) {
          if (!cancelled) setNotFoundState(true);
          return null;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return (await res.json()) as MemoryDto;
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "加载失败");
        }
        return null;
      }
    }

    async function tick() {
      const data = await fetchOnce();
      if (cancelled || !data) return;
      setMemory(data);
      if (!ACTIVE_STATUSES.has(data.status) && intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    void tick();
    intervalRef.current = setInterval(tick, 1000);
    return () => {
      cancelled = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [id]);

  async function retry() {
    if (!memory) return;
    setRetrying(true);
    try {
      await apiFetch(`/api/memories/${memory.id}/process`, { method: "POST" });
      setMemory({ ...memory, status: "analyzing" });
      if (!intervalRef.current) {
        intervalRef.current = setInterval(async () => {
          const res = await apiFetch(`/api/memories/${memory.id}`, {
            cache: "no-store",
          });
          if (res.ok) {
            const next = (await res.json()) as MemoryDto;
            setMemory(next);
            if (!ACTIVE_STATUSES.has(next.status) && intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
          }
        }, 1000);
      }
    } finally {
      setRetrying(false);
    }
  }

  if (notFoundState) {
    return (
      <div className="rounded-3xl bg-white p-10 text-center shadow-soft-sm space-y-3">
        <div className="text-4xl">🔍</div>
        <div className="text-sm text-ink-sub">找不到这张记忆</div>
        <button
          type="button"
          onClick={() => router.push("/")}
          className="inline-flex items-center gap-1.5 rounded-full bg-coral-button text-white px-4 py-2 text-sm font-medium shadow-glow-coral hover:opacity-95 transition"
        >
          返回首页
        </button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        加载失败：{error}
      </div>
    );
  }

  if (!memory) {
    return <LoadingCard />;
  }

  const tags: string[] = memory.tags ? JSON.parse(memory.tags) : [];
  const stage = STAGES[memory.status] ?? STAGES.processing;

  return (
    <div className="space-y-5 py-2">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-ink-sub hover:text-ink-main transition"
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
          <path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
        </svg>
        返回
      </Link>

      <div className="relative">
        <div className="photo-frame mx-auto max-w-[340px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={assetUrl(memory.imageUrl)}
            alt={memory.title ?? "memory"}
            className="w-full max-h-[60vh] object-contain bg-paper-bg"
          />
        </div>

        <div className="-mt-10 mx-3 sm:mx-5 rounded-4xl glass p-5 sm:p-6 shadow-soft relative">
          <div className="flex items-center justify-between dashed-divider pb-3 mb-3 text-xs text-ink-sub font-medium">
            <span>随记感受</span>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="w-4 h-4 text-brand-coral"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </div>

          <h1 className="text-xl sm:text-2xl font-semibold text-ink-main tracking-tight mb-1">
            {memory.title ?? "未命名记忆"}
          </h1>
          <div className="text-xs text-ink-mute mb-4">
            {new Date(memory.createdAt).toLocaleString("zh-CN")}
            {memory.locationText ? ` · ${memory.locationText}` : ""}
          </div>

          {memory.summary && (
            <p className="text-[15px] text-ink-sub leading-relaxed mb-4">
              {memory.summary}
            </p>
          )}

          {memory.audioUrl && (
            <div className="mb-3">
              <AudioPlayer src={assetUrl(memory.audioUrl)} seed={memory.id} />
            </div>
          )}

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-1">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-1 rounded-full bg-paper-warm text-ink-sub text-xs"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {memory.speechText && (
          <Field
            label="语音转录"
            value={memory.speechText}
            accent="text-brand-sunset"
          />
        )}
        {memory.userNote && (
          <Field
            label="你的备注"
            value={memory.userNote}
            accent="text-brand-coral"
          />
        )}
        {memory.ocrText && <Field label="OCR 文本" value={memory.ocrText} />}
        {memory.visionCaption && (
          <Field label="AI 图片描述" value={memory.visionCaption} />
        )}
      </div>

      {(memory.status === "failed" || memory.status === "partial") && (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <span className="font-semibold">状态：</span>
          {memory.status === "partial" ? "部分完成" : "失败"}
          {memory.errorMessage ? ` — ${memory.errorMessage}` : ""}
        </div>
      )}

      {ACTIVE_STATUSES.has(memory.status) && (
        <div className="rounded-3xl glass p-4 shadow-soft-sm space-y-2.5">
          <div className="flex items-center gap-3 text-sm text-brand-coral">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-coral opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-coral"></span>
            </span>
            <span className="font-medium">{stage.label}</span>
          </div>
          <div className="h-1.5 rounded-full bg-paper-bg overflow-hidden">
            <div
              className="h-full bg-coral-button transition-all duration-500 ease-out"
              style={{ width: `${stage.progress}%` }}
            />
          </div>
        </div>
      )}

      {(memory.status === "failed" || memory.status === "partial") && (
        <button
          type="button"
          onClick={retry}
          disabled={retrying}
          className="text-sm rounded-full border border-paper-edge bg-white px-4 py-2 text-ink-sub hover:border-brand-coral hover:text-brand-coral transition disabled:opacity-50"
        >
          {retrying ? "重新生成中…" : "重新生成记忆卡"}
        </button>
      )}
    </div>
  );
}

function LoadingCard() {
  return (
    <div className="rounded-3xl bg-white p-8 text-center text-sm text-ink-mute shadow-soft-sm">
      加载中…
    </div>
  );
}

function Field({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="rounded-3xl bg-white p-4 shadow-soft-sm">
      <div
        className={`text-[11px] font-semibold uppercase tracking-[0.15em] mb-1.5 ${
          accent ?? "text-ink-mute"
        }`}
      >
        {label}
      </div>
      <div className="text-sm text-ink-main whitespace-pre-wrap leading-relaxed">
        {value}
      </div>
    </div>
  );
}
