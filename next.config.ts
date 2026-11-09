import type { NextConfig } from "next";
import packageJson from "./package.json";

const nextConfig: NextConfig = {
  // Inlined at build time: the sidebar shows the version next to the brand.
  env: { APP_VERSION: packageJson.version },
  // Keeps the dev-only indicator off the sidebar and Settings footer, bottom-left.
  devIndicators: { position: "bottom-right" },
};

export default nextConfig;
