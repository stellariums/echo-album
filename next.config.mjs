/** @type {import('next').NextConfig} */
// EXPORT_STATIC=1 turns the project into a static-export build for the
// Capacitor APK. In that mode `src/app/api` must be moved out first (see
// scripts/build-static.mjs) — Next.js refuses to export routes that have
// server-only handlers. For local `pnpm dev` and the backend `pnpm start`,
// leave EXPORT_STATIC unset.
const isStaticExport = process.env.EXPORT_STATIC === "1";

const nextConfig = {
  ...(isStaticExport
    ? {
        output: "export",
        // Folder-based URLs so `out/memory/index.html` is reachable as /memory/
        // when served from the APK's local file system.
        trailingSlash: true,
        // We only use plain <img>; the Image optimizer requires a Node server.
        images: { unoptimized: true },
      }
    : {
        experimental: {
          serverActions: {
            bodySizeLimit: "10mb",
          },
        },
      }),
};

export default nextConfig;
