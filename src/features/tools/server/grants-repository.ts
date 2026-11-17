import type { DatabaseSync } from "node:sqlite";
import { ensureToolsSchema } from "./tools-schema.ts";

// Always-allow grants, scoped to one bot and one tool. Only the user's
// explicit "always" decision may call grantTool.
export function grantTool(
  db: DatabaseSync,
  botId: string,
  toolName: string,
  now = Date.now(),
): void {
  ensureToolsSchema(db);
  db.prepare(
    "INSERT INTO tool_grants (bot_id, tool_name, granted_at) VALUES (?, ?, ?) ON CONFLICT(bot_id, tool_name) DO NOTHING",
  ).run(botId, toolName, now);
}

export function revokeTool(
  db: DatabaseSync,
  botId: string,
  toolName: string,
): void {
  ensureToolsSchema(db);
  db.prepare("DELETE FROM tool_grants WHERE bot_id = ? AND tool_name = ?").run(
    botId,
    toolName,
  );
}

export function listGrants(
  db: DatabaseSync,
  botId: string,
): { botId: string; toolName: string; grantedAt: number }[] {
  ensureToolsSchema(db);
  const rows = db
    .prepare(
      "SELECT tool_name, granted_at FROM tool_grants WHERE bot_id = ? ORDER BY tool_name",
    )
    .all(botId) as { tool_name: string; granted_at: number }[];
  return rows.map((row) => ({
    botId,
    toolName: row.tool_name,
    grantedAt: row.granted_at,
  }));
}

export type StoredGrant = {
  botId: string;
  toolName: string;
  grantedAt: number;
};

/** Every grant of every bot, for the Settings list. */
export function listAllGrants(db: DatabaseSync): StoredGrant[] {
  ensureToolsSchema(db);
  const rows = db
    .prepare(
      "SELECT bot_id, tool_name, granted_at FROM tool_grants ORDER BY bot_id, tool_name",
    )
    .all() as { bot_id: string; tool_name: string; granted_at: number }[];
  return rows.map((row) => ({
    botId: row.bot_id,
    toolName: row.tool_name,
    grantedAt: row.granted_at,
  }));
}

/** Removes every grant of every bot; idempotent. */
export function revokeAllGrants(db: DatabaseSync): void {
  ensureToolsSchema(db);
  db.prepare("DELETE FROM tool_grants").run();
}

/** Removes every grant of a bot; idempotent. For bot deletion cleanup. */
export function deleteGrantsForBot(db: DatabaseSync, botId: string): void {
  ensureToolsSchema(db);
  db.prepare("DELETE FROM tool_grants WHERE bot_id = ?").run(botId);
}
