import type { CapacitorConfig } from "@capacitor/cli";

// Capacitor configuration for the Echo Album Android shell.
// The frontend is built via `pnpm build:static` into ./out and copied here
// by `npx cap copy`. Network requests go directly to the backend defined by
// NEXT_PUBLIC_API_BASE at build time (baked into the JS bundle).
const config: CapacitorConfig = {
  appId: "com.echoalbum.app",
  appName: "Echo Album",
  webDir: "out",
  android: {
    // We exclusively call HTTPS endpoints via Cloudflare Tunnel — no
    // cleartext HTTP traffic should be permitted.
    allowMixedContent: false,
  },
};

export default config;
