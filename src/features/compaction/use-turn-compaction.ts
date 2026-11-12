import { buildBotSystemPrompt } from "../bots/bot-system-prompt.ts";
import type { BotProfile } from "../bots/bot-types.ts";
import type { MessageData } from "../chat/ChatMessageItem.tsx";
import type { ChatLanguage } from "../chat/respond-to-message.ts";
import { loadBotMessages } from "../chat/use-bot-messages.ts";
import type { ClientModelConfig } from "../model/model-config.ts";
import { recordUsageCall } from "../usage/usage-storage.ts";
import { compactBeforeTurn } from "./compact-before-turn.ts";

interface TurnCompactionInput {
  language: ChatLanguage;
  activeBot: BotProfile;
  modelConfig: ClientModelConfig | null;
  /** The model whose window the thread is measured against. */
  contextModel: string | undefined;
  persistMessages: (messages: MessageData[]) => void;
}

/**
 * Gives the chat turn one step to run first: compact the active bot's stored
 * thread when it fills the model's window. It never throws and never blocks
 * the turn on failure.
 */
export function useTurnCompaction(input: TurnCompactionInput) {
  const { language, activeBot, modelConfig, contextModel, persistMessages } =
    input;
  return (userMessageId: number, signal: AbortSignal): Promise<boolean> =>
    compactBeforeTurn({
      readThread: () => loadBotMessages(activeBot.id),
      userMessageId,
      language,
      model: contextModel,
      systemPrompt: buildBotSystemPrompt(activeBot, language),
      modelConfig,
      modelId: activeBot.modelId,
      botId: activeBot.id,
      signal,
      persist: persistMessages,
      onUsage: recordUsageCall,
    });
}
