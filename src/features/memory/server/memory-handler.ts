import type { DatabaseSync } from "node:sqlite";
import { isValidBotId } from "../../bots/bot-id.ts";
import {
  bodyLimitFor,
  readBodyWithCap,
} from "../../server-guard/body-limits.ts";
import { MEMORY_MAX_ENTRIES } from "../memory-entries.ts";
import {
  deleteNotes,
  listNotes,
  readNotes,
  replaceNotes,
} from "./memory-repository.ts";

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

/** GET /api/memory[?botId=]: the notes summaries or one bot's notes. */
export function handleGetMemory(request: Request, db: DatabaseSync): Response {
  const botId = readBotId(request);
  if (botId === false) return invalidBotId();
  if (botId === null) return json({ notes: listNotes(db) });
  return json({ botId, ...readNotes(db, botId) });
}

/** PUT /api/memory?botId=: replaces the bot's whole list atomically. */
export async function handlePutMemory(
  request: Request,
  db: DatabaseSync,
): Promise<Response> {
  const botId = readBotId(request);
  if (!botId) return invalidBotId();
  const text = await readBodyWithCap(
    request,
    bodyLimitFor("PUT", "/api/memory"),
  );
  if (text === null) return json({ error: "payload_too_large" }, 413);
  let body: unknown = null;
  try {
    body = JSON.parse(text);
  } catch {
    // Falls through to invalid_body.
  }
  const entries =
    typeof body === "object" && body !== null && !Array.isArray(body)
      ? (body as { entries?: unknown }).entries
      : undefined;
  if (!Array.isArray(entries)) return json({ error: "invalid_body" }, 400);
  if (entries.length > MEMORY_MAX_ENTRIES) {
    return json({ error: "too_many_entries" }, 400);
  }
  const result = replaceNotes(db, botId, entries);
  if (!result.ok) return json({ error: result.error }, 400);
  return json({ botId, updatedAt: result.updatedAt, count: result.count });
}

/** DELETE /api/memory?botId=: removes a bot's notes; idempotent. */
export function handleDeleteMemory(
  request: Request,
  db: DatabaseSync,
): Response {
  const botId = readBotId(request);
  if (!botId) return invalidBotId();
  deleteNotes(db, botId);
  return new Response(null, { status: 204, headers: NO_STORE });
}
