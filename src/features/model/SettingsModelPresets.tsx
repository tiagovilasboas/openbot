"use client";

import { useEffect, useState } from "react";
import type { chatCopy } from "@/features/chat/chat-copy.ts";
import type { ChatLanguage } from "@/features/chat/respond-to-message.ts";
import { CheckIcon } from "@/shared/ui/FieldIcons.tsx";
import type { ModelProviderType } from "./model-config.ts";
import { fillCopy, getSettingsCopy } from "./settings-copy.ts";

export interface FreeModelEntry {
  id: string;
  name: string;
  contextLength?: number;
}

export const FALLBACK_OPENROUTER_FREE_MODELS: FreeModelEntry[] = [
  { id: "openrouter/free", name: "Auto Free Router", contextLength: 262144 },
  {
    id: "nvidia/nemotron-3.5-super-vl:free",
    name: "NVIDIA Nemotron 3.5 Super VL",
    contextLength: 1000000,
  },
  {
    id: "nvidia/nemotron-3-ultra-550b-a55b:free",
    name: "NVIDIA Nemotron 3 Ultra",
    contextLength: 1000000,
  },
  {
    id: "nvidia/nemotron-3.5-lightning:free",
    name: "NVIDIA Nemotron 3.5 Lightning",
    contextLength: 1000000,
  },
  {
    id: "google/gemma-4-31b-it:free",
    name: "Google Gemma 4 31B",
    contextLength: 262144,
  },
  {
    id: "cohere/north-mini-code:free",
    name: "Cohere North Mini Code",
    contextLength: 256000,
  },
  {
    id: "liquid/lfm-3-1.7b:free",
    name: "LiquidAI LFM3 1.7B",
    contextLength: 262144,
  },
];

export interface SettingsModelPresetsProps {
  provider: ModelProviderType;
  language: ChatLanguage;
  content: (typeof chatCopy)["pt" | "en"];
  routerUrl: string;
  routerModel: string;
  localUrl: string;
  localModel: string;
  onSelectRouterPreset: (url: string, model: string) => void;
  onSelectRouterModel: (model: string) => void;
  onSelectLocalPreset: (url: string, model: string) => void;
}

function formatContext(tokens?: number): string {
  if (!tokens) return "";
  if (tokens >= 1_000_000) return `${Math.round(tokens / 1_000_000)}M`;
  if (tokens >= 1_000) return `${Math.round(tokens / 1_000)}k`;
  return `${tokens}`;
}

interface PresetRowProps {
  name: string;
  description: string;
  badge?: string;
  selected: boolean;
  onSelect: () => void;
}

/** One selectable row: name, one-line description, optional badge, check. */
function PresetRow({
  name,
  description,
  badge,
  selected,
  onSelect,
}: PresetRowProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`flex min-h-14 w-full items-center gap-3 rounded-xl px-3.5 py-2 text-start transition-colors active:scale-[0.99] ${
        selected
          ? "bg-surface-tertiary"
          : "bg-surface hover:bg-surface-secondary"
      }`}
    >
      <span className="min-w-0 flex-1">
        <span className="block overflow-hidden text-ellipsis whitespace-nowrap text-[15px] font-medium text-foreground md:text-sm">
          {name}
        </span>
        <span className="block overflow-hidden text-ellipsis whitespace-nowrap text-[13px] text-muted">
          {description}
        </span>
      </span>
      {badge && (
        <span className="shrink-0 rounded-full bg-success-soft px-2 py-0.5 text-xs font-medium text-success">
          {badge}
        </span>
      )}
      <span
        className={`flex size-5 shrink-0 items-center justify-center rounded-full ${
          selected ? "bg-bot-accent text-background" : "border border-border"
        }`}
      >
        {selected && <CheckIcon className="size-3.5" />}
      </span>
    </button>
  );
}

export function SettingsModelPresets({
  provider,
  language,
  content,
  routerUrl,
  routerModel,
  localUrl,
  localModel,
  onSelectRouterPreset,
  onSelectRouterModel,
  onSelectLocalPreset,
}: SettingsModelPresetsProps) {
  const s = getSettingsCopy(language);
  const [liveFreeModels, setLiveFreeModels] = useState<FreeModelEntry[]>(
    FALLBACK_OPENROUTER_FREE_MODELS,
  );
  const [hasLoadedLive, setHasLoadedLive] = useState(false);

  useEffect(() => {
    if (provider !== "router" || !routerUrl.includes("openrouter.ai")) return;

    let isMounted = true;
    fetch("/api/model/free")
      .then((r) => r.json())
      .then((data: { ok?: boolean; models?: FreeModelEntry[] }) => {
        if (
          isMounted &&
          data?.ok &&
          Array.isArray(data.models) &&
          data.models.length > 0
        ) {
          setLiveFreeModels(data.models);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setHasLoadedLive(true);
      });

    return () => {
      isMounted = false;
    };
  }, [provider, routerUrl]);

  if (provider === "router") {
    const isOpenRouter = routerUrl.includes("openrouter.ai");
    const is9Router =
      routerUrl.includes(":3000") || routerUrl.includes(":20128");

    return (
      <div className="flex flex-col gap-3">
        <div
          role="radiogroup"
          aria-label={content.presetsLabel}
          className="flex flex-col gap-1.5"
        >
          <PresetRow
            name={s.presetOpenRouterName}
            description={s.presetOpenRouterDesc}
            badge={s.badgeFree}
            selected={isOpenRouter}
            onSelect={() =>
              onSelectRouterPreset(
                "https://openrouter.ai/api/v1",
                "openrouter/free",
              )
            }
          />
          <PresetRow
            name={s.preset9RouterName}
            description={s.preset9RouterDesc}
            badge={s.badgeLocal}
            selected={is9Router}
            onSelect={() =>
              onSelectRouterPreset("http://localhost:3000/v1", "o3-mini")
            }
          />
        </div>

        {isOpenRouter && (
          <div className="flex animate-enter flex-col gap-3">
            <p className="text-[13px] text-subtle">
              {content.presetOpenRouterHint}{" "}
              <a
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center text-bot-accent underline underline-offset-2 md:min-h-0"
              >
                {s.getKey}
              </a>
            </p>

            <div className="flex items-center justify-between gap-3">
              <span
                role="status"
                className="text-[13px] font-medium tabular-nums text-muted"
              >
                {hasLoadedLive
                  ? fillCopy(s.freeModelsLive, {
                      count: liveFreeModels.length,
                    })
                  : s.freeModelsLoading}
              </span>
              <a
                href="https://openrouter.ai/models?variant=free"
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 shrink-0 items-center text-[13px] text-bot-accent underline underline-offset-2 md:min-h-0"
              >
                {s.allModels}
              </a>
            </div>

            <div
              role="radiogroup"
              aria-label={s.freeModelsList}
              className="flex max-h-72 flex-col gap-1.5 overflow-y-auto overscroll-contain"
            >
              {liveFreeModels.map((item) => {
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
                    selected={routerModel === item.id}
                    onSelect={() => onSelectRouterModel(item.id)}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (provider === "local") {
    const isOllama =
      localUrl.includes(":11434") && localModel.includes("llama");

    return (
      <div
        role="radiogroup"
        aria-label={content.presetsLabel}
        className="flex flex-col gap-1.5"
      >
        <PresetRow
          name={s.presetOllamaName}
          description={s.presetOllamaDesc}
          badge={s.badgeLocal}
          selected={isOllama}
          onSelect={() =>
            onSelectLocalPreset("http://localhost:11434", "llama3.2")
          }
        />
      </div>
    );
  }

  return null;
}
