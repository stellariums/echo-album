"use client";

import { useEffect, useMemo, useRef, useState } from "react";

interface Props {
  src: string;
  /** Used as a seed for the decorative waveform so each clip has a stable shape. */
  seed?: string;
  className?: string;
}

const WAVE_BAR_COUNT = 28;

// Deterministic pseudo-random heights for the decorative waveform.
// Same seed -> same shape; different seeds -> different shapes.
function waveformHeights(seed: string): number[] {
  // Simple xorshift-like hash so we don't pull in a hash library
  let state = 0;
  for (let i = 0; i < seed.length; i++) {
    state = (state * 31 + seed.charCodeAt(i)) | 0;
  }
  const out: number[] = [];
  for (let i = 0; i < WAVE_BAR_COUNT; i++) {
    state = (state * 1103515245 + 12345) | 0;
    const t = ((state >>> 16) & 0xff) / 255; // 0..1
    // Bell-ish curve so the middle bars are taller
    const distance = Math.abs(i - WAVE_BAR_COUNT / 2) / (WAVE_BAR_COUNT / 2);
    const envelope = 1 - 0.4 * distance;
    const h = 6 + t * 16 * envelope; // 6..22 px
    out.push(Math.round(h));
  }
  return out;
}

function formatTime(sec: number): string {
  if (!Number.isFinite(sec)) return "0:00";
  const s = Math.floor(sec);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export function AudioPlayer({ src, seed, className }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const heights = useMemo(() => waveformHeights(seed ?? src), [seed, src]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setCurrentTime(a.currentTime);
    const onMeta = () => setDuration(a.duration);
    const onEnded = () => setPlaying(false);
    const onPause = () => setPlaying(false);
    const onPlay = () => setPlaying(true);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("ended", onEnded);
    a.addEventListener("pause", onPause);
    a.addEventListener("play", onPlay);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("ended", onEnded);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("play", onPlay);
    };
  }, []);

  function toggle() {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      void a.play();
    } else {
      a.pause();
    }
  }

  const progress = duration > 0 ? currentTime / duration : 0;
  const display = duration > 0 ? formatTime(duration - currentTime) : "0:00";

  return (
    <div className={`flex items-center ${className ?? ""}`}>
      <audio ref={audioRef} src={src} preload="metadata" className="hidden" />
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "暂停" : "播放"}
        className="w-9 h-9 rounded-full bg-brand-teal flex items-center justify-center shadow-glow-teal hover:bg-brand-teal-deep transition shrink-0"
      >
        {playing ? (
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white">
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white ml-0.5">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      <div className="flex-1 flex items-center gap-[3px] h-6 mx-3 min-w-0">
        {heights.map((h, i) => {
          const active = i / WAVE_BAR_COUNT < progress;
          return (
            <div
              key={i}
              className={`w-[2.5px] rounded-full transition-colors ${
                active ? "bg-brand-orange" : "bg-brand-orange-light"
              }`}
              style={{ height: `${h}px` }}
            />
          );
        })}
      </div>

      <span className="text-xs text-ink-sub font-medium tabular-nums shrink-0">
        {display}
      </span>
    </div>
  );
}
