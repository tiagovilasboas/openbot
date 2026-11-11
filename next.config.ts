import type { NextConfig } from "next";
import packageJson from "./package.json";
import { buildStaticSecurityHeaders } from "./src/features/server-guard/security-headers.ts";

const nextConfig: NextConfig = {
  // Inlined at build time: the sidebar shows the version next to the brand.
  env: { APP_VERSION: packageJson.version },
  // Keeps the dev-only indicator off the sidebar and Settings footer, bottom-left.
  devIndicators: { position: "bottom-right" },
  // The CSP is per request (nonce), so src/proxy.ts sets it; only the
  // request-independent hardening headers live here.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: buildStaticSecurityHeaders(),
      },
    ];
  },
};

export default nextConfig;
