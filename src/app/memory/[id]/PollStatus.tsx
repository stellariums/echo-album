"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  memoryId: string;
  initialStatus: string;
}

const ACTIVE_STATUSES = new Set(["pending", "processing"]);

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

    intervalRef.current = setInterval(tick, 2000);
    void tick();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [memoryId, status, router]);

  async function retry() {
    setRetrying(true);
    try {
      await fetch(`/api/memories/${memoryId}/process`, { method: "POST" });
      setStatus("processing");
    } finally {
      setRetrying(false);
    }
  }

  if (ACTIVE_STATUSES.has(status)) {
    return (
      <div className="rounded-3xl glass p-4 text-sm text-brand-teal flex items-center gap-3 shadow-soft-sm">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-teal opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-teal"></span>
        </span>
        <span>AI 正在生成记忆卡，通常需要 5-15 秒…</span>
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
