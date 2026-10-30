import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Open Bot",
    short_name: "Open Bot",
    description: "A personal assistant you can run your way.",
    start_url: "/",
    display: "standalone",
    background_color: "#101114",
    theme_color: "#101114",
    icons: [{ src: "/openbot-icon.svg", type: "image/svg+xml", sizes: "any" }],
  };
}
