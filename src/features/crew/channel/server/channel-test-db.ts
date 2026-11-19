import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { openLocalStore } from "../../../../shared/local-store/local-store.ts";
import type { AskCrewModel } from "../../run-crew-turn.ts";

/** A throwaway store in the OS temp dir; never touches ~/.openbot. */
export async function withChannelDb(
  run: (db: DatabaseSync) => void | Promise<void>,
) {
  const dir = mkdtempSync(join(tmpdir(), "openbot-channels-"));
  const db = openLocalStore(dir);
  try {
    await run(db);
  } finally {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
}

export type ModelCall = Parameters<AskCrewModel>[0];

/** A scripted model: answers each call with what `answer` returns. */
export function fakeModel(answer: (call: ModelCall) => string | null) {
  const calls: ModelCall[] = [];
  const askModel: AskCrewModel = async (call) => {
    calls.push(call);
    const text = answer(call);
    return text === null ? { ok: false } : { ok: true, text };
  };
  return { calls, askModel };
}
