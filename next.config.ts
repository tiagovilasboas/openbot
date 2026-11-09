import type { NextConfig } from "next";
import packageJson from "./package.json";
import { buildSecurityHeaders } from "./src/features/server-guard/security-headers.ts";

const nextConfig: NextConfig = {
  // Inlined at build time: the sidebar shows the version next to the brand.
  env: { APP_VERSION: packageJson.version },
  // Keeps the dev-only indicator off the sidebar and Settings footer, bottom-left.
  devIndicators: { position: "bottom-right" },
  async headers() {
    const isDev = process.env.NODE_ENV !== "production";
    return [
      {
        source: "/:path*",
        headers: buildSecurityHeaders(isDev),
      },
    ];
  },
};

export default nextConfig;
