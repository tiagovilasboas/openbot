import type { DatabaseSync } from "node:sqlite";
import {
  isSettingKey,
  type AppSettings,
  type SettingsPatch,
} from "../settings-types.ts";
import { validateSetting } from "../settings-validation.ts";
import { ensureSettingsSchema } from "./settings-schema.ts";

/** The saved settings. A damaged or unknown row is skipped, never an error. */
export function readSettings(db: DatabaseSync): AppSettings {
  ensureSettingsSchema(db);
  const rows = db.prepare("SELECT key, value FROM settings").all() as {
    key: string;
    value: string | null;
  }[];
  const settings: Record<string, unknown> = {};
  for (const row of rows) {
    if (!isSettingKey(row.key) || typeof row.value !== "string") continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(row.value);
    } catch {
      continue;
    }
    const value = validateSetting(row.key, parsed);
    if (value !== undefined) settings[row.key] = value;
  }
  return settings as AppSettings;
}

/**
 * Merges a patch that was already validated: each key present is written (or
 * cleared with null) and the rest stay, all in one transaction.
 */
export function applySettings(db: DatabaseSync, patch: SettingsPatch): void {
  ensureSettingsSchema(db);
  const now = Date.now();
  db.exec("BEGIN IMMEDIATE");
  try {
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined) continue;
      if (value === null) {
        db.prepare("DELETE FROM settings WHERE key = ?").run(key);
      } else {
        db.prepare(
          "INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
        ).run(key, JSON.stringify(value), now);
      }
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
