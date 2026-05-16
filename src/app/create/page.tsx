"use client";

import { useEffect, useRef, useState } from "react";
import { compressImage } from "@/lib/image";
import { AudioPlayer } from "@/components/AudioPlayer";
import { LastSavedPill } from "@/components/LastSavedPill";

const MAX_RECORD_SECONDS = 60;
const MIN_RECORD_MS = 800;
const MIN_AUDIO_BYTES = 1024;

function getRecordingErrorMessage(err: unknown): string {
  if (!(err instanceof DOMException)) {
    return err instanceof Error ? err.message : "未知错误";
  }

  if (err.name === "NotAllowedError" || err.message.toLowerCase().includes("permission")) {
    return "麦克风权限被拒绝。请在浏览器地址栏左侧允许麦克风，或改用系统 Chrome / Edge / Safari 打开本页面；也可以跳过录音，直接填写文字备注。";
  }

  if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
    return "没有检测到可用麦克风。请检查系统输入设备，或直接填写文字备注。";
  }

  if (err.name === "NotReadableError" || err.name === "TrackStartError") {
    return "麦克风正在被其他应用占用。请关闭占用麦克风的软件后重试，或直接填写文字备注。";
  }

  return err.message || err.name || "权限被拒绝";
}

export default function CreatePage() {
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
  const [submitStage, setSubmitStage] = useState<
    "idle" | "uploading"
  >("idle");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // The most recent submission, shown as a pill above the form so the
  // user can keep capturing without waiting for AI to finish.
  const [lastSaved, setLastSaved] = useState<{
    id: string;
    imageUrl: string;
  } | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const startTimeRef = useRef<number>(0);
  const autoStoppedRef = useRef<boolean>(false);

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
    setInfo(null);
    if (typeof window !== "undefined" && !window.isSecureContext) {
      setError("当前页面不是安全上下文，浏览器会禁止录音。请使用 http://localhost 或 HTTPS 地址访问。");
      return;
    }
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("当前浏览器不支持录音，请改用 Chrome / Edge / Safari。");
      return;
    }
    if (typeof MediaRecorder === "undefined") {
      setError("当前浏览器不支持 MediaRecorder 录音，请改用 Chrome / Edge / Safari，或直接填写文字备注。");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      autoStoppedRef.current = false;
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const durationMs = Date.now() - startTimeRef.current;
        const wasAutoStopped = autoStoppedRef.current;
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;

        // Discard recordings that are too short or too small to be real speech
        if (durationMs < MIN_RECORD_MS || blob.size < MIN_AUDIO_BYTES) {
          setError("录音太短（少于 1 秒），请重新录制。");
          setRecordSeconds(0);
          return;
        }

        if (audioPreview) URL.revokeObjectURL(audioPreview);
        setAudioBlob(blob);
        setAudioPreview(URL.createObjectURL(blob));
        if (wasAutoStopped) {
          setInfo(`录音已达 ${MAX_RECORD_SECONDS} 秒上限，自动停止。`);
        }
      };
      recorderRef.current = recorder;
      startTimeRef.current = Date.now();
      recorder.start();
      setRecording(true);
      setRecordSeconds(0);
      // Tick frequently for smooth countdown; auto-stop when over cap.
      timerRef.current = setInterval(() => {
        const elapsedSec = (Date.now() - startTimeRef.current) / 1000;
        setRecordSeconds(Math.min(MAX_RECORD_SECONDS, Math.floor(elapsedSec)));
        if (elapsedSec >= MAX_RECORD_SECONDS) {
          stopRecording(true);
        }
      }, 250);
    } catch (err) {
      setError("无法访问麦克风：" + getRecordingErrorMessage(err));
    }
  }

  function stopRecording(autoStop = false) {
    if (!recorderRef.current) return;
    autoStoppedRef.current = autoStop;
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
    setInfo(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!imageFile) {
      setError("请先选择一张图片");
      return;
    }
    setSubmitting(true);
    setError(null);
    setInfo(null);

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
      setSubmitStage("uploading");
      const res = await fetch("/api/memories", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}) as { error?: string });
        throw new Error(data.error || `请求失败 (${res.status})`);
      }
      const { id, imageUrl } = (await res.json()) as {
        id: string;
        imageUrl: string;
      };
      // Reset the per-photo fields so the user can immediately keep capturing.
      // Keep locationText — they're probably still in the same place.
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      setImageFile(null);
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (audioPreview) URL.revokeObjectURL(audioPreview);
      setAudioBlob(null);
      setAudioPreview(null);
      setRecordSeconds(0);
      setUserNote("");
      setLastSaved({ id, imageUrl });
    } catch (err) {
      setError(
        "保存失败：" + (err instanceof Error ? err.message : "未知错误")
      );
    } finally {
      setSubmitting(false);
      setSubmitStage("idle");
    }
  }

  const canSubmit = !!imageFile && !submitting && !imageProcessing;

  const submitLabel = submitStage === "uploading" ? "上传中…" : "保存记忆";

  return (
    <form onSubmit={handleSubmit} className="space-y-5 py-2">
      {lastSaved && <LastSavedPill saved={lastSaved} />}

      <header className="space-y-2 pt-2">
        <div className="text-xs font-semibold text-brand-teal uppercase tracking-[0.2em]">
          New Memory
        </div>
        <h1 className="text-2xl font-bold text-ink-main tracking-tight">
          创建记忆
        </h1>
        <p className="text-sm text-ink-sub">
          上传图片 → 录一句话或写一句备注 → 保存。
        </p>
      </header>

      {/* Image */}
      <section className="space-y-2">
        <label className="block text-xs font-semibold text-ink-mute uppercase tracking-[0.15em] px-1">
          图片 <span className="text-brand-orange">*</span>
        </label>
        {imagePreview ? (
          <div className="relative rounded-4xl bg-white p-1.5 shadow-soft-sm">
            <div className="rounded-[24px] overflow-hidden bg-paper-bg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imagePreview}
                alt="preview"
                className="w-full max-h-[50vh] object-contain bg-paper-bg"
              />
            </div>
            <button
              type="button"
              onClick={resetImage}
              className="absolute top-3 right-3 px-3 py-1.5 rounded-full bg-black/55 backdrop-blur text-white text-xs hover:bg-black/75 transition"
            >
              重选
            </button>
            {imageFile && (
              <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full bg-black/55 backdrop-blur text-white text-[11px] font-medium">
                {(imageFile.size / 1024).toFixed(0)} KB
              </div>
            )}
          </div>
        ) : (
          <label
            className={`flex flex-col items-center justify-center rounded-3xl bg-white p-10 text-center cursor-pointer shadow-soft-sm transition ${
              imageProcessing
                ? "text-ink-mute"
                : "text-ink-sub hover:shadow-soft"
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
            <div className="w-12 h-12 rounded-2xl bg-brand-teal/10 flex items-center justify-center mb-3">
              <svg viewBox="0 0 24 24" className="w-6 h-6 fill-brand-teal">
                <path d="M4 5h3l2-2h6l2 2h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zm8 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10z" />
              </svg>
            </div>
            <div className="text-sm font-medium text-ink-main">
              {imageProcessing ? "正在压缩…" : "点击选择图片 / 拍照"}
            </div>
            <div className="text-xs text-ink-mute mt-1">
              支持 jpg / png / webp，自动压缩到 ≤1280px
            </div>
          </label>
        )}
      </section>

      {/* Audio */}
      <section className="space-y-2">
        <label className="block text-xs font-semibold text-ink-mute uppercase tracking-[0.15em] px-1">
          录音（可选）
        </label>
        {audioPreview ? (
          <div className="rounded-3xl bg-white p-4 shadow-soft-sm space-y-3">
            <AudioPlayer src={audioPreview} seed={audioPreview} />
            <button
              type="button"
              onClick={resetAudio}
              className="text-xs text-ink-mute hover:text-brand-teal transition"
            >
              重录
            </button>
          </div>
        ) : recording ? (
          <button
            type="button"
            onClick={() => stopRecording(false)}
            className="w-full flex items-center justify-center gap-3 rounded-3xl bg-red-50 border border-red-200 p-4 hover:bg-red-100 transition"
          >
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
            <span className="text-red-700 font-medium text-sm">
              正在录音{" "}
              <span
                className={
                  MAX_RECORD_SECONDS - recordSeconds <= 5
                    ? "text-red-700 font-bold tabular-nums"
                    : MAX_RECORD_SECONDS - recordSeconds <= 15
                      ? "text-amber-700 font-bold tabular-nums"
                      : "tabular-nums"
                }
              >
                {recordSeconds}s / {MAX_RECORD_SECONDS}s
              </span>{" "}
              — 点击停止
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={startRecording}
            className="w-full flex items-center justify-center gap-2 rounded-3xl bg-white p-4 text-ink-sub shadow-soft-sm hover:shadow-soft hover:text-brand-teal transition"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
              <path d="M12 2a5 5 0 0 0-5 5v6a5 5 0 0 0 10 0V7a5 5 0 0 0-5-5zM5 11a1 1 0 0 1 2 0 5 5 0 0 0 10 0 1 1 0 0 1 2 0 7 7 0 0 1-6 6.93V21a1 1 0 0 1-2 0v-3.07A7 7 0 0 1 5 11z" />
            </svg>
            <span className="text-sm font-medium">
              开始录音（最长 {MAX_RECORD_SECONDS} 秒）
            </span>
          </button>
        )}
      </section>

      {/* Note */}
      <section className="space-y-2">
        <label
          htmlFor="userNote"
          className="block text-xs font-semibold text-ink-mute uppercase tracking-[0.15em] px-1"
        >
          备注（可选）
        </label>
        <textarea
          id="userNote"
          value={userNote}
          onChange={(e) => setUserNote(e.target.value)}
          placeholder="给这张照片留一句话…"
          rows={3}
          className="w-full rounded-3xl bg-white px-4 py-3 text-sm text-ink-main placeholder:text-ink-mute shadow-soft-sm focus:outline-none focus:shadow-soft border-0 resize-none"
        />
      </section>

      {/* Location */}
      <section className="space-y-2">
        <label
          htmlFor="locationText"
          className="block text-xs font-semibold text-ink-mute uppercase tracking-[0.15em] px-1"
        >
          地点（可选）
        </label>
        <input
          id="locationText"
          type="text"
          value={locationText}
          onChange={(e) => setLocationText(e.target.value)}
          placeholder="例：合肥某商场 / 实验室 / 咖啡店…"
          className="w-full rounded-full bg-white px-5 py-3 text-sm text-ink-main placeholder:text-ink-mute shadow-soft-sm focus:outline-none focus:shadow-soft border-0"
        />
      </section>

      {error && (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {info && !error && (
        <div className="rounded-3xl glass p-4 text-sm text-brand-teal shadow-soft-sm">
          {info}
        </div>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className={`w-full rounded-full px-4 py-3.5 font-semibold text-white transition ${
          canSubmit
            ? "bg-brand-teal hover:bg-brand-teal-deep shadow-glow-teal"
            : "bg-paper-edge text-ink-mute cursor-not-allowed"
        }`}
      >
        {submitting ? submitLabel : "保存记忆"}
      </button>

      <p className="text-xs text-ink-mute text-center">
        AI 生成标题、摘要、标签将在保存后自动完成。
      </p>
    </form>
  );
}
