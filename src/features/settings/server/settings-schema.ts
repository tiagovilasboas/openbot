import type { DatabaseSync } from "node:sqlite";
import {
  migrate,
  type MigrationStep,
} from "../../../shared/local-store/migrate.ts";

// Append new steps; never edit or reorder applied ones.
export const SETTINGS_MIGRATIONS: readonly MigrationStep[] = [
  "CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT, updated_at INTEGER)",
];

const migrated = new WeakSet<DatabaseSync>();

// Runs the settings migrations once per database handle.
export function ensureSettingsSchema(db: DatabaseSync): void {
  if (migrated.has(db)) return;
  migrate(db, "settings", SETTINGS_MIGRATIONS);
  migrated.add(db);
}
