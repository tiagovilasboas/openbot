import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keeps the dev-only indicator off the sidebar and Settings footer, bottom-left.
  devIndicators: { position: "bottom-right" },
};

export default nextConfig;
