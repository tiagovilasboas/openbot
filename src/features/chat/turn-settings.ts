import type { BotProfile } from "@/features/bots/bot-types.ts";
import type { ClientModelConfig } from "@/features/model/model-config.ts";
import type { ChatLanguage } from "./respond-to-message.ts";

/** What a turn reads when it starts, as saved at that moment. */
export interface TurnSettings {
  language: ChatLanguage;
  activeBot: BotProfile;
  bots: BotProfile[];
  mainBotId: string;
  gitHubToken: string | null;
  modelConfig: ClientModelConfig | null;
  /** The model whose window the thread is measured against. */
  contextModel: string | undefined;
}

/**
 * The settings a turn starts with. A queued turn begins from an older render,
 * so everything comes from the latest settings, except the bot: the turn
 * belongs to the bot that took the message, and only that bot's newer
 * version replaces it. If the user moved to another bot, the turn keeps its own.
 */
export function settingsForTurn(
  latest: TurnSettings,
  turnBot: BotProfile,
): TurnSettings {
  return {
    ...latest,
    activeBot: latest.activeBot.id === turnBot.id ? latest.activeBot : turnBot,
  };
}
