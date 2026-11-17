/** Public copy and default model ids of the connections feature, importable without React (tests, parity checks). */
export { connectionsCopy } from "./panel/connections-copy.ts";
export { isOpenRouterUrl } from "./api-key/openrouter-url.ts";
export {
  ANTHROPIC_DEFAULT_MODEL,
  OPENROUTER_FREE_MODEL,
  OPENROUTER_URL,
} from "./api-key/model-config-on-connection.ts";
export { offProviderCopy, providerName } from "./switch/off-provider-copy.ts";
export { validateOffProviders } from "./switch/provider-switch.ts";
export type { ConnectionId } from "./core/index.ts";
export {
  connectionForModelId,
  connectionForProviderType,
  connectionUsability,
  modelUsability,
  nextTurnUsability,
  providerTypeUsability,
  type Usability,
} from "./switch/model-availability.ts";
