import type { DatabaseSync } from "node:sqlite";
import { askBotOnServer } from "../../bots/server/ask-bot-on-server.ts";
import { listBots, readSelection } from "../../bots/server/bots-repository.ts";
import { readSettings } from "../../settings/server/settings-repository.ts";
import { parseTelegramConfig } from "../telegram-config.ts";
import { createTelegramApi } from "./telegram-api.ts";
import { handleUpdate, pollOnce, type BridgeDeps } from "./telegram-bridge.ts";

const STARTED = Symbol.for("openbot.telegram.bridge");
const MAX_BACKOFF_MS = 5 * 60_000;

type Env = Readonly<Record<string, string | undefined>>;

/**
 * Starts the Telegram bridge once per server process, when the env turns it
 * on. Long polling only: the server opens no port for Telegram.
 */
export function startTelegramBridge(
  getDb: () => DatabaseSync,
  env: Env = process.env,
): boolean {
  const config = parseTelegramConfig(env);
  if (!config.enabled) {
    if (config.problem) {
      console.warn(`Open Bot Telegram is off: ${config.problem}.`);
    }
    return false;
  }
  const registry = globalThis as { [STARTED]?: true };
  if (registry[STARTED]) return false;
  registry[STARTED] = true;
  const db = getDb();
  const deps: BridgeDeps = {
    db,
    api: createTelegramApi(config.token),
    config,
    ask: (botId, turns) => askBotOnServer(db, botId, turns, env),
    defaultBotId: () =>
      readSelection(db).mainBotId ?? listBots(db)[0]?.id ?? null,
    language: () => readSettings(db).language ?? "pt",
    now: Date.now,
    busy: new Set(),
  };
  void (async () => {
    let backoff = 1_000;
    for (;;) {
      try {
        await pollOnce(deps, (update) => handleUpdate(update, deps));
        backoff = 1_000;
      } catch {
        console.warn("Open Bot Telegram: polling failed; retrying.");
        await new Promise((r) => setTimeout(r, backoff));
        backoff = Math.min(backoff * 2, MAX_BACKOFF_MS);
      }
    }
  })();
  return true;
}
