import { vaultKeyLookup } from "../../../../features/key-vault/vault-key-lookup.ts";
import { handleChatStream } from "../../../../features/model/stream-chat-handler.ts";
import { savedOffProviders } from "../../../../features/settings/server/saved-off-providers.ts";

export const dynamic = "force-dynamic";

export function POST(request: Request) {
  return handleChatStream(request, {
    env: process.env,
    keyLookup: vaultKeyLookup,
    offProviders: savedOffProviders,
  });
}
