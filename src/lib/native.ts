// Capacitor-aware capture helpers. When running on a real device (APK),
// these route through native plugins so the user gets the system camera /
// microphone with proper permission prompts. On web / dev they short-circuit
// — the existing browser MediaRecorder + <input type="file"> flow stays.

import { Capacitor } from "@capacitor/core";
import {
  Camera,
  type MediaResult,
} from "@capacitor/camera";
import { VoiceRecorder } from "capacitor-voice-recorder";

export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

// Open the system camera, return the captured photo as a File. Resolves
// to null if the user cancelled. Throws on permission denial / capture
// failure.
export async function captureFromCamera(): Promise<File | null> {
  let result: MediaResult;
  try {
    result = await Camera.takePhoto({
      quality: 90,
      saveToGallery: false,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message.toLowerCase() : "";
    if (msg.includes("cancel") || msg.includes("user denied")) return null;
    throw err;
  }

  const src = result.webPath ?? result.uri;
  if (!src) {
    throw new Error("相机未返回图片路径");
  }

  // On native, webPath looks like https://localhost/_capacitor_file_/... and
  // the webview can fetch it directly. On web, takePhoto returns a base64
  // thumbnail under `thumbnail` — but we don't use the web path of this
  // helper at all (the page-level web fallback handles browser uploads).
  const response = await fetch(src);
  const blob = await response.blob();
  const format = result.metadata?.format ?? "jpg";
  const mime = blob.type || `image/${format === "jpg" ? "jpeg" : format}`;
  return new File([blob], `photo.${format}`, { type: mime });
}

export async function ensureMicPermission(): Promise<boolean> {
  const has = await VoiceRecorder.hasAudioRecordingPermission();
  if (has.value) return true;
  const granted = await VoiceRecorder.requestAudioRecordingPermission();
  return granted.value;
}

export async function startNativeRecording(): Promise<void> {
  const ok = await ensureMicPermission();
  if (!ok) throw new Error("麦克风权限被拒绝");
  const res = await VoiceRecorder.startRecording();
  if (!res.value) throw new Error("无法启动录音");
}

export interface NativeRecordingResult {
  blob: Blob;
  durationMs: number;
  mimeType: string;
}

// Base64 → Blob; the voice-recorder plugin returns the entire clip in memory.
function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteString = atob(base64);
  const len = byteString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = byteString.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

export async function stopNativeRecording(): Promise<NativeRecordingResult> {
  const result = await VoiceRecorder.stopRecording();
  const { recordDataBase64, msDuration, mimeType } = result.value;
  if (!recordDataBase64) {
    throw new Error("录音返回为空");
  }
  return {
    blob: base64ToBlob(recordDataBase64, mimeType),
    durationMs: msDuration,
    mimeType,
  };
}
