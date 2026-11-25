import type { DatabaseSync } from "node:sqlite";
import { listBots } from "../../../bots/server/bots-repository.ts";
import { vaultKeyLookup } from "../../../key-vault/vault-key-lookup.ts";
import { readSettings } from "../../../settings/server/settings-repository.ts";
import type { ChannelPostDeps } from "./channel-messages-handler.ts";
import { createModelChannelAsker } from "./model-channel-asker.ts";
import { createToolChannelAsker } from "./tool-channel-asker.ts";

/** What a group turn runs on in the app: saved bots, language and models. */
export function createChannelPostDeps(db: DatabaseSync): ChannelPostDeps {
  return {
    bots: () => listBots(db),
    language: () => readSettings(db).language ?? "pt",
    askModel: createToolChannelAsker(db, createModelChannelAsker(db), {
      keyLookup: vaultKeyLookup,
    }),
  };
}
