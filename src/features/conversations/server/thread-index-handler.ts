import type { DatabaseSync } from "node:sqlite";
import { isValidBotId } from "../../bots/bot-id.ts";
import {
  bodyLimitFor,
  readBodyWithCap,
} from "../../server-guard/body-limits.ts";
import {
  readThreadIndex,
  replaceThreadIndex,
} from "./thread-index-repository.ts";

const PATH = "/api/conversations/threads";
const NO_STORE = { "Cache-Control": "no-store" } as const;

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: NO_STORE });
}

const botIdOf = (request: Request): string | null => {
  const value = new URL(request.url).searchParams.get("botId");
  return isValidBotId(value) ? value : null;
};

/** GET /api/conversations/threads?botId=: the bot's thread list. */
export function handleGetThreadIndex(
  request: Request,
  db: DatabaseSync,
): Response {
  const botId = botIdOf(request);
  if (!botId) return json({ error: "invalid_bot_id" }, 400);
  return json({ botId, threads: readThreadIndex(db, botId) });
}

/** PUT /api/conversations/threads?botId=: replaces the bot's whole list. */
export async function handlePutThreadIndex(
  request: Request,
  db: DatabaseSync,
): Promise<Response> {
  const botId = botIdOf(request);
  if (!botId) return json({ error: "invalid_bot_id" }, 400);
  const text = await readBodyWithCap(request, bodyLimitFor("PUT", PATH));
  if (text === null) return json({ error: "payload_too_large" }, 413);
  let body: unknown = null;
  try {
    body = JSON.parse(text);
  } catch {
    // Falls through to invalid_body.
  }
  const threads =
    typeof body === "object" && body !== null
      ? (body as Record<string, unknown>).threads
      : undefined;
  if (!Array.isArray(threads)) return json({ error: "invalid_body" }, 400);
  const result = replaceThreadIndex(db, botId, threads);
  if (!result.ok) return json({ error: result.error }, 400);
  return json({ botId, count: threads.length });
}
