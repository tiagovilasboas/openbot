import type { DatabaseSync } from "node:sqlite";
import {
  bodyLimitFor,
  readBodyWithCap,
} from "../../server-guard/body-limits.ts";
import type { ToolRegistry } from "../tool-registry.ts";
import { canAllow, isToolLevel, levelOf } from "../tool-policy.ts";
import { listToolLevels, setToolLevel } from "./levels-repository.ts";

const NO_STORE = { "Cache-Control": "no-store" } as const;

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: NO_STORE });
}

/** Each registered tool with its level and whether "allow" may be offered. */
function listLevels(db: DatabaseSync, tools: ToolRegistry) {
  const levels = listToolLevels(db);
  return {
    tools: [...tools.values()].map((tool) => ({
      name: tool.name,
      level: levelOf(tool, levels),
      canAllow: canAllow(tool),
      // A tool the user answers always asks; "ask" would mean nothing more.
      canAsk: !tool.answer,
    })),
  };
}

/** GET /api/tools/levels: the level of every tool, for the Settings list. */
export function handleGetLevels(db: DatabaseSync, tools: ToolRegistry) {
  return json(listLevels(db, tools));
}

/**
 * PUT /api/tools/levels with {toolName, level}. The tool must exist in the
 * registry; "allow" is refused for a tool that does not opt in with
 * allowAlways. Answers the fresh list.
 */
export async function handlePutLevel(
  request: Request,
  db: DatabaseSync,
  tools: ToolRegistry,
): Promise<Response> {
  const text = await readBodyWithCap(
    request,
    bodyLimitFor("PUT", "/api/tools/levels"),
  );
  if (text === null) return json({ error: "payload_too_large" }, 413);
  let body: Record<string, unknown> | null = null;
  try {
    const parsed: unknown = JSON.parse(text);
    if (typeof parsed === "object" && parsed !== null) {
      body = parsed as Record<string, unknown>;
    }
  } catch {
    // Falls through to invalid_body.
  }
  if (!body || !isToolLevel(body.level) || typeof body.toolName !== "string") {
    return json({ error: "invalid_body" }, 400);
  }
  const tool = tools.get(body.toolName);
  if (!tool) return json({ error: "unknown_tool" }, 404);
  if (body.level === "allow" && !canAllow(tool)) {
    return json({ error: "allow_not_permitted" }, 400);
  }
  if (body.level === "ask" && tool.answer) {
    return json({ error: "ask_not_permitted" }, 400);
  }
  setToolLevel(db, tool.name, body.level);
  return json(listLevels(db, tools));
}
