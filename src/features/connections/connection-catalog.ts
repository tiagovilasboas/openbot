/** The services Open Bot connects to with a key or token. */
export type ConnectionId = "router" | "anthropic" | "github";

export type ConnectionGroup = "models" | "tools";

export interface ConnectionEntry {
  id: ConnectionId;
  group: ConnectionGroup;
  name: string;
  /** Where the user creates the key. */
  keyUrl: string;
  keyUrlLabel: string;
  placeholder: string;
}

export const CONNECTIONS: readonly ConnectionEntry[] = [
  {
    id: "router",
    group: "models",
    name: "OpenRouter",
    keyUrl: "https://openrouter.ai/keys",
    keyUrlLabel: "openrouter.ai/keys",
    placeholder: "sk-or-v1-...",
  },
  {
    id: "anthropic",
    group: "models",
    name: "Anthropic",
    keyUrl: "https://console.anthropic.com/settings/keys",
    keyUrlLabel: "console.anthropic.com",
    placeholder: "sk-ant-api03-...",
  },
  {
    id: "github",
    group: "tools",
    name: "GitHub",
    keyUrl: "https://github.com/settings/personal-access-tokens",
    keyUrlLabel: "github.com/settings/tokens",
    placeholder: "github_pat_...",
  },
];

export function findConnection(id: ConnectionId): ConnectionEntry {
  const entry = CONNECTIONS.find((item) => item.id === id);
  if (!entry) throw new Error(`Unknown connection: ${id}`);
  return entry;
}
