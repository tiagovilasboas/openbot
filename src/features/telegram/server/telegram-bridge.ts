import type { DatabaseSync } from "node:sqlite";
import type {
  AskResult,
  ServerTurn,
} from "../../bots/server/ask-bot-on-server.ts";
import type { Language } from "../../language/language.ts";
import type { TelegramConfig } from "../telegram-config.ts";
import {
  commandOf,
  splitForTelegram,
  TELEGRAM_MAX_PROMPT,
  telegramNotes,
} from "../telegram-text.ts";
import type { TelegramApi, TelegramUpdate } from "./telegram-api.ts";
import {
  appendTurn,
  clearChat,
  readOffset,
  recentTurns,
  writeOffset,
} from "./telegram-history.ts";

/** Messages older than this when they arrive are dropped, not answered. */
export const STALE_AFTER_MS = 10 * 60_000;

export type BridgeDeps = {
  db: DatabaseSync;
  api: TelegramApi;
  config: Extract<TelegramConfig, { enabled: true }>;
  /** Answers as the given bot with the chat's recent turns. */
  ask: (botId: string, turns: ServerTurn[]) => Promise<AskResult>;
  /** The bot that answers when the config names none. */
  defaultBotId: () => string | null;
  language: () => Language;
  now: () => number;
  /** Chats with a reply in flight; a second message waits its turn. */
  busy: Set<string>;
};

/** Handles one update: commands, the allow list, then a model reply. */
export async function handleUpdate(
  update: TelegramUpdate,
  deps: BridgeDeps,
): Promise<void> {
  const message = update.message;
  const text = message?.text?.trim();
  if (!message || !text) return;
  if (deps.now() - message.date * 1000 > STALE_AFTER_MS) return;
  const chatId = String(message.chat.id);
  const notes = telegramNotes(deps.language());
  const command = commandOf(text);
  if (command === "start") {
    // Answered for any chat: the id is what the owner needs to allow it.
    await deps.api.sendMessage(chatId, notes.start(chatId));
    return;
  }
  if (!deps.config.allowedChats.has(chatId)) {
    // Nothing of the message is logged, only that one was refused.
    console.info("Open Bot Telegram: ignored a chat that is not allowed.");
    return;
  }
  if (command === "new") {
    clearChat(deps.db, chatId);
    await deps.api.sendMessage(chatId, notes.reset);
    return;
  }
  if (deps.busy.has(chatId)) {
    await deps.api.sendMessage(chatId, notes.busy);
    return;
  }
  const botId = deps.config.botId ?? deps.defaultBotId();
  if (!botId) {
    await deps.api.sendMessage(chatId, notes.failed);
    return;
  }
  deps.busy.add(chatId);
  try {
    appendTurn(
      deps.db,
      chatId,
      { role: "user", text: text.slice(0, TELEGRAM_MAX_PROMPT) },
      deps.now(),
    );
    const result = await deps.ask(botId, recentTurns(deps.db, chatId));
    if (result.kind !== "replied") {
      await deps.api.sendMessage(chatId, notes.failed);
      return;
    }
    appendTurn(
      deps.db,
      chatId,
      { role: "assistant", text: result.text },
      deps.now(),
    );
    for (const part of splitForTelegram(result.text)) {
      if (!(await deps.api.sendMessage(chatId, part))) break;
    }
  } finally {
    deps.busy.delete(chatId);
  }
}

/**
 * Polls once and hands each update to `handle` without waiting for it, so
 * one slow reply does not hold the others. The offset is saved first: an
 * update is never answered twice, even after a crash.
 */
export async function pollOnce(
  deps: Pick<BridgeDeps, "db" | "api">,
  handle: (update: TelegramUpdate) => Promise<void>,
  signal?: AbortSignal,
): Promise<number> {
  const offset = readOffset(deps.db);
  const updates = await deps.api.getUpdates(offset, signal);
  for (const update of updates) {
    writeOffset(deps.db, Math.max(offset, update.update_id + 1));
    void handle(update).catch(() => {
      console.error("Open Bot Telegram: an update failed.");
    });
  }
  return updates.length;
}
