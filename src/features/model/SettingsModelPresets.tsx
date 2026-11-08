"use client";

import { useEffect, useState } from "react";
import type { chatCopy } from "@/features/chat/chat-copy.ts";
import type { ModelProviderType } from "./model-config.ts";

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

export function SettingsModelPresets({
  provider,
  content,
  routerUrl,
  routerModel,
  localUrl,
  localModel,
  onSelectRouterPreset,
  onSelectRouterModel,
  onSelectLocalPreset,
}: SettingsModelPresetsProps) {
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

  const isLoadingLive = !hasLoadedLive;

  if (provider === "router") {
    const isOpenRouter = routerUrl.includes("openrouter.ai");
    const is9Router =
      routerUrl.includes(":3000") || routerUrl.includes(":20128");

    return (
      <div className="flex flex-col gap-2.5 p-3 rounded-2xl bg-zinc-900/60 border border-white/5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
          {content.presetsLabel}
        </span>

        {/* 1-Click Preset Buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              onSelectRouterPreset(
                "https://openrouter.ai/api/v1",
                "openrouter/free",
              )
            }
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all active:scale-95 ${
              isOpenRouter
                ? "bg-cyan-950/70 border-cyan-500/50 text-cyan-300 shadow-sm"
                : "bg-zinc-800/80 border-white/10 text-zinc-300 hover:bg-zinc-700 hover:text-white"
            }`}
          >
            {content.presetOpenRouter}
          </button>

          <button
            type="button"
            onClick={() =>
              onSelectRouterPreset("http://localhost:3000/v1", "o3-mini")
            }
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all active:scale-95 ${
              is9Router
                ? "bg-cyan-950/70 border-cyan-500/50 text-cyan-300 shadow-sm"
                : "bg-zinc-800/80 border-white/10 text-zinc-300 hover:bg-zinc-700 hover:text-white"
            }`}
          >
            {content.preset9Router}
          </button>
        </div>

        {/* OpenRouter Live Free Models & Hint */}
        {isOpenRouter && (
          <div className="flex flex-col gap-2 pt-1 border-t border-white/5 mt-1 animate-in fade-in duration-200">
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              {content.presetOpenRouterHint}{" "}
              <a
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noreferrer"
                className="text-cyan-400 underline hover:text-cyan-300 ml-0.5"
              >
                openrouter.ai/keys ↗
              </a>
            </p>

            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium text-emerald-400/90 uppercase tracking-wider flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {isLoadingLive
                  ? "Atualizando modelos free..."
                  : `${liveFreeModels.length} Modelos Free em Tempo Real`}
              </span>
              <a
                href="https://openrouter.ai/models?variant=free"
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-zinc-400 hover:text-cyan-300 underline"
              >
                openrouter.ai/models ↗
              </a>
            </div>

            <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-0.5">
              {liveFreeModels.map((item) => {
                const isSelected = routerModel === item.id;
                const cleanName = item.name
                  .replace(/ \(free\)/i, "")
                  .replace(/:free$/i, "");
                const ctx = formatContext(item.contextLength);

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelectRouterModel(item.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] transition-all active:scale-95 text-left ${
                      isSelected
                        ? "bg-cyan-900/60 border border-cyan-400 text-cyan-200 font-semibold shadow-sm"
                        : "bg-zinc-800/60 border border-white/5 text-zinc-300 hover:bg-zinc-700 hover:text-white"
                    }`}
                  >
                    <span>{cleanName}</span>
                    {ctx && (
                      <span className="ml-1 text-[10px] opacity-60">
                        · {ctx}
                      </span>
                    )}
                  </button>
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
      <div className="flex flex-col gap-2 p-3 rounded-2xl bg-zinc-900/60 border border-white/5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
          {content.presetsLabel}
        </span>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              onSelectLocalPreset("http://localhost:11434", "llama3.2")
            }
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all active:scale-95 ${
              isOllama
                ? "bg-cyan-950/70 border-cyan-500/50 text-cyan-300 shadow-sm"
                : "bg-zinc-800/80 border-white/10 text-zinc-300 hover:bg-zinc-700 hover:text-white"
            }`}
          >
            {content.presetOllama}
          </button>
        </div>
      </div>
    );
  }

  return null;
}
