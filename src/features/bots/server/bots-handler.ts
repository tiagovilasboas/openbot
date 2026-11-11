import type { DatabaseSync } from "node:sqlite";
import { isValidBotId } from "../bot-id.ts";
import { DEFAULT_BOT } from "../bot-types.ts";
import { resolveMainBotId } from "../main-bot.ts";
import {
  bodyLimitFor,
  readBodyWithCap,
} from "../../server-guard/body-limits.ts";
import { dropsMainBot } from "./main-bot-guard.ts";
import {
  listBots,
  readSelection,
  replaceBots,
  type BotSelection,
} from "./bots-repository.ts";
import { validateBotsWrite } from "./validate-bots-write.ts";

const NO_STORE = { "Cache-Control": "no-store" } as const;

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: NO_STORE });
}

// Resolves the stored ids the way the client does: an active id that points
// to no bot falls back to the first bot; the main id uses resolveMainBotId.
// `bots` is empty until the first write, so a client can tell "nothing saved".
function storedState(db: DatabaseSync) {
  const bots = listBots(db);
  const stored = readSelection(db);
  const active =
    stored.activeBotId === "default" ? DEFAULT_BOT.id : stored.activeBotId;
  const activeBotId = bots.some((bot) => bot.id === active)
    ? active
    : (bots[0]?.id ?? null);
  const mainBotId = resolveMainBotId(stored.mainBotId, bots) ?? null;
  return { bots, activeBotId, mainBotId };
}

// An id field is absent (leave as is), null (clear) or a valid bot id.
function parseSelectionField(
  value: unknown,
): string | null | undefined | false {
  if (value === undefined || value === null) return value;
  return isValidBotId(value) ? value : false;
}

/** GET /api/bots: the saved bots in order plus the resolved active and main ids. */
export function handleGetBots(db: DatabaseSync): Response {
  return json(storedState(db));
}

/** PUT /api/bots: replaces the whole list atomically; any invalid bot rejects it. */
export async function handlePutBots(
  request: Request,
  db: DatabaseSync,
): Promise<Response> {
  // The guard checks the declared length; this bounds the bytes actually read.
  const text = await readBodyWithCap(request, bodyLimitFor("PUT", "/api/bots"));
  if (text === null) return json({ error: "payload_too_large" }, 413);
  let body: unknown = null;
  try {
    body = JSON.parse(text);
  } catch {
    // Falls through to invalid_body.
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return json({ error: "invalid_body" }, 400);
  }
  const input = body as Record<string, unknown>;
  const active = parseSelectionField(input.activeBotId);
  const main = parseSelectionField(input.mainBotId);
  if (active === false || main === false) {
    return json({ error: "invalid_body" }, 400);
  }
  const result = validateBotsWrite(input.bots);
  if (!result.ok) return json({ error: result.error }, 400);

  if (dropsMainBot(listBots(db), readSelection(db).mainBotId, result.bots)) {
    return json({ error: "main_bot_required" }, 400);
  }

  const selection: BotSelection = {
    ...(active !== undefined && { activeBotId: active }),
    ...(main !== undefined && { mainBotId: main }),
  };
  replaceBots(db, result.bots, selection);
  return json(storedState(db));
}
