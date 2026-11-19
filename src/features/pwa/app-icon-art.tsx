import type { ReactElement } from "react";
import {
  GRAPHITE,
  TILE_COLOR,
  brandMarkSvg,
} from "@/shared/brand/brand-mark-layers.ts";

// The Open Bot pencil sketch, drawn for raster install icons. Home screens
// need an opaque icon, so silver graphite sits on the dark app tile. `tile`
// keeps the rounded tile for "any" purpose icons; `bleed` paints the tile
// color edge to edge and shrinks the mark into the maskable safe zone so
// Android and iOS apply their own mask.
export type AppIconVariant = "tile" | "bleed";

// Below this size the hatching is mush, so the mark switches to its solid cut.
const SOLID_BELOW = 64;

function markDataUri(variant: AppIconVariant, size: number): string {
  const svg = brandMarkSvg({
    tile: variant === "bleed" ? "none" : "rounded",
    cut: size < SOLID_BELOW ? "solid" : "line",
    ink: GRAPHITE.onDark,
  });
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

export function renderAppIcon(
  size: number,
  variant: AppIconVariant,
): ReactElement {
  const mark = variant === "bleed" ? Math.round(size * 0.74) : size;

  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: variant === "bleed" ? TILE_COLOR : "transparent",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={markDataUri(variant, size)} width={mark} height={mark} alt="" />
    </div>
  );
}
