import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const recent = await prisma.memory.findMany({
    orderBy: { createdAt: "desc" },
    take: 6,
  });

  return (
    <div className="space-y-8 py-6">
      <header className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight">回声相册</h1>
        <p className="text-stone-600 leading-relaxed">
          给每张照片加上声音的背面。
          <br />
          拍一张照片，说一句话。以后你只要记得一点感觉，就能把它找回来。
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/create"
          className="block rounded-xl border border-stone-200 bg-white p-5 hover:border-stone-400 transition"
        >
          <div className="font-semibold mb-1">创建记忆</div>
          <div className="text-sm text-stone-600">
            上传一张照片，录一句话或写一句备注。
          </div>
        </Link>

        <Link
          href="/search"
          className="block rounded-xl border border-stone-200 bg-white p-5 hover:border-stone-400 transition"
        >
          <div className="font-semibold mb-1">搜索记忆</div>
          <div className="text-sm text-stone-600">
            用自然语言找回照片，比如"上次那张甜品"。
          </div>
        </Link>
      </div>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
          最近记忆
        </h2>
        {recent.length === 0 ? (
          <div className="rounded-lg border border-dashed border-stone-300 bg-white p-8 text-center text-stone-400 text-sm">
            还没有记忆。
            <Link href="/create" className="text-stone-700 underline ml-1">
              创建第一张
            </Link>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {recent.map((m) => (
              <Link
                key={m.id}
                href={`/memory/${m.id}`}
                className="block rounded-lg border border-stone-200 bg-white overflow-hidden hover:border-stone-400 transition"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={m.imageUrl}
                  alt={m.title ?? "memory"}
                  className="w-full h-32 object-cover bg-stone-100"
                />
                <div className="p-3">
                  <div className="font-medium text-sm truncate">
                    {m.title ?? "未命名记忆"}
                  </div>
                  <div className="text-xs text-stone-500 mt-1">
                    {m.createdAt.toLocaleString("zh-CN")}
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
