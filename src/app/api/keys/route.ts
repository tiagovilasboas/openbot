import {
  handleDeleteKey,
  handleListKeys,
  handlePutKey,
  vaultUnavailable,
  type VaultContext,
} from "../../../features/key-vault/keys-handler.ts";
import { getVaultContext } from "../../../features/key-vault/vault-context.ts";

export const dynamic = "force-dynamic";

async function withVault(
  run: (context: VaultContext) => Response | Promise<Response>,
): Promise<Response> {
  try {
    return await run(getVaultContext());
  } catch (error) {
    // The message names the problem (such as a bad vault key setting), never a value.
    console.error("key vault unavailable:", (error as Error).message);
    return vaultUnavailable();
  }
}

export const GET = () => withVault(handleListKeys);
export const PUT = (request: Request) =>
  withVault((context) => handlePutKey(request, context));
export const DELETE = (request: Request) =>
  withVault((context) => handleDeleteKey(request, context));
