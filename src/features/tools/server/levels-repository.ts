import type { DatabaseSync } from "node:sqlite";
import type { ToolLevel, ToolLevels } from "../tool-policy.ts";
import { ensureToolsSchema } from "./tools-schema.ts";

/** Every stored level; a tool without a row is "ask". */
export function listToolLevels(db: DatabaseSync): ToolLevels {
  ensureToolsSchema(db);
  const rows = db
    .prepare("SELECT tool_name, level FROM tool_levels ORDER BY tool_name")
    .all() as { tool_name: string; level: "allow" | "block" }[];
  return Object.fromEntries(rows.map((row) => [row.tool_name, row.level]));
}

/** Sets one tool's level; "ask" is the default, so it removes the row. */
export function setToolLevel(
  db: DatabaseSync,
  toolName: string,
  level: ToolLevel,
  now = Date.now(),
): void {
  ensureToolsSchema(db);
  if (level === "ask") {
    db.prepare("DELETE FROM tool_levels WHERE tool_name = ?").run(toolName);
    return;
  }
  db.prepare(
    "INSERT INTO tool_levels (tool_name, level, updated_at) VALUES (?, ?, ?) ON CONFLICT(tool_name) DO UPDATE SET level = excluded.level, updated_at = excluded.updated_at",
  ).run(toolName, level, now);
}
