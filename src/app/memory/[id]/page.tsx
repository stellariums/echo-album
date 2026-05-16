import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PollStatus } from "./PollStatus";

export const dynamic = "force-dynamic";

export default async function MemoryDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const memory = await prisma.memory.findUnique({
    where: { id: params.id },
  });

  if (!memory) {
    notFound();
  }

  const tags: string[] = memory.tags ? JSON.parse(memory.tags) : [];

  return (
    <div className="space-y-5 py-4">
      <Link
        href="/"
        className="text-sm text-stone-500 hover:text-stone-800 inline-block"
      >
        ← 返回
      </Link>

      <div className="rounded-xl overflow-hidden border border-stone-200 bg-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={memory.imageUrl}
          alt={memory.title ?? "memory"}
          className="w-full max-h-[60vh] object-contain bg-stone-100"
        />
      </div>

      <header className="space-y-2">
        <h1 className="text-2xl font-bold">
          {memory.title ?? "未命名记忆"}
        </h1>
        <div className="text-sm text-stone-500">
          {memory.createdAt.toLocaleString("zh-CN")}
          {memory.locationText ? ` · ${memory.locationText}` : ""}
        </div>
      </header>

      {memory.summary && (
        <p className="text-stone-700 leading-relaxed">{memory.summary}</p>
      )}

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 text-xs"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {memory.audioUrl && (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
            原声
          </h2>
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <audio controls src={memory.audioUrl} className="w-full" />
        </section>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {memory.speechText && (
          <Field label="语音转录" value={memory.speechText} />
        )}
        {memory.userNote && (
          <Field label="你的备注" value={memory.userNote} />
        )}
        {memory.ocrText && <Field label="OCR 文本" value={memory.ocrText} />}
        {memory.visionCaption && (
          <Field label="AI 图片描述" value={memory.visionCaption} />
        )}
      </div>

      {memory.status !== "completed" && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          状态：{memory.status}
          {memory.errorMessage ? ` — ${memory.errorMessage}` : ""}
        </div>
      )}

      <PollStatus memoryId={memory.id} initialStatus={memory.status} />
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-3">
      <div className="text-xs font-medium text-stone-500 mb-1">{label}</div>
      <div className="text-sm text-stone-800 whitespace-pre-wrap">{value}</div>
    </div>
  );
}
