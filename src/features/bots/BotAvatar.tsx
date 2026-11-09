"use client";

import { useId } from "react";

import { blinkDelay } from "./avatar-blink.ts";
import { OUTLINE, headTones, strokeBoost } from "./avatar-colors.ts";
import { BLOB_ART } from "./blob-art.ts";
import { botAccent } from "./bot-accent.ts";
import type { AvatarColor, AvatarShape } from "./bot-types.ts";

interface BotAvatarProps {
  shape: AvatarShape;
  color: AvatarColor;
  size?: number | string;
  className?: string;
  /** Marks the active bot: an accent line that follows the blob. */
  active?: boolean;
}

// The shade side, bottom right: a darker band and a few pencil hatches.
const HATCH = "M40 94L88 46M48 98L94 52M56 100L98 58M64 102L100 66";
// Below this size the hatching and the second pencil pass turn to noise.
const DETAIL_FROM = 48;
// The active halo, in CSS pixels: a gap off the outline, then the accent line.
const HALO_GAP = 2;
const HALO_LINE = 2;
// Room around the viewBox for the halo, which draws outside the head.
const BLEED = { x: -30, y: -30, width: 160, height: 160 };

/** A crew member: a soft colour blob with pill eyes and a graphite outline. */
export function BotAvatar({
  shape,
  color,
  size = 32,
  className = "",
  active,
}: BotAvatarProps) {
  const uid = useId().replace(/:/g, "");
  const clipId = `blob-clip-${uid}`;
  const art = BLOB_ART[shape] ?? BLOB_ART.hexagon;
  const tones = headTones(color);
  const boost = strokeBoost(size);
  const detailed = typeof size !== "number" || size >= DETAIL_FROM;
  const dimension = typeof size === "number" ? `${size}px` : size;
  const { eyes, highlight } = art;
  const eyeCenter = (eyes.left[0] + eyes.right[0]) / 2;

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 100 100"
      overflow="visible"
      style={{ width: dimension, height: dimension, color: botAccent(color) }}
      className={`shrink-0 select-none ${className}`}
    >
      {active && (
        <ActiveHalo id={`blob-halo-${uid}`} body={art.body} size={size} />
      )}
      <clipPath id={clipId}>
        <path d={art.body} />
      </clipPath>
      <path d={art.body} fill={tones.base} />
      <g clipPath={`url(#${clipId})`}>
        <ellipse cx={66} cy={90} rx={48} ry={27} fill="#000" opacity={0.14} />
        {detailed && (
          <path
            d={HATCH}
            fill="none"
            stroke={OUTLINE}
            strokeWidth={0.9}
            strokeOpacity={0.22}
            strokeLinecap="round"
          />
        )}
        <ellipse
          cx={highlight[0]}
          cy={highlight[1]}
          rx={10}
          ry={5.5}
          transform={`rotate(-35 ${highlight[0]} ${highlight[1]})`}
          fill="#fff"
          opacity={0.42}
        />
      </g>
      <g fill="none" stroke={OUTLINE} strokeLinejoin="round">
        <path d={art.body} strokeWidth={2 * boost} />
        {detailed && (
          <path
            d={art.body}
            strokeWidth={1.1}
            strokeOpacity={0.35}
            transform="translate(1.4 -1)"
          />
        )}
      </g>
      <g
        className="bot-eyes"
        style={{
          transformOrigin: `${eyeCenter}px ${eyes.left[1]}px`,
          animationDelay: `${blinkDelay(`${shape}-${color}`)}s`,
        }}
      >
        {[eyes.left, eyes.right].map(([x, y]) => (
          <g key={x} transform={`rotate(${eyes.tilt} ${x} ${y})`}>
            <rect
              x={x - eyes.width / 2}
              y={y - eyes.height / 2}
              width={eyes.width}
              height={eyes.height}
              rx={eyes.width / 2}
              fill={tones.eyes}
            />
            <circle
              cx={x - 0.6}
              cy={y - eyes.height / 2 + 4}
              r={2}
              fill={tones.catchlight}
            />
          </g>
        ))}
      </g>
    </svg>
  );
}

/** A ring that keeps the blob's own silhouette: a band cut out by a mask. */
function ActiveHalo({
  id,
  body,
  size,
}: {
  id: string;
  body: string;
  size: number | string;
}) {
  const unitsPerPx = 100 / (typeof size === "number" ? size : 64);
  const inner = strokeBoost(size) + HALO_GAP * unitsPerPx;
  const outer = inner + HALO_LINE * unitsPerPx;
  return (
    <>
      <mask id={id} maskUnits="userSpaceOnUse" {...BLEED}>
        <path
          d={body}
          fill="none"
          stroke="#fff"
          strokeWidth={2 * outer}
          strokeLinejoin="round"
        />
        <path
          d={body}
          fill="#000"
          stroke="#000"
          strokeWidth={2 * inner}
          strokeLinejoin="round"
        />
      </mask>
      <rect {...BLEED} fill="currentColor" mask={`url(#${id})`} />
    </>
  );
}
