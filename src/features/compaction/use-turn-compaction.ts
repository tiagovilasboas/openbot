import { buildBotSystemPrompt } from "../bots/bot-system-prompt.ts";
import type { MessageData } from "../chat/ChatMessageItem.tsx";
import type { TurnSettings } from "../chat/turn-settings.ts";
import { loadBotMessages } from "../chat/use-bot-messages.ts";
import { recordUsageCall } from "../usage/usage-storage.ts";
import { compactBeforeTurn } from "./compact-before-turn.ts";

/**
 * Gives the chat turn one step to run first: compact the turn bot's stored
 * thread when it fills the model's window. The settings come from the turn,
 * not from the render that built this function. It never throws and never
 * blocks the turn on failure.
 */
export function useTurnCompaction(
  persistMessages: (messages: MessageData[]) => void,
) {
  return (
    settings: TurnSettings,
    userMessageId: number,
    signal: AbortSignal,
  ): Promise<boolean> => {
    const { language, activeBot, modelConfig, contextModel } = settings;
    return compactBeforeTurn({
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
  };
}
