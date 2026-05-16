"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, assetUrl } from "@/lib/config";

interface LastSaved {
  id: string;
  imageUrl: string;
}

const ACTIVE_STATUSES = new Set([
  "pending",
  "processing",
  "analyzing",
  "composing",
]);

const STAGE_TEXT: Record<string, string> = {
  pending: "排队中…",
  processing: "处理中…",
  analyzing: "识别图片中…",
  composing: "整理记忆卡…",
};

export function LastSavedPill({ saved }: { saved: LastSaved | null }) {
  const [status, setStatus] = useState<string>("pending");
  const [title, setTitle] = useState<string | null>(null);

  useEffect(() => {
    if (!saved) return;
    setStatus("pending");
    setTitle(null);

    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    async function tick() {
      try {
        const res = await apiFetch(`/api/memories/${saved!.id}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as {
          status: string;
          title: string | null;
        };
        if (cancelled) return;
        setStatus(data.status);
        if (data.title) setTitle(data.title);
        if (!ACTIVE_STATUSES.has(data.status) && intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
      } catch {
        // ignore single-tick failures
      }
    }

    void tick();
    intervalId = setInterval(tick, 1000);
    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [saved]);

  if (!saved) return null;

  const isActive = ACTIVE_STATUSES.has(status);
  const isCompleted = status === "completed";
  const isFailed = status === "failed" || status === "partial";

  return (
    <Link
      href={`/memory?id=${saved.id}`}
      className="block rounded-3xl bg-white shadow-soft-sm hover:shadow-soft transition p-2.5 group"
    >
      <div className="flex items-center gap-3">
        {/* Thumbnail */}
        <div className="relative w-12 h-12 shrink-0 rounded-2xl overflow-hidden bg-paper-bg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={assetUrl(saved.imageUrl)}
            alt=""
            className="w-full h-full object-cover"
          />
          {isActive && (
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
              </span>
            </div>
          )}
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          {isCompleted ? (
            <>
              <div className="text-[11px] font-semibold text-brand-teal uppercase tracking-[0.15em]">
                ✓ 已生成
              </div>
              <div className="text-sm font-medium text-ink-main truncate mt-0.5">
                {title ?? "未命名记忆"}
              </div>
            </>
          ) : isFailed ? (
            <>
              <div className="text-[11px] font-semibold text-amber-700 uppercase tracking-[0.15em]">
                {status === "partial" ? "部分完成" : "处理失败"}
              </div>
              <div className="text-sm font-medium text-ink-main truncate mt-0.5">
                {title ?? "点击查看详情"}
              </div>
            </>
          ) : (
            <>
              <div className="text-[11px] font-semibold text-ink-mute uppercase tracking-[0.15em]">
                ✓ 已保存
              </div>
              <div className="text-sm font-medium text-ink-sub truncate mt-0.5">
                {STAGE_TEXT[status] ?? "处理中…"}
              </div>
            </>
          )}
        </div>

        {/* Arrow */}
        <svg
          viewBox="0 0 24 24"
          className="w-5 h-5 fill-ink-mute group-hover:fill-brand-teal transition shrink-0"
        >
          <path d="M8.59 16.59 13.17 12 8.59 7.41 10 6l6 6-6 6z" />
        </svg>
      </div>
    </Link>
  );
}
