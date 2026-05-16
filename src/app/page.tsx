import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const recent = await prisma.memory.findMany({
    orderBy: { createdAt: "desc" },
    take: 8,
  });

  return (
    <div className="space-y-8 py-2">
      <header className="space-y-3 pt-2">
        <div className="text-xs font-semibold text-brand-teal uppercase tracking-[0.2em]">
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

      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/create"
          className="group block rounded-3xl bg-white p-5 shadow-soft-sm hover:shadow-soft transition"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-brand-teal flex items-center justify-center shadow-glow-teal shrink-0">
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
                <path d="M4 5h3l2-2h6l2 2h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zm8 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10z" />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-ink-main">创建记忆</div>
              <div className="text-xs text-ink-sub mt-0.5">
                上传一张照片，录一句话
              </div>
            </div>
          </div>
        </Link>

        <Link
          href="/search"
          className="group block rounded-3xl bg-white p-5 shadow-soft-sm hover:shadow-soft transition"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-brand-orange flex items-center justify-center shadow-soft-sm shrink-0">
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
                <path d="M15.5 14h-.8l-.27-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.6 4.23-1.57l.27.28v.79L19 20.49 20.49 19l-4.99-5zm-6 0a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9z" />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-ink-main">搜索记忆</div>
              <div className="text-xs text-ink-sub mt-0.5">
                用自然语言找回照片
              </div>
            </div>
          </div>
        </Link>
      </div>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between px-1">
          <h2 className="text-xs font-semibold text-ink-mute uppercase tracking-[0.2em]">
            最近记忆
          </h2>
          {recent.length > 0 && (
            <span className="text-xs text-ink-mute">
              {recent.length} 张
            </span>
          )}
        </div>

        {recent.length === 0 ? (
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
            {recent.map((m) => (
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
                </div>
                <div className="px-2 pt-2 pb-1">
                  <div className="text-sm font-medium text-ink-main truncate">
                    {m.title ?? "未命名记忆"}
                  </div>
                  <div className="text-[11px] text-ink-mute mt-0.5">
                    {m.createdAt.toLocaleDateString("zh-CN")}
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
