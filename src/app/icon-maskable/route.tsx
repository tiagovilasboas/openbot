import { ImageResponse } from "next/og";
import { renderAppIcon } from "@/features/pwa/app-icon-art.tsx";

const SIZE = 512;

export function GET() {
  return new ImageResponse(renderAppIcon(SIZE, "bleed"), {
    width: SIZE,
    height: SIZE,
  });
}
