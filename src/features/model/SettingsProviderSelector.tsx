"use client";

import {
  offProviderCopy,
  providerTypeUsability,
} from "@/features/connections/copy.ts";
import type { Language } from "../language/language.ts";
import type { chatCopy } from "@/features/chat/chat-copy.ts";
import { CheckIcon } from "@/shared/ui/FieldIcons.tsx";
import type { ModelProviderType } from "./model-config.ts";

interface SettingsProviderSelectorProps {
  provider: ModelProviderType;
  content: (typeof chatCopy)[Language];
  language: Language;
  /** Providers switched off in Connections: shown, but not selectable. */
  offProviders: readonly ("router" | "anthropic" | "github")[];
  onSelectProvider: (provider: ModelProviderType) => void;
}

/** Radio list: one row per provider, selected row marked with an accent check. */
export function SettingsProviderSelector({
  provider,
  content,
  language,
  offProviders,
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

  // A selected row that is off cannot hold the tab stop: let usable rows have it.
  const selectedIsOff = !providerTypeUsability(provider, offProviders).usable;
  return (
    <div
      role="radiogroup"
      aria-label={content.provider}
      className="flex flex-col gap-1"
    >
      {options.map((option) => {
        const selected = option.id === provider;
        const isOff = !providerTypeUsability(option.id, offProviders).usable;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected || selectedIsOff ? 0 : -1}
            disabled={isOff}
            onClick={() => onSelectProvider(option.id)}
            className={`flex min-h-12 items-center gap-3 rounded-xl px-3 py-1.5 text-start transition-colors active:scale-[0.99] ${
              isOff
                ? "bg-surface opacity-60"
                : selected
                  ? "bg-surface-tertiary"
                  : "bg-surface hover:bg-surface-secondary"
            }`}
          >
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-foreground">
                {option.name}
              </span>
              <span className="block truncate text-xs text-muted">
                {isOff ? offProviderCopy[language].offReason : option.hint}
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
