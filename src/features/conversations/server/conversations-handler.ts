import type { DatabaseSync } from "node:sqlite";
import { isValidBotId } from "../../bots/bot-id.ts";
import { STORED_MESSAGES_MAX } from "../../chat/stored-message.ts";
import {
  bodyLimitFor,
  readBodyWithCap,
} from "../../server-guard/body-limits.ts";
import {
  deleteThread,
  listThreads,
  readThread,
  replaceThread,
} from "./conversations-repository.ts";

const NO_STORE = { "Cache-Control": "no-store" } as const;

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: NO_STORE });
}

const invalidBotId = () => json({ error: "invalid_bot_id" }, 400);

// The bot id of the request: null when the query has none (list), false when
// it is present but not a valid id.
function readBotId(request: Request): string | null | false {
  const value = new URL(request.url).searchParams.get("botId");
  if (value === null) return null;
  return isValidBotId(value) ? value : false;
}

/** GET /api/conversations[?botId=]: the thread summaries or one thread. */
export function handleGetConversations(
  request: Request,
  db: DatabaseSync,
): Response {
  const botId = readBotId(request);
  if (botId === false) return invalidBotId();
  if (botId === null) return json({ threads: listThreads(db) });
  return json({ botId, ...readThread(db, botId) });
}

/** PUT /api/conversations?botId=: replaces the whole thread atomically. */
export async function handlePutConversation(
  request: Request,
  db: DatabaseSync,
): Promise<Response> {
  const botId = readBotId(request);
  if (!botId) return invalidBotId();
  const text = await readBodyWithCap(
    request,
    bodyLimitFor("PUT", "/api/conversations"),
  );
  if (text === null) return json({ error: "payload_too_large" }, 413);
  let body: unknown = null;
  try {
    body = JSON.parse(text);
  } catch {
    // Falls through to invalid_body.
  }
  const messages =
    typeof body === "object" && body !== null
      ? (body as Record<string, unknown>).messages
      : undefined;
  if (!Array.isArray(messages)) return json({ error: "invalid_body" }, 400);
  if (messages.length > STORED_MESSAGES_MAX) {
    return json({ error: "too_many_messages" }, 400);
  }
  const result = replaceThread(db, botId, messages);
  if (!result.ok) return json({ error: result.error }, 400);
  return json({ botId, updatedAt: result.updatedAt, count: result.count });
}

/** DELETE /api/conversations?botId=: removes a thread; idempotent. */
export function handleDeleteConversation(
  request: Request,
  db: DatabaseSync,
): Response {
  const botId = readBotId(request);
  if (!botId) return invalidBotId();
  deleteThread(db, botId);
  return new Response(null, { status: 204, headers: NO_STORE });
}
