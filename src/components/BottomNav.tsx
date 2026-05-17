"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";

function isActive(path: string, prefix: string, exact = false): boolean {
  if (exact) return path === prefix;
  return path === prefix || path.startsWith(prefix + "/");
}

function NavItem({
  href,
  label,
  active,
  children,
}: {
  href: string;
  label: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center gap-1 py-2 px-4 text-[12px] font-medium transition select-none ${
        active ? "text-ink-main" : "text-ink-mute hover:text-ink-sub"
      }`}
    >
      {children}
      <span>{label}</span>
    </Link>
  );
}

export function BottomNav() {
  const path = usePathname();
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);

  const onHome = isActive(path, "/", true) || isActive(path, "/profile");
  const onMemories = isActive(path, "/memories") || isActive(path, "/memory");

  function pickAndGo(source: "camera" | "gallery") {
    setSheetOpen(false);
    router.push(`/create?source=${source}`);
  }

  return (
    <>
      {/* Action sheet overlay — fades in over the whole screen */}
      {sheetOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px] flex items-end justify-center"
          onClick={() => setSheetOpen(false)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-t-[28px] p-5 pb-9 space-y-2 animate-[slideUp_0.2s_ease-out]"
            style={{ paddingBottom: "max(env(safe-area-inset-bottom), 24px)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center text-xs text-ink-mute font-medium tracking-[0.15em] uppercase pt-1 pb-2">
              新建一张记忆
            </div>
            <button
              type="button"
              onClick={() => pickAndGo("camera")}
              className="w-full rounded-2xl bg-paper-warm py-4 px-5 flex items-center gap-4 hover:bg-paper-edge transition"
            >
              <span className="w-11 h-11 rounded-full bg-coral-button flex items-center justify-center shadow-glow-coral shrink-0">
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
                  <path d="M4 5h3l2-2h6l2 2h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zm8 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10z" />
                </svg>
              </span>
              <div className="flex-1 text-left">
                <div className="text-[15px] font-semibold text-ink-main">拍照</div>
                <div className="text-[12px] text-ink-sub">用相机记录此刻</div>
              </div>
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-ink-mute">
                <path d="M8.59 16.59 13.17 12 8.59 7.41 10 6l6 6-6 6z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => pickAndGo("gallery")}
              className="w-full rounded-2xl bg-paper-warm py-4 px-5 flex items-center gap-4 hover:bg-paper-edge transition"
            >
              <span className="w-11 h-11 rounded-full bg-brand-teal flex items-center justify-center shadow-glow-teal shrink-0">
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
                  <path d="M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2zM8.5 13.5l2.5 3 3.5-4.5 4.5 6H5l3.5-4.5z" />
                </svg>
              </span>
              <div className="flex-1 text-left">
                <div className="text-[15px] font-semibold text-ink-main">从相册选</div>
                <div className="text-[12px] text-ink-sub">挑一张已有的照片</div>
              </div>
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-ink-mute">
                <path d="M8.59 16.59 13.17 12 8.59 7.41 10 6l6 6-6 6z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setSheetOpen(false)}
              className="w-full rounded-2xl border border-paper-edge py-3 mt-2 text-sm text-ink-sub font-medium hover:bg-paper-bg transition"
            >
              取消
            </button>
          </div>
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none">
        <div className="relative mx-auto max-w-3xl">
          <nav
            className="pointer-events-auto bg-white rounded-t-[30px] shadow-[0_-10px_20px_rgba(0,0,0,0.03)] h-[88px] flex items-center justify-between px-12"
            style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0px)" }}
          >
            <NavItem href="/" label="我的" active={onHome}>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-6 h-6"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </NavItem>

            <div className="w-20" aria-hidden />

            <NavItem href="/memories" label="回忆" active={onMemories}>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-6 h-6"
              >
                <rect x="3" y="3" width="18" height="18" rx="4" />
                <polyline points="16 10 12 14 8 10" />
              </svg>
            </NavItem>
          </nav>

          {/* Floating gradient camera button — taps open the action sheet */}
          <button
            type="button"
            aria-label="新建记忆"
            onClick={() => setSheetOpen(true)}
            className="pointer-events-auto absolute left-1/2 -translate-x-1/2 -top-7 w-[68px] h-[68px] rounded-full bg-white p-[5px] shadow-glow-coral-lg hover:scale-[1.04] active:scale-[0.97] transition"
          >
            <span className="block w-full h-full rounded-full bg-coral-button flex items-center justify-center shadow-[inset_0_0_0_2px_rgba(255,255,255,0.5)]">
              <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white drop-shadow-sm">
                <path d="M4 5h3l2-2h6l2 2h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zm8 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10z" />
              </svg>
            </span>
          </button>
        </div>
      </div>

      <style jsx global>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
}
