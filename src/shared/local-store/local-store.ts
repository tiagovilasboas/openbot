// Local store: the server-side SQLite database that holds all Open Bot data.
//
// - Where: <OPENBOT_DATA_DIR or ~/.openbot>/openbot.db (WAL mode).
// - Permissions: the directory is 0700 and the database files are 0600, so
//   only the owner can read keys and conversations.
// - Server only: this imports node:sqlite and node:fs. Import it from route
//   handlers and server code, never from client components.
// - Migrations: a domain keeps its own ordered `steps` list in its feature
//   folder and calls `migrate(db, "<domain>", steps)` before first use. Append
//   new steps; never edit or reorder applied ones. This module knows no domain.
import { chmodSync, closeSync, existsSync, openSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { ensureDataDir, resolveDataDir } from "./data-dir.ts";

const DB_FILE = "openbot.db";
const PRIVATE_FILE_MODE = 0o600;
const STORE_KEY = Symbol.for("openbot.localStore");

export type LocalStore = DatabaseSync;

function restrictFiles(file: string): void {
  for (const path of [file, `${file}-wal`, `${file}-shm`]) {
    if (existsSync(path)) chmodSync(path, PRIVATE_FILE_MODE);
  }
}

// Opens a fresh handle on <dir>/openbot.db. Tests use this; callers close it.
export function openLocalStore(dir: string): LocalStore {
  ensureDataDir(dir);
  const file = join(dir, DB_FILE);
  // Create the file private first so SQLite copies that mode to -wal and -shm.
  closeSync(openSync(file, "a", PRIVATE_FILE_MODE));
  const db = new DatabaseSync(file);
  try {
    db.exec("PRAGMA journal_mode = WAL");
    db.exec("PRAGMA foreign_keys = ON");
    db.exec("PRAGMA busy_timeout = 5000");
    restrictFiles(file);
  } catch (error) {
    db.close();
    throw error;
  }
  return db;
}

type StoreHolder = { [STORE_KEY]?: LocalStore };

// Process-wide handle, kept on globalThis so Next.js dev hot reload reuses it.
export function getLocalStore(): LocalStore {
  const holder = globalThis as StoreHolder;
  holder[STORE_KEY] ??= openLocalStore(resolveDataDir());
  return holder[STORE_KEY];
}
