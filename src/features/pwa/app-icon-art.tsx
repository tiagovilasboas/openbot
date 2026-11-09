import type { ReactElement } from "react";

// The Open Bot mark (ring + satellite dot, from public/openbot-icon.svg),
// drawn for raster install icons. `tile` keeps the rounded tile for "any"
// purpose icons; `bleed` paints the tile color edge to edge and shrinks the
// mark into the maskable safe zone so Android and iOS apply their own mask.
const TILE_COLOR = "#191a1f";
const RING_COLOR = "#e7e8eb";
const DOT_COLOR = "#aab3ff";

export type AppIconVariant = "tile" | "bleed";

export function renderAppIcon(
  size: number,
  variant: AppIconVariant,
): ReactElement {
  const scale = variant === "bleed" ? 0.74 : 1;
  const unit = (size / 64) * scale;
  const ring = 36 * unit;
  const stroke = Math.max(2, 4 * unit);
  const dot = 8 * unit;

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
      <div
        style={{
          position: "relative",
          width: 64 * unit,
          height: 64 * unit,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: variant === "bleed" ? "transparent" : TILE_COLOR,
          borderRadius: variant === "bleed" ? 0 : 19 * (size / 64),
        }}
      >
        <div
          style={{
            width: ring,
            height: ring,
            borderRadius: "50%",
            border: `${stroke}px solid ${RING_COLOR}`,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 44 * unit,
            top: 12 * unit,
            width: dot,
            height: dot,
            borderRadius: "50%",
            background: DOT_COLOR,
          }}
        />
      </div>
    </div>
  );
}
