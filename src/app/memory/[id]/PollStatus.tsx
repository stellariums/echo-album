"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  memoryId: string;
  initialStatus: string;
}

const ACTIVE_STATUSES = new Set(["pending", "processing", "analyzing", "composing"]);

interface StageDef {
  label: string;
  progress: number; // 0..100
}

const STAGES: Record<string, StageDef> = {
  pending:    { label: "排队中…",          progress: 5 },
  processing: { label: "AI 正在分析…",      progress: 20 },
  analyzing:  { label: "正在识别图片内容…",  progress: 35 },
  composing:  { label: "正在整理记忆卡…",    progress: 75 },
};

export function PollStatus({ memoryId, initialStatus }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [retrying, setRetrying] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!ACTIVE_STATUSES.has(status)) return;

    async function tick() {
      try {
        const res = await fetch(`/api/memories/${memoryId}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as { status: string };
        if (data.status !== status) {
          setStatus(data.status);
          if (!ACTIVE_STATUSES.has(data.status)) {
            router.refresh();
          }
        }
      } catch {
        // Network blip; retry on next tick
      }
    }

    intervalRef.current = setInterval(tick, 1000);
    void tick();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [memoryId, status, router]);

  async function retry() {
    setRetrying(true);
    try {
      await fetch(`/api/memories/${memoryId}/process`, { method: "POST" });
      setStatus("analyzing");
    } finally {
      setRetrying(false);
    }
  }

  if (ACTIVE_STATUSES.has(status)) {
    const stage = STAGES[status] ?? STAGES.processing;
    return (
      <div className="rounded-3xl glass p-4 shadow-soft-sm space-y-2.5">
        <div className="flex items-center gap-3 text-sm text-brand-teal">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-teal opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-teal"></span>
          </span>
          <span className="font-medium">{stage.label}</span>
        </div>
        <div className="h-1.5 rounded-full bg-paper-bg overflow-hidden">
          <div
            className="h-full bg-brand-teal transition-all duration-500 ease-out"
            style={{ width: `${stage.progress}%` }}
          />
        </div>
      </div>
    );
  }

  if (status === "failed" || status === "partial") {
    return (
      <button
        type="button"
        onClick={retry}
        disabled={retrying}
        className="text-sm rounded-full border border-paper-edge bg-white px-4 py-2 text-ink-sub hover:border-brand-teal hover:text-brand-teal transition disabled:opacity-50"
      >
        {retrying ? "重新生成中…" : "重新生成记忆卡"}
      </button>
    );
  }

  return null;
}
