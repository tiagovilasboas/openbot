import type { ConnectionId } from "../../connections/copy.ts";
import { getLocalStore } from "../../../shared/local-store/local-store.ts";
import { readSettings } from "./settings-repository.ts";

/**
 * Server only: the providers switched off, as the settings store holds them.
 * The model routes pass this to their off-provider check.
 */
export function savedOffProviders(): readonly ConnectionId[] {
  return readSettings(getLocalStore()).providersOff ?? [];
}
