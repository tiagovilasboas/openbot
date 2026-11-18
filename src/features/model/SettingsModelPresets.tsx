"use client";

import type { Language } from "../language/language.ts";
import type { chatCopy } from "@/features/chat/chat-copy.ts";
import type { ChatLanguage } from "@/features/chat/respond-to-message.ts";
import { isOpenRouterUrl } from "@/features/connections/copy.ts";
import type { ModelProviderType } from "./model-config.ts";
import { FreeModelList } from "./FreeModelList.tsx";
import { OpenRouterAccess } from "./OpenRouterAccess.tsx";
import { PresetRow } from "./PresetRow.tsx";
import { fillCopy, getSettingsCopy } from "./settings-copy.ts";
import { useFreeModels } from "./use-free-models.ts";
import { useLocalServers } from "./use-local-servers.ts";

export interface SettingsModelPresetsProps {
  provider: ModelProviderType;
  language: ChatLanguage;
  content: (typeof chatCopy)[Language];
  routerUrl: string;
  routerModel: string;
  localUrl: string;
  localModel: string;
  onSelectRouterPreset: (url: string, model: string) => void;
  onSelectRouterModel: (model: string) => void;
  onSelectLocalPreset: (url: string, model: string) => void;
  /** An OpenAI-compatible local server (LM Studio) is used as the router. */
  onSelectLocalRouter: (url: string, model: string) => void;
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
  onSelectLocalRouter,
}: SettingsModelPresetsProps) {
  const s = getSettingsCopy(language);
  const { liveFreeModels, hasLoadedLive, isAccountList } = useFreeModels(
    provider === "router" && isOpenRouterUrl(routerUrl),
  );

  const localScan = useLocalServers(provider === "local");

  if (provider === "router") {
    const isOpenRouter = isOpenRouterUrl(routerUrl);
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
            <OpenRouterAccess language={language} content={content} />

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
        {localScan.servers.map((server) => {
          const model = server.models[0] ?? "";
          const isOllamaServer = server.id === "ollama";
          return (
            <PresetRow
              key={server.id}
              name={isOllamaServer ? s.localFoundOllama : s.presetLmStudioName}
              description={fillCopy(s.localFoundDesc, {
                count: server.models.length,
              })}
              badge={s.badgeLocal}
              selected={isOllamaServer && localUrl.includes(server.baseUrl)}
              onSelect={() =>
                isOllamaServer
                  ? onSelectLocalPreset(server.baseUrl, model)
                  : onSelectLocalRouter(`${server.baseUrl}/v1`, model)
              }
            />
          );
        })}
        <p role="status" className="text-[13px] text-subtle">
          {localScan.scanning
            ? s.localScanning
            : localScan.scanned && localScan.servers.length === 0
              ? s.localNoneFound
              : ""}
        </p>
        {localScan.errors.map((r) => (
          <p key={r.id} role="status" className="text-[13px] text-subtle">
            {fillCopy(s.localScanError, { host: r.host })}
          </p>
        ))}
        <button
          type="button"
          onClick={localScan.rescan}
          disabled={localScan.scanning}
          className="min-h-11 self-start rounded-xl px-3 text-sm font-medium text-foreground bg-surface hover:bg-surface-secondary disabled:opacity-50"
        >
          {s.localScanAction}
        </button>
      </div>
    );
  }

  return null;
}
