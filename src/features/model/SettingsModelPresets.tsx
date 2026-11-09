"use client";

import type { chatCopy } from "@/features/chat/chat-copy.ts";
import type { ChatLanguage } from "@/features/chat/respond-to-message.ts";
import type { ModelProviderType } from "./model-config.ts";
import { FreeModelList } from "./FreeModelList.tsx";
import { PresetRow } from "./PresetRow.tsx";
import { fillCopy, getSettingsCopy } from "./settings-copy.ts";
import { useFreeModels } from "./use-free-models.ts";

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
  const { liveFreeModels, hasLoadedLive, isAccountList } = useFreeModels(
    provider === "router" && routerUrl.includes("openrouter.ai"),
  );

  if (provider === "router") {
    const isOpenRouter = routerUrl.includes("openrouter.ai");
    const is9Router =
      routerUrl.includes(":3000") || routerUrl.includes(":20128");

    return (
      <div className="flex flex-col gap-2.5">
        <div
          role="radiogroup"
          aria-label={content.presetsLabel}
          className="flex flex-col gap-1"
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
          <div className="flex animate-enter flex-col gap-2">
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
                  ? fillCopy(
                      isAccountList ? s.freeModelsAccount : s.freeModelsLive,
                      {
                        count: liveFreeModels.length,
                      },
                    )
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

            <FreeModelList
              language={language}
              models={liveFreeModels}
              selectedId={routerModel}
              onSelect={onSelectRouterModel}
            />
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
        className="flex flex-col gap-1"
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
