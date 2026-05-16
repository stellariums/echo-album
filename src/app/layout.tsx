import type { Metadata } from "next";
import Link from "next/link";
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
      <body className="min-h-screen bg-stone-50 text-stone-900 antialiased">
        <nav className="border-b border-stone-200 bg-white">
          <div className="mx-auto max-w-3xl px-4 py-3 flex items-center justify-between">
            <Link href="/" className="font-semibold text-lg tracking-tight">
              回声相册
            </Link>
            <div className="flex gap-4 text-sm">
              <Link
                href="/create"
                className="text-stone-600 hover:text-stone-900 transition"
              >
                创建
              </Link>
              <Link
                href="/search"
                className="text-stone-600 hover:text-stone-900 transition"
              >
                搜索
              </Link>
            </div>
          </div>
        </nav>
        <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
