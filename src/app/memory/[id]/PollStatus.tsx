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
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 flex items-center gap-3">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
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
        className="text-sm rounded-md border border-stone-300 bg-white px-3 py-1.5 hover:border-stone-500 hover:bg-stone-50 disabled:opacity-50"
      >
        {retrying ? "重新生成中…" : "重新生成记忆卡"}
      </button>
    );
  }

  return null;
}
