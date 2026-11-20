import type { DatabaseSync } from "node:sqlite";
import { askBotOnServer } from "../../bots/server/ask-bot-on-server.ts";
import { readSettings } from "../../settings/server/settings-repository.ts";
import { chainedPrompt } from "../routine-chain.ts";
import { routinePrompt } from "../silent-run.ts";
import {
  externalDataRule,
  wrapExternalText,
} from "../../untrusted-text/wrap-external-text.ts";
import type { RoutineRunner } from "./run-routines.ts";

/**
 * Runs a routine the way the chat would, on the server (see askBotOnServer).
 * A chained run also gets the previous routine's result, marked as data.
 */
export function createModelRoutineRunner(
  db: DatabaseSync,
  env: Readonly<Record<string, string | undefined>> = process.env,
): RoutineRunner {
  return async (routine, previousOutput) => {
    const language = readSettings(db).language ?? "pt";
    const text = routinePrompt(
      chainedPrompt(
        routine.prompt,
        previousOutput ? wrapExternalText(previousOutput) : undefined,
        language,
      ),
      routine.silentWhenNothingNew,
      language,
    );
    return askBotOnServer(
      db,
      routine.botId,
      [{ role: "user", text }],
      env,
      previousOutput ? externalDataRule : undefined,
    );
  };
}
