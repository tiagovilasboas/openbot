import { ImageResponse } from "next/og";
import { renderAppIcon } from "@/features/pwa/app-icon-art.tsx";

const SIZES = [192, 512] as const;

export function generateImageMetadata() {
  return SIZES.map((px) => ({
    id: String(px),
    contentType: "image/png",
    size: { width: px, height: px },
  }));
}

export default async function Icon({ id }: { id: Promise<string> }) {
  const px = Number(await id);
  return new ImageResponse(renderAppIcon(px, "tile"), {
    width: px,
    height: px,
  });
}
