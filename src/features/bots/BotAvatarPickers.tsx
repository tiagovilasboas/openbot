"use client";

import type { Language } from "../language/language.ts";
import { useId, useRef, type KeyboardEvent } from "react";
import { BotAvatar } from "./BotAvatar.tsx";
import { getBotsCopy } from "./bots-copy.ts";
import {
  AVATAR_COLORS,
  AVATAR_SHAPES,
  type AvatarColor,
  type AvatarShape,
} from "./bot-types.ts";

interface BotAvatarPickersProps {
  avatarShape: AvatarShape;
  avatarColor: AvatarColor;
  language: Language;
  onSelectShape: (shape: AvatarShape) => void;
  onSelectColor: (color: AvatarColor) => void;
}

interface SwatchGroupProps<T extends string> {
  label: string;
  options: readonly T[];
  value: T;
  names: Record<T, string>;
  onSelect: (value: T) => void;
  renderSwatch: (option: T) => React.ReactNode;
}

function SwatchGroup<T extends string>({
  label,
  options,
  value,
  names,
  onSelect,
  renderSwatch,
}: SwatchGroupProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const labelId = useId();

  function handleKeyDown(e: KeyboardEvent, index: number) {
    const forward = e.key === "ArrowRight" || e.key === "ArrowDown";
    const backward = e.key === "ArrowLeft" || e.key === "ArrowUp";
    if (!forward && !backward) return;
    e.preventDefault();
    const next = (index + (forward ? 1 : -1) + options.length) % options.length;
    onSelect(options[next]);
    refs.current[next]?.focus();
  }

  return (
    <div className="flex flex-col gap-2">
      <span
        id={labelId}
        className="text-[15px] font-medium text-foreground md:text-sm"
      >
        {label}
      </span>
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        className="grid grid-cols-[repeat(auto-fill,minmax(2.75rem,1fr))] gap-2 p-1"
      >
        {options.map((option, index) => {
          const selected = option === value;
          return (
            <button
              key={option}
              ref={(el) => {
                refs.current[index] = el;
              }}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={names[option]}
              tabIndex={selected ? 0 : -1}
              onClick={() => onSelect(option)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className={`flex size-11 items-center justify-center justify-self-center rounded-xl transition-[background-color,transform] duration-[140ms] active:scale-[0.97] ${
                selected
                  ? "bg-surface-tertiary ring-2 ring-foreground ring-offset-2 ring-offset-overlay"
                  : "bg-surface hover:bg-surface-secondary"
              }`}
            >
              {renderSwatch(option)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function BotAvatarPickers({
  avatarShape,
  avatarColor,
  language,
  onSelectShape,
  onSelectColor,
}: BotAvatarPickersProps) {
  const copy = getBotsCopy(language);

  return (
    <div className="flex flex-col gap-4">
      <SwatchGroup
        label={copy.shapeLabel}
        options={AVATAR_SHAPES}
        value={avatarShape}
        names={copy.shapes}
        onSelect={onSelectShape}
        renderSwatch={(shape) => (
          <BotAvatar shape={shape} color={avatarColor} size={28} />
        )}
      />
      <SwatchGroup
        label={copy.colorLabel}
        options={AVATAR_COLORS}
        value={avatarColor}
        names={copy.colors}
        onSelect={onSelectColor}
        renderSwatch={(color) => (
          <BotAvatar shape={avatarShape} color={color} size={28} />
        )}
      />
    </div>
  );
}
