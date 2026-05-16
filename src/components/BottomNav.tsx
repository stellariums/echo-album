"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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
      className={`flex flex-col items-center gap-1 py-2 px-4 text-[11px] font-semibold transition select-none ${
        active ? "text-brand-teal" : "text-ink-mute hover:text-ink-sub"
      }`}
    >
      {children}
      <span>{label}</span>
    </Link>
  );
}

export function BottomNav() {
  const path = usePathname();
  // "我的" is home — treat / as well as /profile as the personal tab.
  const onHome = isActive(path, "/", true) || isActive(path, "/profile");
  // "回忆" is the memories browse/search hub, plus any individual memory detail.
  const onMemories = isActive(path, "/memories") || isActive(path, "/memory");

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none">
      <div className="relative mx-auto max-w-3xl">
        {/* Bar */}
        <nav
          className="pointer-events-auto bg-white/92 backdrop-blur border-t border-paper-edge h-[78px] flex items-center justify-between px-10"
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

          {/* Spacer for the floating center button */}
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
              <rect x="3" y="3" width="18" height="18" rx="4" ry="4" />
              <polyline points="9 13 11 15 16 10" />
            </svg>
          </NavItem>
        </nav>

        {/* Floating center camera button */}
        <Link
          href="/create"
          aria-label="创建记忆"
          className="pointer-events-auto absolute left-1/2 -translate-x-1/2 bottom-6 w-[68px] h-[68px] rounded-full border-[4px] border-white flex items-center justify-center shadow-glow-teal-lg hover:scale-[1.04] active:scale-[0.97] transition"
          style={{
            background:
              "linear-gradient(145deg, #6AD2D2 0%, #47A1A1 100%)",
          }}
        >
          <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white drop-shadow-sm">
            <path d="M4 5h3l2-2h6l2 2h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zm8 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10z" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
