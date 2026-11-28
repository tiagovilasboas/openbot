"use client";

import {
  offProviderCopy,
  providerTypeUsability,
  type ConnectionId,
} from "@/features/connections/copy.ts";
import type { Language } from "../language/language.ts";
import type { chatCopy } from "@/features/chat/chat-copy.ts";
import { CheckIcon } from "@/shared/ui/FieldIcons.tsx";
import type { ModelProviderType } from "./model-config.ts";

const HINT_ID = "settings-provider-hint";

interface SettingsProviderSelectorProps {
  provider: ModelProviderType;
  content: (typeof chatCopy)[Language];
  language: Language;
  /** Providers switched off in Connections: shown, but not selectable. */
  offProviders: readonly ConnectionId[];
  onSelectProvider: (provider: ModelProviderType) => void;
}

/** Segmented radio group, one option per provider; the chosen one's hint below. */
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
    {
      id: "chatgpt",
      name: content.providerChatGpt,
      hint: content.providerChatGptHint,
    },
  ];

  // A selected option that is off cannot hold the tab stop: let usable ones have it.
  const selectedIsOff = !providerTypeUsability(provider, offProviders).usable;
  const current = options.find((option) => option.id === provider);
  return (
    <div className="flex flex-col gap-1.5">
      <div
        role="radiogroup"
        aria-label={content.provider}
        className="flex gap-1 overflow-x-auto rounded-xl border border-border bg-surface p-0.5 [scrollbar-width:none]"
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
              aria-describedby={selected ? HINT_ID : undefined}
              title={isOff ? offProviderCopy[language].offReason : option.hint}
              tabIndex={selected || selectedIsOff ? 0 : -1}
              disabled={isOff}
              onClick={() => onSelectProvider(option.id)}
              className={`flex min-h-10 flex-1 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-[10px] px-3 text-sm font-medium transition-colors active:scale-[0.97] ${
                isOff
                  ? "text-muted opacity-60"
                  : selected
                    ? "bg-surface-tertiary text-foreground"
                    : "text-muted hover:text-foreground"
              }`}
            >
              {selected && <CheckIcon className="size-4 text-bot-accent" />}
              {option.name}
              {isOff && (
                <span className="sr-only">
                  {offProviderCopy[language].offReason}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {current && (
        <p
          id={HINT_ID}
          className="line-clamp-2 text-xs text-muted md:text-[13px]"
        >
          {selectedIsOff ? offProviderCopy[language].offReason : current.hint}
        </p>
      )}
    </div>
  );
}
