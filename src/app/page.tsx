"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, assetUrl } from "@/lib/config";

interface Memory {
  id: string;
  title: string | null;
  imageUrl: string;
  audioUrl: string | null;
  status: string;
  createdAt: string;
}

export default function HomePage() {
  const [memories, setMemories] = useState<Memory[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await apiFetch("/api/memories", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as Memory[];
        if (!cancelled) setMemories(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "加载失败");
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const recent = memories?.slice(0, 6) ?? [];
  const totalCount = memories?.length ?? 0;
  const withAudio = recent.filter((m) => m.audioUrl).length;
  const completed = recent.filter((m) => m.status === "completed").length;

  // Top three photos for the stacked hero (mockup-style)
  const stackPhotos = recent.slice(0, 3);

  return (
    <div className="space-y-7 py-2">
      <header className="space-y-3 pt-2">
        <div className="text-xs font-semibold text-brand-coral uppercase tracking-[0.2em]">
          Echo Album
        </div>
        <h1 className="text-[28px] leading-tight font-bold text-ink-main tracking-tight">
          给每张照片加上声音的背面。
        </h1>
        <p className="text-ink-sub leading-relaxed">
          拍一张照片，说一句话。
          <br className="sm:hidden" />
          以后你只要记得一点感觉，就能把它找回来。
        </p>
      </header>

      {/* Stacked photo hero — leans on the polaroid look from the mockup */}
      {stackPhotos.length > 0 && (
        <div className="relative h-[260px] flex justify-center items-center">
          {stackPhotos.map((m, i) => {
            // i=0 main, i=1 left tilt, i=2 right tilt back
            const transforms = [
              "rotate-2 translate-y-3 z-30 shadow-photo-card",
              "-rotate-6 -translate-x-4 z-20",
              "rotate-[8deg] translate-x-5 -translate-y-2 z-10 opacity-80 scale-95",
            ];
            return (
              <Link
                key={m.id}
                href={`/memory?id=${m.id}`}
                className={`absolute photo-frame w-[260px] h-[200px] transition-transform duration-300 hover:scale-[1.02] ${transforms[i]}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={assetUrl(m.imageUrl)}
                  alt={m.title ?? "memory"}
                  className="w-full h-full object-cover"
                />
              </Link>
            );
          })}
        </div>
      )}

      {/* Stats card */}
      <div className="rounded-3xl bg-white p-5 shadow-soft-sm">
        <div className="text-xs font-semibold text-ink-mute uppercase tracking-[0.15em] mb-3">
          我的记忆
        </div>
        <div className="flex items-baseline gap-6">
          <Stat value={totalCount} label="张记忆" accent="text-brand-coral" />
          <Stat value={withAudio} label="带录音" accent="text-brand-sunset" />
          <Stat value={completed} label="已完成" />
        </div>
      </div>

      {/* Recent memories — small grid below stats */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between px-1">
          <h2 className="text-xs font-semibold text-ink-mute uppercase tracking-[0.2em]">
            最近记忆
          </h2>
          {totalCount > recent.length && (
            <Link
              href="/memories"
              className="text-xs text-brand-coral hover:text-brand-coral-deep font-semibold flex items-center gap-1"
            >
              查看全部
              <svg viewBox="0 0 24 24" className="w-3 h-3 fill-current">
                <path d="M8.59 16.59 13.17 12 8.59 7.41 10 6l6 6-6 6z" />
              </svg>
            </Link>
          )}
        </div>

        {error ? (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            加载失败：{error}
          </div>
        ) : memories === null ? (
          <div className="rounded-3xl bg-white p-8 text-center text-sm text-ink-mute shadow-soft-sm">
            加载中…
          </div>
        ) : recent.length === 0 ? (
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
            {recent.map((m) => (
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
    </div>
  );
}

function Stat({
  value,
  label,
  accent,
}: {
  value: number;
  label: string;
  accent?: string;
}) {
  return (
    <div>
      <div
        className={`text-2xl font-bold tabular-nums ${accent ?? "text-ink-main"}`}
      >
        {value}
      </div>
      <div className="text-xs text-ink-mute mt-0.5">{label}</div>
    </div>
  );
}
