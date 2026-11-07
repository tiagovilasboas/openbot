"use client";

import type { chatCopy } from "@/features/chat/chat-copy.ts";
import type { ModelProviderType } from "./model-config.ts";

export const OPENROUTER_FREE_MODELS = [
  {
    id: "meta-llama/llama-3.3-70b-instruct:free",
    label: "Llama 3.3 70B",
  },
  {
    id: "deepseek/deepseek-r1:free",
    label: "DeepSeek R1",
  },
  {
    id: "google/gemini-2.0-flash-exp:free",
    label: "Gemini 2.0 Flash",
  },
  {
    id: "qwen/qwen-2.5-coder-32b-instruct:free",
    label: "Qwen 2.5 Coder 32B",
  },
] as const;

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
  onSelectSandboxPreset?: () => void;
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
  onSelectSandboxPreset,
}: SettingsModelPresetsProps) {
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
                "meta-llama/llama-3.3-70b-instruct:free",
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

          {onSelectSandboxPreset && (
            <button
              type="button"
              onClick={onSelectSandboxPreset}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-purple-500/30 bg-purple-950/40 text-purple-300 hover:bg-purple-900/60 hover:text-white transition-all active:scale-95"
            >
              {content.presetSandbox}
            </button>
          )}
        </div>

        {/* OpenRouter Free Models & Hint */}
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

            <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
              {content.freeModelsLabel}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {OPENROUTER_FREE_MODELS.map((item) => {
                const isSelected = routerModel === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelectRouterModel(item.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-all active:scale-95 ${
                      isSelected
                        ? "bg-cyan-900/60 border border-cyan-400 text-cyan-200 font-semibold shadow-sm"
                        : "bg-zinc-800/60 border border-white/5 text-zinc-300 hover:bg-zinc-700 hover:text-white"
                    }`}
                  >
                    {item.label}
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

          {onSelectSandboxPreset && (
            <button
              type="button"
              onClick={onSelectSandboxPreset}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-purple-500/30 bg-purple-950/40 text-purple-300 hover:bg-purple-900/60 hover:text-white transition-all active:scale-95"
            >
              {content.presetSandbox}
            </button>
          )}
        </div>
      </div>
    );
  }

  if (provider === "sandbox") {
    return (
      <div className="flex flex-col gap-2 p-3 rounded-2xl bg-purple-950/30 border border-purple-500/30 animate-in fade-in duration-150">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-purple-300">
          {content.presetSandbox}
        </span>
        <p className="text-xs text-zinc-300 leading-relaxed">
          {content.sandboxExplanation}
        </p>
      </div>
    );
  }

  return null;
}
