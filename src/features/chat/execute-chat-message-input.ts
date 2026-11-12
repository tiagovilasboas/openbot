import type { AttachmentPayload } from "@/features/attachments/parse-attachments.ts";
import type { BotProfile } from "@/features/bots/bot-types.ts";
import type { LiveToolStep } from "@/features/tools/client/live-tool-steps.ts";
import type { ClientModelConfig } from "@/features/model/model-config.ts";
import type { TokenUsage } from "@/features/model/token-usage.ts";
import type { LiveEntry } from "./live-board.ts";
import type { ChatLanguage } from "./respond-to-message.ts";

export interface ExecuteChatMessageInput {
  text: string;
  language: ChatLanguage;
  history: Array<{ role: "assistant" | "user"; text: string }>;
  activeBot: BotProfile;
  bots?: BotProfile[];
  /** The bot the user made main; it leads the crew as the Chief. */
  mainBotId?: string;
  gitHubToken: string | null;
  modelConfig: ClientModelConfig | null;
  /** Follows which bot is working while the Chief's crew answers. */
  onBotWorking?: (bot: BotProfile) => void;
  /**
   * Streams the model replies and reports the replies in progress. Without
   * it the turn uses the plain, non-stream route.
   */
  onLive?: (entries: LiveEntry[]) => void;
  /** The user's cancel signal; each model call also has its own time limit. */
  signal?: AbortSignal;
  /** A bot's memory notes; defaults to what the user saved on this device. */
  memoryFor?: (botId: string) => string[];
  /**
   * Files for this turn, raw name and text. Only the first model call gets
   * them: a delegated specialist is not sent the user's files.
   */
  attachments?: AttachmentPayload[];
  /** Hears each finished reply of a bot; defaults to the device's usage log. */
  onUsage?: (botId: string, usage: TokenUsage | undefined) => void;
  /** A tool changed the bot's notes on the server. */
  onMemoryChanged?: (botId: string) => void;
  /** Follows the tool calls of a tool turn as they run. */
  onToolSteps?: (steps: LiveToolStep[]) => void;
}
