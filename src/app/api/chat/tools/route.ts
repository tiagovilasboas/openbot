import { vaultKeyLookup } from "../../../../features/key-vault/vault-key-lookup.ts";
import { handleToolTurn } from "../../../../features/tools/server/tool-turn-handler.ts";
import { getLocalStore } from "../../../../shared/local-store/local-store.ts";

export const dynamic = "force-dynamic";

export function POST(request: Request) {
  return handleToolTurn(request, {
    env: process.env,
    db: getLocalStore(),
    keyLookup: vaultKeyLookup,
  });
}
