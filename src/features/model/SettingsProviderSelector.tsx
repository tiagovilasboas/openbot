"use client";

import { Button, ButtonGroup, Label } from "@heroui/react";
import type { chatCopy } from "@/features/chat/chat-copy.ts";
import type { ModelProviderType } from "./model-config.ts";

interface SettingsProviderSelectorProps {
  provider: ModelProviderType;
  content: (typeof chatCopy)["pt" | "en"];
  onSelectProvider: (provider: ModelProviderType) => void;
}

export function SettingsProviderSelector({
  provider,
  content,
  onSelectProvider,
}: SettingsProviderSelectorProps) {
  return (
    <div>
      <Label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted">
        {content.provider}
      </Label>
      <ButtonGroup aria-label={content.provider} className="w-full">
        <Button
          size="sm"
          className="flex-1 text-xs"
          variant={provider === "router" ? "primary" : "secondary"}
          onPress={() => onSelectProvider("router")}
        >
          {content.providerRouter}
        </Button>
        <Button
          size="sm"
          className="flex-1 text-xs"
          variant={provider === "local" ? "primary" : "secondary"}
          onPress={() => onSelectProvider("local")}
        >
          {content.providerLocal}
        </Button>
        <Button
          size="sm"
          className="flex-1 text-xs"
          variant={provider === "anthropic" ? "primary" : "secondary"}
          onPress={() => onSelectProvider("anthropic")}
        >
          {content.providerAnthropic}
        </Button>
      </ButtonGroup>
      <p className="mt-1.5 text-xs text-muted">
        {provider === "router"
          ? content.providerRouterHint
          : provider === "local"
            ? content.providerLocalHint
            : content.providerAnthropicHint}
      </p>
    </div>
  );
}
