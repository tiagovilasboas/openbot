import type { BotProfile } from "@/features/bots/bot-types.ts";
import type { ClientModelConfig } from "@/features/model/model-config.ts";
import type { ModelCallResult } from "@/features/model/model-status.ts";
import type { MessageData } from "./ChatMessageItem.tsx";
import type { ChatLanguage } from "./respond-to-message.ts";
import type { QueuedMessage } from "./use-message-queue.ts";

export interface ChatTurnsInput {
  language: ChatLanguage;
  activeBot: BotProfile;
  bots: BotProfile[];
  mainBotId: string;
  gitHubToken: string | null;
  modelConfig: ClientModelConfig | null;
  /** The model whose window the thread is measured against. */
  contextModel: string | undefined;
  /** Shown on replies only when a model is configured. */
  modelBadge: string | undefined;
  recordModelCall: (result?: ModelCallResult) => void;
  persistMessages: (messages: MessageData[]) => void;
  getNextId: () => number;
  clearMessages: () => void;
  enqueue: (item: QueuedMessage) => void;
  dequeue: () => QueuedMessage | undefined;
  clearQueue: () => void;
  /** Moves the newest queued message to the front of the queue. */
  promoteLast: () => boolean;
  /** A bot's reply was stored (not one the user cancelled). */
  onReply: (botId: string) => void;
}
