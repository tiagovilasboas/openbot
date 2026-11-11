import { withApiHeaders } from "../../server-guard/api-request-init.ts";
import { sanitizeStoredMessages } from "../../chat/stored-message.ts";
import type { MessageData } from "../../chat/ChatMessageItem.tsx";
import type {
  ConversationsApi,
  SyncFailure,
  ThreadResult,
  WriteResult,
} from "./conversations-sync-types.ts";

const URL_BASE = "/api/conversations";

const urlFor = (botId: string) =>
  `${URL_BASE}?botId=${encodeURIComponent(botId)}`;

async function request(
  fetchFn: typeof fetch,
  botId: string,
  init: RequestInit,
): Promise<{ ok: true; data: unknown } | { ok: false; failure: SyncFailure }> {
  let response: Response;
  try {
    response = await fetchFn(urlFor(botId), withApiHeaders(init));
  } catch {
    return { ok: false, failure: { kind: "network" } };
  }
  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    // A 204 or a body that is not JSON carries nothing to read.
  }
  if (response.ok) return { ok: true, data };
  const error = (data as { error?: unknown } | null)?.error;
  return {
    ok: false,
    failure: {
      kind: "http",
      status: response.status,
      ...(typeof error === "string" && { error }),
    },
  };
}

/** The HTTP client for /api/conversations; fetch is injected for tests. */
export function createConversationsApi(
  fetchFn: typeof fetch = (...args) => fetch(...args),
): ConversationsApi {
  return {
    async get(botId): Promise<ThreadResult> {
      const result = await request(fetchFn, botId, { method: "GET" });
      if (!result.ok) return result;
      const messages = (result.data as { messages?: unknown } | null)?.messages;
      // The client sanitizes what the server already validated.
      return Array.isArray(messages)
        ? { ok: true, messages: sanitizeStoredMessages(messages) }
        : { ok: false, failure: { kind: "network" } };
    },
    async put(botId, messages: MessageData[]): Promise<WriteResult> {
      const result = await request(fetchFn, botId, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages }),
      });
      return result.ok ? { ok: true } : result;
    },
    async remove(botId): Promise<WriteResult> {
      const result = await request(fetchFn, botId, { method: "DELETE" });
      return result.ok ? { ok: true } : result;
    },
  };
}
