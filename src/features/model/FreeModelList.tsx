"use client";

import { useState } from "react";
import type { ChatLanguage } from "@/features/chat/respond-to-message.ts";
import { PresetRow } from "./PresetRow.tsx";
import { fillCopy, getSettingsCopy } from "./settings-copy.ts";
import type { FreeModelEntry } from "./use-free-models.ts";

/** Rows shown before "Show all": the first few, plus the chosen model. */
const COLLAPSED_COUNT = 4;

interface FreeModelListProps {
  language: ChatLanguage;
  models: FreeModelEntry[];
  selectedId: string;
  onSelect: (id: string) => void;
}

function formatContext(tokens?: number): string {
  if (!tokens) return "";
  if (tokens >= 1_000_000) return `${Math.round(tokens / 1_000_000)}M`;
  if (tokens >= 1_000) return `${Math.round(tokens / 1_000)}k`;
  return `${tokens}`;
}

/** Radio list of free models, collapsed to a few rows with a toggle. */
export function FreeModelList({
  language,
  models,
  selectedId,
  onSelect,
}: FreeModelListProps) {
  const s = getSettingsCopy(language);
  const [isExpanded, setIsExpanded] = useState(false);
  const canCollapse = models.length > COLLAPSED_COUNT + 1;
  const visible =
    isExpanded || !canCollapse
      ? models
      : models.filter(
          (item, index) => index < COLLAPSED_COUNT || item.id === selectedId,
        );

  return (
    <div className="flex flex-col gap-1">
      <div
        role="radiogroup"
        aria-label={s.freeModelsList}
        className="flex flex-col gap-1"
      >
        {visible.map((item) => {
          const cleanName = item.name
            .replace(/ \(free\)/i, "")
            .replace(/:free$/i, "");
          const ctx = formatContext(item.contextLength);
          return (
            <PresetRow
              key={item.id}
              name={cleanName}
              description={ctx ? `${item.id} · ${ctx}` : item.id}
              badge={s.badgeFree}
              selected={selectedId === item.id}
              onSelect={() => onSelect(item.id)}
            />
          );
        })}
      </div>
      {canCollapse && (
        <button
          type="button"
          aria-expanded={isExpanded}
          onClick={() => setIsExpanded((value) => !value)}
          className="min-h-11 w-full rounded-xl text-[13px] font-medium text-bot-accent transition-colors hover:bg-surface active:scale-[0.99]"
        >
          {isExpanded
            ? s.showFewer
            : fillCopy(s.showAll, { count: models.length })}
        </button>
      )}
    </div>
  );
}
