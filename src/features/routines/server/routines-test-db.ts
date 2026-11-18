import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { openLocalStore } from "../../../shared/local-store/local-store.ts";
import type { RoutineInput } from "../routine-input.ts";

/** A throwaway store in the OS temp dir; never touches ~/.openbot. */
export async function withDb(run: (db: DatabaseSync) => void | Promise<void>) {
  const dir = mkdtempSync(join(tmpdir(), "openbot-routines-"));
  const db = openLocalStore(dir);
  try {
    await run(db);
  } finally {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
}

export function routine(overrides: Partial<RoutineInput> = {}): RoutineInput {
  return {
    id: "r1",
    botId: "bot-a",
    title: "Resumo",
    prompt: "Resuma os PRs abertos",
    schedule: { kind: "interval", everyMinutes: 10 },
    enabled: true,
    silentWhenNothingNew: false,
    runInThread: false,
    ...overrides,
  };
}
