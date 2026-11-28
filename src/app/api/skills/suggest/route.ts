import {
  resolveVaultOAuthSession,
  vaultKeyLookup,
} from "../../../../features/key-vault/vault-key-lookup.ts";
import { savedOffProviders } from "../../../../features/settings/server/saved-off-providers.ts";
import { handleSuggestSkill } from "../../../../features/skills/suggest-skill-handler.ts";

export const dynamic = "force-dynamic";

export function POST(request: Request) {
  return handleSuggestSkill(request, {
    env: process.env,
    keyLookup: vaultKeyLookup,
    oauthLookup: resolveVaultOAuthSession,
    offProviders: savedOffProviders,
  });
}
