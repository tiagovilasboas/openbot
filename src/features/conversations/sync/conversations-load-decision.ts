import type { MessageData } from "../../chat/ChatMessageItem.tsx";
import type { ThreadResult } from "./conversations-sync-types.ts";

export type ThreadLoadDecision =
  | { action: "use-server"; messages: MessageData[] }
  | { action: "import"; messages: MessageData[] }
  | { action: "keep-local" };

/**
 * What the first load does for one bot's thread. The server is the source
 * of truth, except when it cannot be reached or when this browser holds
 * a change to this thread it never delivered. An empty server takes the browser's thread.
 */
export function decideThreadLoad(input: {
  server: ThreadResult;
  local: readonly MessageData[];
  unsynced: boolean;
}): ThreadLoadDecision {
  const { server, local, unsynced } = input;
  if (!server.ok) return { action: "keep-local" };
  // Undelivered edits win, an emptied thread included.
  if (unsynced) return { action: "import", messages: [...local] };
  if (server.messages.length > 0) {
    const same = JSON.stringify(server.messages) === JSON.stringify(local);
    return same
      ? { action: "keep-local" }
      : { action: "use-server", messages: server.messages };
  }
  if (local.length > 0) return { action: "import", messages: [...local] };
  return { action: "keep-local" };
}
