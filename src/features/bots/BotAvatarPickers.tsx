"use client";

import type { Language } from "../language/language.ts";
import { useEffect, useId, useRef, type KeyboardEvent } from "react";
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
  const rowRef = useRef<HTMLDivElement>(null);
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

  // On phones the swatches are one swipeable row: start it at the chosen one.
  useEffect(() => {
    const row = rowRef.current;
    const chosen = refs.current[options.indexOf(value)];
    if (!row || !chosen || row.scrollWidth <= row.clientWidth) return;
    row.scrollLeft =
      chosen.offsetLeft - row.clientWidth / 2 + chosen.offsetWidth / 2;
    // Only on mount: later picks are already in view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span id={labelId} className="text-sm font-semibold text-foreground">
        {label}
      </span>
      <div
        ref={rowRef}
        role="radiogroup"
        aria-labelledby={labelId}
        className="-mx-4 flex gap-1.5 overflow-x-auto px-4 py-1.5 [scrollbar-width:none] md:mx-0 md:flex-wrap md:overflow-visible md:px-1 [&::-webkit-scrollbar]:hidden"
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
              className={`flex size-10 shrink-0 items-center justify-center rounded-xl md:size-11 transition-[background-color,transform] duration-[140ms] active:scale-[0.97] ${
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
    <div className="grid gap-3 md:grid-cols-2 md:gap-4">
      <SwatchGroup
        label={copy.shapeLabel}
        options={AVATAR_SHAPES}
        value={avatarShape}
        names={copy.shapes}
        onSelect={onSelectShape}
        renderSwatch={(shape) => (
          <BotAvatar shape={shape} color={avatarColor} size={24} />
        )}
      />
      <SwatchGroup
        label={copy.colorLabel}
        options={AVATAR_COLORS}
        value={avatarColor}
        names={copy.colors}
        onSelect={onSelectColor}
        renderSwatch={(color) => (
          <BotAvatar shape={avatarShape} color={color} size={24} />
        )}
      />
    </div>
  );
}
