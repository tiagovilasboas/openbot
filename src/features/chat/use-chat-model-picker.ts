"use client";

import { useEffect } from "react";
import {
  reportRunningTurn,
  useOffProviders,
} from "@/features/connections/index.ts";
import { nextTurnUsability } from "@/features/connections/copy.ts";
import { botModelBadge } from "@/features/bots/bot-model-badge.ts";
import { getBotModelPickerCopy } from "@/features/bots/bot-model-picker-copy.ts";
import type { BotProfile } from "@/features/bots/bot-types.ts";
import type { ComposerModelControl } from "@/features/bots/composer-model-context.ts";
import { composerModelChip } from "@/features/bots/composer-model-chip.ts";
import { useBotModelPicker } from "@/features/bots/use-bot-model-picker.ts";
import { fillCopy } from "@/features/model/settings-copy.ts";
import type { ChatLanguage } from "./respond-to-message.ts";

interface ChatModelPickerInput {
  language: ChatLanguage;
  activeBot: BotProfile;
  saveBot: Parameters<typeof useBotModelPicker>[2];
  turnModel: Parameters<typeof useBotModelPicker>[3];
  isConfigured: boolean;
  activeModelLabel: string;
  provider: string | undefined;
  onOpenSettings: () => void;
}

/** The model label shown in the header, the picker, and the composer chip. */
export function useChatModelPicker({
  language,
  activeBot,
  saveBot,
  turnModel,
  isConfigured,
  activeModelLabel,
  provider,
  onOpenSettings,
}: ChatModelPickerInput) {
  const savedModelLabel = botModelBadge(
    activeModelLabel,
    provider,
    activeBot.modelId,
    language,
  );
  const modelPicker = useBotModelPicker(
    activeBot,
    language,
    saveBot,
    turnModel,
  );
  const headerModelLabel = modelPicker.pending
    ? fillCopy(getBotModelPickerCopy(language).nextBadge, {
        model: savedModelLabel,
      })
    : savedModelLabel;
  // The next message runs on the bot's own model, else on the global provider.
  const usability = nextTurnUsability(
    activeBot.modelId,
    provider,
    useOffProviders(),
  );
  const composerModel: ComposerModelControl = {
    chip: composerModelChip(
      isConfigured,
      headerModelLabel,
      language,
      usability,
    ),
    onPress: isConfigured ? modelPicker.open : onOpenSettings,
  };

  // Connections refuses to switch off or disconnect a provider mid-turn.
  const running =
    turnModel && (provider === "router" || provider === "anthropic")
      ? provider
      : null;
  useEffect(() => {
    reportRunningTurn(running);
    return () => reportRunningTurn(null);
  }, [running]);

  return { modelPicker, headerModelLabel, composerModel };
}
