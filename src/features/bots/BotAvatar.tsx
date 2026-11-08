"use client";

import type { AvatarColor, AvatarShape } from "./bot-types.ts";

interface BotAvatarProps {
  shape: AvatarShape;
  color: AvatarColor;
  size?: number | string;
  className?: string;
}

const COLOR_MAP: Record<
  AvatarColor,
  { fill: string; stroke: string; glow: string }
> = {
  cyan: { fill: "#06b6d4", stroke: "#22d3ee", glow: "rgba(6,182,212,0.3)" },
  blue: { fill: "#3b82f6", stroke: "#60a5fa", glow: "rgba(59,130,246,0.3)" },
  violet: {
    fill: "#8b5cf6",
    stroke: "#a78bfa",
    glow: "rgba(139,92,246,0.3)",
  },
  magenta: {
    fill: "#d946ef",
    stroke: "#f472b6",
    glow: "rgba(217,70,239,0.3)",
  },
  green: { fill: "#10b981", stroke: "#34d399", glow: "rgba(16,185,129,0.3)" },
  yellow: {
    fill: "#f59e0b",
    stroke: "#fbbf24",
    glow: "rgba(245,158,11,0.3)",
  },
  orange: {
    fill: "#f97316",
    stroke: "#fb923c",
    glow: "rgba(249,115,22,0.3)",
  },
  red: { fill: "#ef4444", stroke: "#f87171", glow: "rgba(239,68,68,0.3)" },
  black: { fill: "#27272a", stroke: "#52525b", glow: "rgba(39,39,42,0.4)" },
};

export function BotAvatar({
  shape,
  color,
  size = 32,
  className = "",
}: BotAvatarProps) {
  const c = COLOR_MAP[color] ?? COLOR_MAP.cyan;
  const dimension = typeof size === "number" ? `${size}px` : size;

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 100 100"
      style={{
        width: dimension,
        height: dimension,
        filter: `drop-shadow(0 2px 6px ${c.glow})`,
      }}
      className={`shrink-0 select-none transition-transform duration-150 ${className}`}
    >
      <defs>
        <linearGradient
          id={`grad-${shape}-${color}`}
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <stop offset="0%" stopColor={c.stroke} stopOpacity="1" />
          <stop offset="100%" stopColor={c.fill} stopOpacity="0.85" />
        </linearGradient>
      </defs>

      {shape === "hex" && (
        <polygon
          points="50,6 88,28 88,72 50,94 12,72 12,28"
          fill={`url(#grad-${shape}-${color})`}
          stroke={c.stroke}
          strokeWidth="3"
          strokeLinejoin="round"
        />
      )}

      {shape === "tablet" && (
        <rect
          x="12"
          y="12"
          width="76"
          height="76"
          rx="22"
          ry="22"
          fill={`url(#grad-${shape}-${color})`}
          stroke={c.stroke}
          strokeWidth="3"
        />
      )}

      {shape === "gem" && (
        <polygon
          points="50,8 88,32 72,90 28,90 12,32"
          fill={`url(#grad-${shape}-${color})`}
          stroke={c.stroke}
          strokeWidth="3"
          strokeLinejoin="round"
        />
      )}

      {shape === "shield" && (
        <path
          d="M 50,8 L 86,22 C 86,64 50,90 50,92 C 50,90 14,64 14,22 Z"
          fill={`url(#grad-${shape}-${color})`}
          stroke={c.stroke}
          strokeWidth="3"
          strokeLinejoin="round"
        />
      )}

      {shape === "cloud" && (
        <path
          d="M 25,68 A 18,18 0 0,1 32,38 A 22,22 0 0,1 68,34 A 20,20 0 0,1 80,68 Z"
          fill={`url(#grad-${shape}-${color})`}
          stroke={c.stroke}
          strokeWidth="3"
          strokeLinejoin="round"
        />
      )}

      {shape === "wedge" && (
        <path
          d="M 50,10 L 88,84 C 88,88 85,90 80,90 L 20,90 C 15,90 12,88 12,84 Z"
          fill={`url(#grad-${shape}-${color})`}
          stroke={c.stroke}
          strokeWidth="3"
          strokeLinejoin="round"
        />
      )}

      {shape === "pebble" && (
        <path
          d="M 30,14 C 68,10 90,32 86,66 C 82,90 56,90 30,86 C 10,80 10,25 30,14 Z"
          fill={`url(#grad-${shape}-${color})`}
          stroke={c.stroke}
          strokeWidth="3"
          strokeLinejoin="round"
        />
      )}

      {shape === "capsule" && (
        <rect
          x="18"
          y="10"
          width="64"
          height="80"
          rx="32"
          ry="32"
          fill={`url(#grad-${shape}-${color})`}
          stroke={c.stroke}
          strokeWidth="3"
        />
      )}

      {shape === "egg" && (
        <ellipse
          cx="50"
          cy="54"
          rx="35"
          ry="42"
          fill={`url(#grad-${shape}-${color})`}
          stroke={c.stroke}
          strokeWidth="3"
        />
      )}
    </svg>
  );
}
