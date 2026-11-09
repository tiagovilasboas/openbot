"use client";

import { useId, type ReactElement } from "react";
import { botAvatarTones } from "./bot-accent.ts";
import type { AvatarColor, AvatarShape } from "./bot-types.ts";

interface BotAvatarProps {
  shape: AvatarShape;
  color: AvatarColor;
  size?: number | string;
  className?: string;
  /** Marks the active bot: an accent ring, offset from the ground. */
  active?: boolean;
}

interface ShapePaint {
  fill: string;
  stroke: string;
}

const EDGE_WIDTH = 3;

const ACTIVE_RING =
  "rounded-full ring-2 ring-current ring-offset-2 ring-offset-background";

function renderShape(shape: AvatarShape, paint: ShapePaint): ReactElement {
  const props = {
    fill: paint.fill,
    style: { stroke: paint.stroke },
    strokeWidth: EDGE_WIDTH,
    strokeLinejoin: "round" as const,
  };

  switch (shape) {
    case "tablet":
      return <rect x="12" y="12" width="76" height="76" rx="22" {...props} />;
    case "gem":
      return <polygon points="50,8 88,32 72,90 28,90 12,32" {...props} />;
    case "shield":
      return (
        <path
          d="M 50,8 L 86,22 C 86,64 50,90 50,92 C 50,90 14,64 14,22 Z"
          {...props}
        />
      );
    case "cloud":
      return (
        <path
          d="M 25,68 A 18,18 0 0,1 32,38 A 22,22 0 0,1 68,34 A 20,20 0 0,1 80,68 Z"
          {...props}
        />
      );
    case "wedge":
      return (
        <path
          d="M 50,10 L 88,84 C 88,88 85,90 80,90 L 20,90 C 15,90 12,88 12,84 Z"
          {...props}
        />
      );
    case "pebble":
      return (
        <path
          d="M 30,14 C 68,10 90,32 86,66 C 82,90 56,90 30,86 C 10,80 10,25 30,14 Z"
          {...props}
        />
      );
    case "capsule":
      return <rect x="18" y="10" width="64" height="80" rx="32" {...props} />;
    case "egg":
      return <ellipse cx="50" cy="54" rx="35" ry="42" {...props} />;
    case "hex":
    default:
      return <polygon points="50,6 88,28 88,72 50,94 12,72 12,28" {...props} />;
  }
}

export function BotAvatar({
  shape,
  color,
  size = 32,
  className = "",
  active,
}: BotAvatarProps) {
  const tones = botAvatarTones(color);
  // One gradient per instance: a shared id would resolve to the first match
  // in the document, which may sit inside a display:none sidebar and paint
  // nothing.
  const gradientId = `bot-avatar-${useId().replace(/[^\w-]/g, "")}`;
  const dimension = typeof size === "number" ? `${size}px` : size;

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 100 100"
      shapeRendering="geometricPrecision"
      style={{ width: dimension, height: dimension, color: tones.accent }}
      className={`shrink-0 select-none transition-[box-shadow,transform] duration-150 ease-out-expo ${
        active ? ACTIVE_RING : ""
      } ${className}`}
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: tones.top }} />
          <stop offset="100%" style={{ stopColor: tones.bottom }} />
        </linearGradient>
      </defs>
      {renderShape(shape, { fill: `url(#${gradientId})`, stroke: tones.edge })}
    </svg>
  );
}
