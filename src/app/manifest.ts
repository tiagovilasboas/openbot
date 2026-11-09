import type { MetadataRoute } from "next";

const GROUND_COLOR = "#0b0c0f";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Open Bot",
    short_name: "Open Bot",
    description: "A personal assistant you can run your way.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: GROUND_COLOR,
    theme_color: GROUND_COLOR,
    categories: ["productivity", "utilities"],
    icons: [
      { src: "/openbot-icon.svg", type: "image/svg+xml", sizes: "any" },
      { src: "/icon/192", type: "image/png", sizes: "192x192" },
      { src: "/icon/512", type: "image/png", sizes: "512x512" },
      {
        src: "/icon-maskable",
        type: "image/png",
        sizes: "512x512",
        purpose: "maskable",
      },
    ],
  };
}
