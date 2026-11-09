"use client";

import { useEffect, type ReactNode } from "react";

export interface PaletteRow {
  key: string;
  leading: ReactNode;
  title: ReactNode;
  description?: string;
  trailing?: ReactNode;
}

interface ComposerPaletteProps {
  id: string;
  label: string;
  rows: PaletteRow[];
  activeIndex: number;
  emptyTitle: string;
  emptyHint: string;
  onActiveIndexChange: (index: number) => void;
  onSelect: (index: number) => void;
}

export function paletteOptionId(paletteId: string, index: number) {
  return `${paletteId}-option-${index}`;
}

/**
 * Floating list anchored above the composer. Focus stays in the textarea:
 * the composer drives the active row through aria-activedescendant.
 */
export function ComposerPalette({
  id,
  label,
  rows,
  activeIndex,
  emptyTitle,
  emptyHint,
  onActiveIndexChange,
  onSelect,
}: ComposerPaletteProps) {
  useEffect(() => {
    if (activeIndex < 0) return;
    document
      .getElementById(paletteOptionId(id, activeIndex))
      ?.scrollIntoView({ block: "nearest" });
  }, [id, activeIndex]);

  return (
    <div
      id={id}
      data-composer-palette=""
      className="absolute inset-x-0 bottom-full z-30 mb-2 animate-enter overflow-hidden rounded-2xl border border-border bg-overlay shadow-overlay"
    >
      {rows.length === 0 ? (
        <div role="status" className="px-4 py-3.5">
          <p className="text-[15px] font-medium text-foreground md:text-sm">
            {emptyTitle}
          </p>
          <p className="mt-0.5 text-[13px] text-muted">{emptyHint}</p>
        </div>
      ) : (
        <ul
          role="listbox"
          aria-label={label}
          className="max-h-[45dvh] overflow-y-auto overscroll-contain p-1.5"
        >
          {rows.map((row, index) => {
            const isActive = index === activeIndex;
            return (
              <li
                key={row.key}
                id={paletteOptionId(id, index)}
                role="option"
                aria-selected={isActive}
                className={`flex min-h-12 cursor-pointer select-none items-center gap-3 rounded-xl px-2.5 py-2 transition-colors duration-(--duration-micro) ease-out-expo ${
                  isActive ? "bg-surface-tertiary" : ""
                }`}
                onMouseDown={(event) => event.preventDefault()}
                onMouseMove={() => {
                  if (!isActive) onActiveIndexChange(index);
                }}
                onClick={() => onSelect(index)}
              >
                <span className="flex size-8 shrink-0 items-center justify-center">
                  {row.leading}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[15px] font-medium text-foreground md:text-sm">
                    {row.title}
                  </span>
                  {row.description && (
                    <span className="truncate text-[13px] text-muted">
                      {row.description}
                    </span>
                  )}
                </span>
                {row.trailing}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
