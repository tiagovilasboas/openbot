"use client";

import { BotAvatar, avatarSwatch } from "./BotAvatar.tsx";
import {
  AVATAR_COLORS,
  AVATAR_SHAPES,
  type AvatarColor,
  type AvatarShape,
} from "./bot-types.ts";

interface BotAvatarPickersProps {
  avatarShape: AvatarShape;
  avatarColor: AvatarColor;
  isPt: boolean;
  onSelectShape: (shape: AvatarShape) => void;
  onSelectColor: (color: AvatarColor) => void;
}

export function BotAvatarPickers({
  avatarShape,
  avatarColor,
  isPt,
  onSelectShape,
  onSelectColor,
}: BotAvatarPickersProps) {
  return (
    <>
      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
          {isPt ? "Forma Geométrica (Avatar)" : "Geometric Avatar Shape"}
        </label>
        <div className="grid grid-cols-9 gap-2 p-2 rounded-2xl bg-zinc-900/60 border border-white/5">
          {AVATAR_SHAPES.map((shape) => (
            <button
              key={shape}
              type="button"
              aria-label={`Shape ${shape}`}
              onClick={() => onSelectShape(shape)}
              className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all ${
                avatarShape === shape
                  ? "bg-zinc-800 ring-2 ring-white/40 scale-105"
                  : "hover:bg-zinc-800/50 opacity-70 hover:opacity-100"
              }`}
            >
              <BotAvatar shape={shape} color={avatarColor} size={28} />
              <span className="mt-1 text-[9px] uppercase tracking-tighter text-zinc-400 truncate">
                {shape}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
          {isPt ? "Cor do Avatar" : "Avatar Color"}
        </label>
        <div className="flex flex-wrap gap-2.5 p-2 rounded-2xl bg-zinc-900/60 border border-white/5">
          {AVATAR_COLORS.map((col) => (
            <button
              key={col}
              type="button"
              aria-label={`Color ${col}`}
              onClick={() => onSelectColor(col)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-xs font-medium transition-all ${
                avatarColor === col
                  ? "border-white/40 bg-zinc-800 text-white shadow-sm ring-1 ring-white/30"
                  : "border-white/5 bg-zinc-900/80 text-zinc-400 hover:text-white"
              }`}
            >
              <span
                className="size-2.5 rounded-full"
                style={{ backgroundColor: avatarSwatch(col) }}
              />
              <span className="capitalize">{col}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
