import type { ReactElement } from "react";
import { TILE_COLOR, brandMarkSvg } from "@/shared/brand/brand-mark-layers.ts";

// The graphite Open Bot head, drawn for raster install icons. `tile` keeps the
// rounded tile for "any" purpose icons; `bleed` paints the tile color edge to
// edge and shrinks the mark into the maskable safe zone so Android and iOS
// apply their own mask.
export type AppIconVariant = "tile" | "bleed";

function markDataUri(variant: AppIconVariant): string {
  const svg = brandMarkSvg({
    tile: variant === "bleed" ? "none" : "rounded",
    guides: true,
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
      <img src={markDataUri(variant)} width={mark} height={mark} alt="" />
    </div>
  );
}
