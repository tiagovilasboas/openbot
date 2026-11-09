"use client";

import type { chatCopy } from "@/features/chat/chat-copy.ts";
import { CheckIcon } from "@/shared/ui/FieldIcons.tsx";
import type { ModelProviderType } from "./model-config.ts";

interface SettingsProviderSelectorProps {
  provider: ModelProviderType;
  content: (typeof chatCopy)["pt" | "en"];
  onSelectProvider: (provider: ModelProviderType) => void;
}

/** Radio list: one row per provider, selected row marked with an accent check. */
export function SettingsProviderSelector({
  provider,
  content,
  onSelectProvider,
}: SettingsProviderSelectorProps) {
  const options: { id: ModelProviderType; name: string; hint: string }[] = [
    {
      id: "router",
      name: content.providerRouter,
      hint: content.providerRouterHint,
    },
    {
      id: "local",
      name: content.providerLocal,
      hint: content.providerLocalHint,
    },
    {
      id: "anthropic",
      name: content.providerAnthropic,
      hint: content.providerAnthropicHint,
    },
  ];

  return (
    <div
      role="radiogroup"
      aria-label={content.provider}
      className="flex flex-col gap-1"
    >
      {options.map((option) => {
        const selected = option.id === provider;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onSelectProvider(option.id)}
            className={`flex min-h-12 items-center gap-3 rounded-xl px-3 py-1.5 text-start transition-colors active:scale-[0.99] ${
              selected
                ? "bg-surface-tertiary"
                : "bg-surface hover:bg-surface-secondary"
            }`}
          >
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-foreground">
                {option.name}
              </span>
              <span className="block truncate text-xs text-muted">
                {option.hint}
              </span>
            </span>
            <span
              className={`flex size-6 shrink-0 items-center justify-center rounded-full ${
                selected
                  ? "bg-bot-accent text-background"
                  : "border border-border"
              }`}
            >
              {selected && <CheckIcon className="size-4" />}
            </span>
          </button>
        );
      })}
    </div>
  );
}
