// Test doubles for the tool turn handler: a scripted provider and a temp store.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { openLocalStore } from "../../../shared/local-store/local-store.ts";
import {
  routerSse,
  streamResponse,
} from "../../../shared/testing/stream-fixtures.ts";
import type { FetchLike } from "../../model/model-adapter.ts";
import { createStreamSlots } from "../../server-guard/stream-slots.ts";
import type { ToolTurnEvent } from "../tool-turn-events.ts";
import { fakeTool } from "../tool-loop-fixtures.ts";
import { createToolRegistry } from "../tool-registry.ts";
import { handleToolTurn, type ToolTurnOptions } from "./tool-turn-handler.ts";

export async function withDb(run: (db: DatabaseSync) => Promise<void>) {
  const dir = mkdtempSync(join(tmpdir(), "openbot-tool-turn-"));
  const db = openLocalStore(dir);
  try {
    await run(db);
  } finally {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
}

/** OpenAI-compatible SSE lines for one step that only calls tools. */
export function toolCallSse(
  calls: { id: string; name: string; args: unknown }[],
) {
  const delta = {
    tool_calls: calls.map((call, index) => ({
      index,
      id: call.id,
      function: { name: call.name, arguments: JSON.stringify(call.args) },
    })),
  };
  return [
    `data: ${JSON.stringify({ choices: [{ delta }] })}\n\n`,
    `data: ${JSON.stringify({ choices: [{ delta: {}, finish_reason: "tool_calls" }] })}\n\n`,
    "data: [DONE]\n\n",
  ];
}

export type Body = {
  tools?: { function: { name: string } }[];
  messages: { role: string; content: string | null }[];
};

/** A provider that answers each request with the reply the script picks. */
export function scriptedProvider(
  reply: (body: Body, index: number) => Response,
) {
  const bodies: Body[] = [];
  const fetchImpl: FetchLike = async (_url, init) => {
    const body = JSON.parse(String(init?.body)) as Body;
    bodies.push(body);
    return reply(body, bodies.length - 1);
  };
  return { fetchImpl, bodies };
}

export const textReply = (text = "answer") => streamResponse(routerSse([text]));

export const MESSAGES = [{ role: "user", text: "hi" }];

export function turnRequest(extra: Record<string, unknown> = {}): Request {
  return new Request("http://localhost/api/chat/tools", {
    method: "POST",
    body: JSON.stringify({
      language: "en",
      messages: MESSAGES,
      config: {
        provider: "router",
        baseUrl: "https://93.184.216.34/v1",
        model: "vendor/model",
      },
      botId: "bot_a",
      toolsEnabled: true,
      ...extra,
    }),
  });
}

/** An auto "lookup" tool and an ask "note" tool that offers always-allow. */
export function fakeTools() {
  const lookup = fakeTool({ name: "lookup" });
  const note = fakeTool({ name: "note", policy: "ask", allowAlways: true });
  return {
    lookup,
    note,
    registry: createToolRegistry([lookup.tool, note.tool]),
  };
}

export function turnOptions(
  db: DatabaseSync,
  fetchImpl: FetchLike,
  extra: Partial<ToolTurnOptions> = {},
): ToolTurnOptions {
  return {
    env: { OPENBOT_TOOLS: "1" },
    db,
    fetchImpl,
    slots: createStreamSlots({ perClient: 5, global: 10 }),
    capabilityOf: async () => "native",
    ...extra,
  };
}

export async function runTurn(
  request: Request,
  options: ToolTurnOptions,
): Promise<{ status: number; events: ToolTurnEvent[]; json?: unknown }> {
  const response = await handleToolTurn(request, options);
  const type = response.headers.get("content-type") ?? "";
  if (!type.includes("ndjson")) {
    return { status: response.status, events: [], json: await response.json() };
  }
  const text = await response.text();
  const events = text
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as ToolTurnEvent);
  return { status: response.status, events };
}

export const types = (events: ToolTurnEvent[]) =>
  events.map((event) => event.type);
