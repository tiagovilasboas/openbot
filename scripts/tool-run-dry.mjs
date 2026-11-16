// Dry-run transport for the tools scenario: the real route handler, a real
// SQLite store in a temp directory and a SCRIPTED provider, all in-process.
// No server, no network, no key. It proves the scenario and the route agree;
// it says nothing about any model. The temp directory is removed on close().
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import "../src/shared/testing/register-alias-resolver.mjs";
import { parseNdjson } from "./tool-run-events.mjs";

const sse = (text) =>
  new Response(
    [
      `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`,
      "data: [DONE]\n\n",
    ].join(""),
    { headers: { "content-type": "text/event-stream" } },
  );

function lastUserText(body) {
  const user = body.messages.filter((m) => m.role === "user").at(-1);
  return String(user?.content ?? "");
}

/** Calls the tool the prompt asks for, then answers once a result is back. */
function scriptedFetch(toolCallSse) {
  let calls = 0;
  return async (url, init) => {
    if (String(url).includes("api.github.com")) return Response.json([]);
    const body = JSON.parse(String(init?.body));
    const afterTool = body.messages.some((m) => m.role === "tool");
    const text = lastUserText(body);
    const call = (name, args) =>
      new Response(
        toolCallSse([{ id: `dry-${++calls}`, name, args }]).join(""),
        {
          headers: { "content-type": "text/event-stream" },
        },
      );
    if (!afterTool && body.tools?.length) {
      if (/github/i.test(text)) {
        return call("github_list_open_items", {
          owner: "tiagovilasboas",
          repo: "openbot",
          kind: "all",
        });
      }
      if (/remember/i.test(text)) {
        return call("memory_add_note", { text: `dry-run note ${calls}` });
      }
    }
    return sse("Done (scripted reply).");
  };
}

export async function createDryTransport() {
  const { openLocalStore } =
    await import("../src/shared/local-store/local-store.ts");
  const { handleToolTurn } =
    await import("../src/features/tools/server/tool-turn-handler.ts");
  const { handleGetMemory } =
    await import("../src/features/memory/server/memory-handler.ts");
  const { toolCallSse } =
    await import("../src/features/tools/server/tool-turn-fixtures.ts");
  const { createStreamSlots } =
    await import("../src/features/server-guard/stream-slots.ts");

  const dir = mkdtempSync(join(tmpdir(), "openbot-tools-dry-"));
  const db = openLocalStore(dir);
  const options = {
    env: { OPENBOT_TOOLS: "1" },
    db,
    fetchImpl: scriptedFetch(toolCallSse),
    slots: createStreamSlots({ perClient: 5, global: 10 }),
    capabilityOf: async () => "native",
  };
  const config = {
    provider: "router",
    baseUrl: "https://93.184.216.34/v1",
    model: "dry/scripted",
  };
  return {
    async turn(body) {
      const response = await handleToolTurn(
        new Request("http://localhost/api/chat/tools", {
          method: "POST",
          body: JSON.stringify({ ...body, config }),
        }),
        options,
      );
      const text = await response.text();
      const ndjson = (response.headers.get("content-type") ?? "").includes(
        "ndjson",
      );
      return {
        status: response.status,
        events: ndjson ? parseNdjson(text) : [],
        json: ndjson ? undefined : JSON.parse(text || "{}"),
      };
    },
    async memory(botId) {
      const url = `http://localhost/api/memory?botId=${encodeURIComponent(botId)}`;
      return handleGetMemory(new Request(url), db).json();
    },
    close() {
      db.close();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}
