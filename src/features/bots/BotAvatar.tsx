"use client";

import { useId } from "react";

import { blinkDelay } from "./avatar-blink.ts";
import { GUIDE_OPACITY, headTones, strokeBoost } from "./avatar-colors.ts";
import { botAccent } from "./bot-accent.ts";
import type { AvatarColor, AvatarShape } from "./bot-types.ts";
import { HEAD_ART } from "./head-art-data.ts";

interface BotAvatarProps {
  shape: AvatarShape;
  color: AvatarColor;
  size?: number | string;
  className?: string;
  /** Marks the active bot: an accent ring, offset from the ground. */
  active?: boolean;
}

const ACTIVE_RING =
  "rounded-full ring-2 ring-current ring-offset-2 ring-offset-background";

/** Colored-pencil crew head: any shape in any palette colour. */
export function BotAvatar({
  shape,
  color,
  size = 32,
  className = "",
  active,
}: BotAvatarProps) {
  const clipId = `head-clip-${useId().replace(/:/g, "")}`;
  const art = HEAD_ART[shape] ?? HEAD_ART.hexagon;
  const tones = headTones(color);
  const boost = strokeBoost(size);
  const hatchBoost = 1 + (boost - 1) * 0.4;
  const showGuides = typeof size === "number" && size >= 64;
  const dimension = typeof size === "number" ? `${size}px` : size;

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 100 100"
      style={{ width: dimension, height: dimension, color: botAccent(color) }}
      className={`shrink-0 select-none transition-[box-shadow,transform] duration-150 ease-out-expo ${
        active ? ACTIVE_RING : ""
      } ${className}`}
    >
      <clipPath id={clipId}>
        <path d={art.body} />
      </clipPath>
      {showGuides && (
        <g
          fill="none"
          stroke={tones.guide}
          strokeLinecap="round"
          opacity={GUIDE_OPACITY}
        >
          {art.guides.map((g, i) => (
            <path
              key={i}
              d={g.d}
              strokeWidth={g.width}
              strokeOpacity={g.opacity}
            />
          ))}
        </g>
      )}
      <path d={art.body} fill={tones.base} />
      <g fill="none" strokeLinecap="round" clipPath={`url(#${clipId})`}>
        {art.hatch.map((layer, i) => (
          <path
            key={i}
            d={layer.d}
            stroke={tones[layer.tone]}
            strokeWidth={layer.width * hatchBoost}
            strokeOpacity={layer.opacity}
          />
        ))}
      </g>
      <g
        fill="none"
        stroke={tones.ink}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {art.ink.map((stroke, i) => (
          <path
            key={i}
            d={stroke.d}
            strokeWidth={stroke.width * boost}
            strokeOpacity={stroke.opacity}
          />
        ))}
      </g>
      <g
        className="bot-eyes"
        fill={tones.eyes}
        stroke={tones.eyes}
        strokeOpacity={0.7}
        style={{
          transformOrigin: `${art.eyeAt[0]}px ${art.eyeAt[1]}px`,
          animationDelay: `${blinkDelay(`${shape}-${color}`)}s`,
        }}
      >
        {art.eyes.map((eye, i) => (
          <path
            key={i}
            d={eye.d}
            fillOpacity={eye.fillOpacity}
            strokeWidth={eye.strokeWidth}
          />
        ))}
      </g>
    </svg>
  );
}
