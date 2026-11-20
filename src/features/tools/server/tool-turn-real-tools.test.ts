// End to end on the server: the real tool route, the real registry built
// from the env (bots, workspace, wake-ups, MCP), a scripted model and a real
// MCP server on localhost. Each ask tool pauses, is approved once, runs and
// its result reaches the model's next step.
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createServer, type Server } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import type { DatabaseSync } from "node:sqlite";
import { streamResponse } from "../../../shared/testing/stream-fixtures.ts";
import { DEFAULT_BOT } from "../../bots/bot-types.ts";
import { listBots, replaceBots } from "../../bots/server/bots-repository.ts";
import { clearMcpToolCache } from "../../mcp/server/mcp-tools.ts";
import { listRoutines } from "../../routines/server/routines-repository.ts";
import type { ToolTurnEvent } from "../tool-turn-events.ts";
import {
  runTurn,
  scriptedProvider,
  textReply,
  toolCallSse,
  turnOptions,
  turnRequest,
  withDb,
  type Body,
} from "./tool-turn-fixtures.ts";

type Approval = Extract<ToolTurnEvent, { type: "approval_required" }>;
const BOT = { ...DEFAULT_BOT, id: "bot_a" };

/** A minimal MCP server over Streamable HTTP on a free local port. */
async function mcpServer(): Promise<{
  url: string;
  calls: unknown[];
  server: Server;
}> {
  const calls: unknown[] = [];
  const server = createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      const msg = JSON.parse(raw) as {
        id?: number;
        method: string;
        params?: unknown;
      };
      if (msg.id === undefined) {
        res.writeHead(202).end();
        return;
      }
      let result: unknown = {};
      if (msg.method === "initialize")
        result = { protocolVersion: "2025-06-18" };
      if (msg.method === "tools/list") {
        result = {
          tools: [
            {
              name: "echo",
              description: "Echo text",
              inputSchema: {
                type: "object",
                properties: { text: { type: "string" } },
              },
            },
          ],
        };
      }
      if (msg.method === "tools/call") {
        calls.push(msg.params);
        const text = (msg.params as { arguments: { text: string } }).arguments
          .text;
        result = { content: [{ type: "text", text: `echo: ${text}` }] };
      }
      res.writeHead(200, {
        "content-type": "application/json",
        "mcp-session-id": "s",
      });
      res.end(JSON.stringify({ jsonrpc: "2.0", id: msg.id, result }));
    });
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const port = (server.address() as { port: number }).port;
  return { url: `http://127.0.0.1:${port}/mcp`, calls, server };
}

async function withSetup(
  run: (ctx: {
    db: DatabaseSync;
    env: Record<string, string>;
    workspace: string;
    mcpCalls: unknown[];
  }) => Promise<void>,
) {
  const workspace = mkdtempSync(join(tmpdir(), "openbot-ws-e2e-"));
  const mcp = await mcpServer();
  clearMcpToolCache();
  try {
    await withDb(async (db) => {
      replaceBots(db, [BOT]);
      await run({
        db,
        workspace,
        mcpCalls: mcp.calls,
        env: {
          OPENBOT_TOOLS: "1",
          OPENBOT_WORKSPACE_DIR: workspace,
          OPENBOT_MCP_SERVERS: JSON.stringify([
            { name: "local", url: mcp.url, allowPrivate: true },
          ]),
        },
      });
    });
  } finally {
    mcp.server.close();
    clearMcpToolCache();
    rmSync(workspace, { recursive: true, force: true });
  }
}

/**
 * Asks for one call, approves it once and returns what the model saw on the
 * step after the tool ran.
 */
async function callAndApprove(
  db: DatabaseSync,
  env: Record<string, string>,
  name: string,
  args: unknown,
): Promise<{ offered: string[]; toolMessage: string; final: ToolTurnEvent[] }> {
  const { fetchImpl, bodies } = scriptedProvider((_body: Body, index) =>
    index === 0
      ? streamResponse(toolCallSse([{ id: "c1", name, args }]))
      : textReply("done"),
  );
  const options = turnOptions(db, fetchImpl, { env });
  const first = await runTurn(turnRequest(), options);
  const approval = first.events.at(-1) as Approval;
  assert.equal(
    approval.type,
    "approval_required",
    JSON.stringify(first.events),
  );
  const resumed = await runTurn(
    turnRequest({
      resume: {
        turnId: approval.turnId,
        decisions: approval.calls.map((call) => ({
          callId: call.callId,
          decision: "once",
          argsDigest: call.argsDigest,
        })),
      },
    }),
    options,
  );
  const after = bodies.at(-1)!;
  const tool = after.messages.find((m) => m.role === "tool");
  return {
    offered: (bodies[0].tools ?? []).map((t) => t.function.name),
    toolMessage: String(tool?.content ?? ""),
    final: resumed.events,
  };
}

test("every parity tool is offered to the model on the first step", async () => {
  await withSetup(async ({ db, env }) => {
    const { offered } = await callAndApprove(db, env, "create_bot", {
      name: "QA",
      instructions: "You test things.",
    });
    for (const name of [
      "create_bot",
      "update_bot",
      "schedule_wakeup",
      "workspace_list",
      "workspace_read",
      "workspace_write",
      "mcp__local__echo",
    ]) {
      assert.ok(offered.includes(name), `${name} missing from ${offered}`);
    }
  });
});

test("create_bot adds a bot to the crew after approval", async () => {
  await withSetup(async ({ db, env }) => {
    const { toolMessage, final } = await callAndApprove(db, env, "create_bot", {
      name: "QA",
      instructions: "You test things.",
    });
    assert.equal(final.at(-1)?.type, "done");
    assert.match(toolMessage, /Created bot "QA"/);
    assert.deepEqual(
      listBots(db).map((b) => b.name),
      [BOT.name, "QA"],
    );
  });
});

test("workspace_write saves a file the next step can read", async () => {
  await withSetup(async ({ db, env, workspace }) => {
    const { toolMessage } = await callAndApprove(db, env, "workspace_write", {
      path: "notes/plan.md",
      content: "# Plan",
    });
    assert.match(toolMessage, /Created notes\/plan.md/);
    assert.equal(
      readFileSync(join(workspace, "bot_a", "notes", "plan.md"), "utf8"),
      "# Plan",
    );
    const read = await callAndApprove(db, env, "workspace_read", {
      path: "notes/plan.md",
    });
    assert.match(read.toolMessage, /# Plan/);
  });
});

test("schedule_wakeup leaves a one-time routine in its own thread", async () => {
  await withSetup(async ({ db, env }) => {
    const { toolMessage } = await callAndApprove(db, env, "schedule_wakeup", {
      note: "Check the deploy",
      inMinutes: 30,
    });
    assert.match(toolMessage, /Wake-up .* set for/);
    const [wake] = listRoutines(db, "bot_a");
    assert.equal(wake.schedule.kind, "once");
    assert.equal(wake.runInThread, true);
    assert.equal(wake.prompt, "Check the deploy");
  });
});

test("an MCP tool runs on the MCP server and comes back as data", async () => {
  await withSetup(async ({ db, env, mcpCalls }) => {
    const { toolMessage } = await callAndApprove(db, env, "mcp__local__echo", {
      text: "hello",
    });
    assert.deepEqual(mcpCalls, [
      { name: "echo", arguments: { text: "hello" } },
    ]);
    assert.match(
      toolMessage,
      /<external-data>\necho: hello\n<\/external-data>/,
    );
  });
});

test("a denied write leaves no file", async () => {
  await withSetup(async ({ db, env, workspace }) => {
    const { fetchImpl } = scriptedProvider((_b, index) =>
      index === 0
        ? streamResponse(
            toolCallSse([
              {
                id: "c1",
                name: "workspace_write",
                args: { path: "x.md", content: "x" },
              },
            ]),
          )
        : textReply("ok"),
    );
    const options = turnOptions(db, fetchImpl, { env });
    const first = await runTurn(turnRequest(), options);
    const approval = first.events.at(-1) as Approval;
    await runTurn(
      turnRequest({
        resume: {
          turnId: approval.turnId,
          decisions: approval.calls.map((call) => ({
            callId: call.callId,
            decision: "deny",
            argsDigest: call.argsDigest,
          })),
        },
      }),
      options,
    );
    assert.equal(existsSync(join(workspace, "bot_a", "x.md")), false);
  });
});
