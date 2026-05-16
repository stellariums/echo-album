"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { compressImage } from "@/lib/image";

export default function CreatePage() {
  const router = useRouter();

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageProcessing, setImageProcessing] = useState(false);

  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioPreview, setAudioPreview] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);

  const [userNote, setUserNote] = useState("");
  const [locationText, setLocationText] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      if (audioPreview) URL.revokeObjectURL(audioPreview);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [imagePreview, audioPreview]);

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setImageProcessing(true);
    try {
      const compressed = await compressImage(file);
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      setImageFile(compressed);
      setImagePreview(URL.createObjectURL(compressed));
    } catch (err) {
      setError(
        "图片处理失败：" +
          (err instanceof Error ? err.message : "未知错误")
      );
    } finally {
      setImageProcessing(false);
    }
  }

  function resetImage() {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function startRecording() {
    setError(null);
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("当前浏览器不支持录音，请改用 Chrome / Edge / Safari。");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        if (audioPreview) URL.revokeObjectURL(audioPreview);
        setAudioBlob(blob);
        setAudioPreview(URL.createObjectURL(blob));
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      setRecordSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordSeconds((s) => s + 1);
      }, 1000);
    } catch (err) {
      setError(
        "无法访问麦克风：" +
          (err instanceof Error ? err.message : "权限被拒绝")
      );
    }
  }

  function stopRecording() {
    if (!recorderRef.current) return;
    recorderRef.current.stop();
    recorderRef.current = null;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setRecording(false);
  }

  function resetAudio() {
    if (audioPreview) URL.revokeObjectURL(audioPreview);
    setAudioBlob(null);
    setAudioPreview(null);
    setRecordSeconds(0);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!imageFile) {
      setError("请先选择一张图片");
      return;
    }
    setSubmitting(true);
    setError(null);

    const formData = new FormData();
    formData.append("image", imageFile);
    if (audioBlob) {
      const mime = audioBlob.type || "audio/webm";
      const ext = mime.match(/audio\/([\w-]+)/)?.[1]?.split(";")[0] ?? "webm";
      formData.append(
        "audio",
        new File([audioBlob], `recording.${ext}`, { type: mime })
      );
    }
    if (userNote.trim()) formData.append("userNote", userNote.trim());
    if (locationText.trim())
      formData.append("locationText", locationText.trim());

    try {
      const res = await fetch("/api/memories", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}) as { error?: string });
        throw new Error(data.error || `请求失败 (${res.status})`);
      }
      const { id } = (await res.json()) as { id: string };
      router.push(`/memory/${id}`);
    } catch (err) {
      setError(
        "保存失败：" + (err instanceof Error ? err.message : "未知错误")
      );
      setSubmitting(false);
    }
  }

  const canSubmit = !!imageFile && !submitting && !imageProcessing;

  return (
    <form onSubmit={handleSubmit} className="space-y-5 py-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">创建记忆</h1>
        <p className="text-sm text-stone-600">
          上传图片 → 录一句话或写一句备注 → 保存。
        </p>
      </header>

      {/* Image */}
      <section className="space-y-2">
        <label className="block text-sm font-medium text-stone-700">
          图片 <span className="text-red-500">*</span>
        </label>
        {imagePreview ? (
          <div className="relative rounded-xl overflow-hidden border border-stone-200 bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imagePreview}
              alt="preview"
              className="w-full max-h-[50vh] object-contain bg-stone-100"
            />
            <button
              type="button"
              onClick={resetImage}
              className="absolute top-2 right-2 px-2.5 py-1 rounded-md bg-black/60 text-white text-xs hover:bg-black/80"
            >
              重选
            </button>
            {imageFile && (
              <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/60 text-white text-xs">
                {(imageFile.size / 1024).toFixed(0)} KB
              </div>
            )}
          </div>
        ) : (
          <label
            className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed bg-white p-10 text-center cursor-pointer transition ${
              imageProcessing
                ? "border-stone-300 text-stone-400"
                : "border-stone-300 text-stone-500 hover:border-stone-500 hover:text-stone-700"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleImageChange}
              disabled={imageProcessing}
              className="hidden"
            />
            <div className="text-3xl mb-2">+</div>
            <div className="text-sm">
              {imageProcessing ? "正在压缩…" : "点击选择图片 / 拍照"}
            </div>
            <div className="text-xs text-stone-400 mt-1">
              支持 jpg / png / webp，自动压缩到 ≤1280px
            </div>
          </label>
        )}
      </section>

      {/* Audio */}
      <section className="space-y-2">
        <label className="block text-sm font-medium text-stone-700">
          录音（可选）
        </label>
        {audioPreview ? (
          <div className="rounded-xl border border-stone-200 bg-white p-3 space-y-2">
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <audio controls src={audioPreview} className="w-full" />
            <button
              type="button"
              onClick={resetAudio}
              className="text-xs text-stone-500 hover:text-stone-800 underline"
            >
              重录
            </button>
          </div>
        ) : recording ? (
          <button
            type="button"
            onClick={stopRecording}
            className="w-full flex items-center justify-center gap-3 rounded-xl border border-red-300 bg-red-50 p-4 hover:bg-red-100 transition"
          >
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
            <span className="text-red-700 font-medium">
              正在录音 {recordSeconds}s — 点击停止
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={startRecording}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white p-4 text-stone-600 hover:border-stone-500 hover:text-stone-800 transition"
          >
            <span>🎙</span>
            <span className="text-sm">开始录音</span>
          </button>
        )}
      </section>

      {/* Note */}
      <section className="space-y-2">
        <label
          htmlFor="userNote"
          className="block text-sm font-medium text-stone-700"
        >
          备注（可选）
        </label>
        <textarea
          id="userNote"
          value={userNote}
          onChange={(e) => setUserNote(e.target.value)}
          placeholder="给这张照片留一句话…"
          rows={3}
          className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
        />
      </section>

      {/* Location */}
      <section className="space-y-2">
        <label
          htmlFor="locationText"
          className="block text-sm font-medium text-stone-700"
        >
          地点（可选）
        </label>
        <input
          id="locationText"
          type="text"
          value={locationText}
          onChange={(e) => setLocationText(e.target.value)}
          placeholder="例：合肥某商场 / 实验室 / 咖啡店…"
          className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
        />
      </section>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className={`w-full rounded-xl px-4 py-3 font-medium text-white transition ${
          canSubmit
            ? "bg-stone-900 hover:bg-stone-700"
            : "bg-stone-300 cursor-not-allowed"
        }`}
      >
        {submitting ? "保存中…" : "保存记忆"}
      </button>

      <p className="text-xs text-stone-400 text-center">
        AI 生成标题、摘要、标签将在下一步接入后自动完成。
      </p>
    </form>
  );
}
