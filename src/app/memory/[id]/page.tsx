import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { AudioPlayer } from "@/components/AudioPlayer";
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

      {/* Big photo card with "polaroid" white frame */}
      <div className="relative">
        <div className="rounded-4xl bg-white p-1.5 shadow-soft">
          <div className="rounded-[24px] overflow-hidden bg-paper-bg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={memory.imageUrl}
              alt={memory.title ?? "memory"}
              className="w-full max-h-[60vh] object-contain bg-paper-bg"
            />
          </div>
        </div>

        {/* Floating details card overlapping the photo */}
        <div className="-mt-10 mx-3 sm:mx-5 rounded-4xl glass p-5 sm:p-6 shadow-soft relative">
          <h1 className="text-xl sm:text-2xl font-semibold text-ink-main tracking-tight mb-1">
            {memory.title ?? "未命名记忆"}
          </h1>
          <div className="text-xs text-ink-mute mb-4">
            {memory.createdAt.toLocaleString("zh-CN")}
            {memory.locationText ? ` · ${memory.locationText}` : ""}
          </div>

          {memory.summary && (
            <p className="text-[15px] text-ink-sub leading-relaxed mb-4">
              {memory.summary}
            </p>
          )}

          {memory.audioUrl && (
            <div className="mb-3">
              <AudioPlayer src={memory.audioUrl} seed={memory.id} />
            </div>
          )}

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-1">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-1 rounded-full bg-paper-bg text-ink-sub text-xs"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Extracted text fields */}
      <div className="grid gap-3 sm:grid-cols-2">
        {memory.speechText && (
          <Field
            label="语音转录"
            value={memory.speechText}
            accent="text-brand-orange"
          />
        )}
        {memory.userNote && (
          <Field
            label="你的备注"
            value={memory.userNote}
            accent="text-brand-teal"
          />
        )}
        {memory.ocrText && (
          <Field label="OCR 文本" value={memory.ocrText} />
        )}
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

      <PollStatus memoryId={memory.id} initialStatus={memory.status} />
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
