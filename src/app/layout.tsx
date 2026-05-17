import type { Metadata } from "next";
import Link from "next/link";
import { BottomNav } from "@/components/BottomNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "回声相册 Echo Album",
  description: "给每张照片加上声音的背面",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen antialiased">
        <header className="sticky top-0 z-30 glass border-b border-paper-edge">
          <div className="mx-auto max-w-3xl px-5 h-14 flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-2 text-ink-main font-semibold tracking-tight"
            >
              <span className="w-7 h-7 rounded-full bg-coral-button flex items-center justify-center shadow-glow-coral">
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white">
                  <path d="M12 2a5 5 0 0 0-5 5v6a5 5 0 0 0 10 0V7a5 5 0 0 0-5-5zM5 11a1 1 0 0 1 2 0 5 5 0 0 0 10 0 1 1 0 0 1 2 0 7 7 0 0 1-6 6.93V21a1 1 0 0 1-2 0v-3.07A7 7 0 0 1 5 11z" />
                </svg>
              </span>
              <span>回声相册</span>
            </Link>
          </div>
        </header>
        <main className="mx-auto max-w-3xl px-5 py-6 pb-32">{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
