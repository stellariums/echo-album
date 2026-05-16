// Single source of truth for the API base URL, auth token, and asset URLs.
//
// Why this exists: the same codebase runs in three modes —
//   1. `pnpm dev` in a browser on the same origin → API_BASE = "" (relative)
//   2. Phone browser via Cloudflare Tunnel → API_BASE = "" (still same origin)
//   3. Capacitor APK on Android → API_BASE = "https://<tunnel>.trycloudflare.com"
//
// Mode 3 needs absolute URLs because the webview origin is capacitor://localhost,
// which has no API server. Modes 1 and 2 work with relative URLs.
//
// The token is sent on every API request when set. It lives in
// NEXT_PUBLIC_API_TOKEN so it's available to client components; in the APK
// the value is baked into the JS bundle at build time.

const RAW_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";
export const API_BASE = RAW_BASE.replace(/\/+$/, "");

export const API_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN ?? "";

function joinPath(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${normalized}`;
}

export function apiUrl(path: string): string {
  return joinPath(path);
}

// Convert a stored asset path (e.g. "/uploads/img_xxx.jpg") into a URL the
// client can actually load. In APK builds this prepends the backend host.
export function assetUrl(path: string | null | undefined): string {
  if (!path) return "";
  return joinPath(path);
}

export interface ApiFetchInit extends Omit<RequestInit, "headers"> {
  headers?: Record<string, string>;
}

export async function apiFetch(
  path: string,
  init: ApiFetchInit = {}
): Promise<Response> {
  const headers: Record<string, string> = { ...(init.headers ?? {}) };
  if (API_TOKEN) {
    headers["Authorization"] = `Bearer ${API_TOKEN}`;
  }
  return fetch(apiUrl(path), { ...init, headers });
}
