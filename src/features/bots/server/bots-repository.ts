import type { DatabaseSync } from "node:sqlite";
import { sanitizeBotProfile } from "../bot-storage.ts";
import type { BotProfile } from "../bot-types.ts";
import { ensureBotsSchema } from "./bots-schema.ts";

export type BotSelection = {
  activeBotId?: string | null;
  mainBotId?: string | null;
};

const SELECTION_KEYS = { activeBotId: "active", mainBotId: "main" } as const;

// Bots in saved order. Rows are validated again: a damaged or duplicate row
// is skipped, never trusted and never fatal.
export function listBots(db: DatabaseSync): BotProfile[] {
  ensureBotsSchema(db);
  const rows = db.prepare("SELECT data FROM bots ORDER BY position").all() as {
    data: string;
  }[];
  const seen = new Set<string>();
  const bots: BotProfile[] = [];
  for (const row of rows) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(row.data);
    } catch {
      continue;
    }
    const bot = sanitizeBotProfile(parsed);
    if (!bot || seen.has(bot.id)) continue;
    seen.add(bot.id);
    bots.push(bot);
  }
  return bots;
}

// The stored active and main ids, exactly as written (null when unset).
export function readSelection(db: DatabaseSync): {
  activeBotId: string | null;
  mainBotId: string | null;
} {
  ensureBotsSchema(db);
  const rows = db.prepare("SELECT key, bot_id FROM bot_selection").all() as {
    key: string;
    bot_id: string | null;
  }[];
  const byKey = new Map(rows.map((row) => [row.key, row.bot_id]));
  return {
    activeBotId: byKey.get(SELECTION_KEYS.activeBotId) ?? null,
    mainBotId: byKey.get(SELECTION_KEYS.mainBotId) ?? null,
  };
}

// An omitted field is left as stored; null clears it.
export function writeSelection(
  db: DatabaseSync,
  selection: BotSelection,
): void {
  ensureBotsSchema(db);
  const upsert = db.prepare(
    "INSERT INTO bot_selection (key, bot_id) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET bot_id = excluded.bot_id",
  );
  for (const field of ["activeBotId", "mainBotId"] as const) {
    const value = selection[field];
    if (value !== undefined) upsert.run(SELECTION_KEYS[field], value);
  }
}

// Replaces the whole list (and optionally the selection) in one transaction:
// a failure leaves the previous state intact. Callers pass validated bots.
export function replaceBots(
  db: DatabaseSync,
  bots: readonly BotProfile[],
  selection: BotSelection = {},
): void {
  ensureBotsSchema(db);
  const now = Date.now();
  db.exec("BEGIN IMMEDIATE");
  try {
    db.exec("DELETE FROM bots");
    const insert = db.prepare(
      "INSERT INTO bots (id, position, data, updated_at) VALUES (?, ?, ?, ?)",
    );
    bots.forEach((bot, index) => {
      insert.run(bot.id, index, JSON.stringify(bot), now);
    });
    writeSelection(db, selection);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
