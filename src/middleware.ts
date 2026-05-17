import { NextRequest, NextResponse } from "next/server";

// Applied to every /api/* route. Two responsibilities:
//   1. CORS — allow the Capacitor webview (origin: capacitor://localhost or
//      http://localhost) and any other origin during dev to call the API.
//   2. Bearer-token auth — when API_TOKEN is set in env, require it. Skipped
//      if unset so `pnpm dev` against localhost still works without setup.

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

function withCors(res: NextResponse): NextResponse {
  for (const [k, v] of Object.entries(CORS_HEADERS)) {
    res.headers.set(k, v);
  }
  return res;
}

export function middleware(req: NextRequest) {
  if (req.method === "OPTIONS") {
    return withCors(new NextResponse(null, { status: 204 }));
  }

  const expected = process.env.API_TOKEN;
  if (expected) {
    const header = req.headers.get("authorization") ?? "";
    const presented = header.startsWith("Bearer ")
      ? header.slice(7).trim()
      : "";
    if (presented !== expected) {
      return withCors(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );
    }
  }

  return withCors(NextResponse.next());
}

export const config = {
  matcher: "/api/:path*",
};
