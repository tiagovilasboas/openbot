import { listBots } from "../../../../../features/bots/server/bots-repository.ts";
import {
  handleListMessages,
  handlePostMessage,
} from "../../../../../features/crew/channel/server/channel-messages-handler.ts";
import { createModelChannelAsker } from "../../../../../features/crew/channel/server/model-channel-asker.ts";
import { createToolChannelAsker } from "../../../../../features/crew/channel/server/tool-channel-asker.ts";
import { vaultKeyLookup } from "../../../../../features/key-vault/vault-key-lookup.ts";
import { readSettings } from "../../../../../features/settings/server/settings-repository.ts";
import { getLocalStore } from "../../../../../shared/local-store/local-store.ts";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  return handleListMessages(request, getLocalStore());
}

export function POST(request: Request) {
  const db = getLocalStore();
  return handlePostMessage(request, db, {
    bots: () => listBots(db),
    language: () => readSettings(db).language ?? "pt",
    askModel: createToolChannelAsker(db, createModelChannelAsker(db), {
      keyLookup: vaultKeyLookup,
    }),
  });
}
