import assert from "node:assert/strict";
import test from "node:test";
import { parseMcpConfig } from "./mcp-config.ts";
import {
  liteInputSchema,
  qualifiedToolName,
  resultText,
  cleanDescription,
} from "./mcp-tool-shape.ts";

test("no config means no servers", () => {
  assert.deepEqual(parseMcpConfig(undefined), { ok: true, servers: [] });
  assert.deepEqual(parseMcpConfig("  "), { ok: true, servers: [] });
});

test("servers are validated one by one", () => {
  const ok = parseMcpConfig(
    JSON.stringify([
      {
        name: "linear",
        url: "https://mcp.linear.app/mcp",
        tokenEnv: "LINEAR_TOKEN",
      },
      { name: "local", url: "http://127.0.0.1:9000/mcp", allowPrivate: true },
    ]),
  );
  assert.ok(ok.ok);
  assert.equal(ok.servers[1].allowPrivate, true);
  assert.equal(ok.servers[0].allowPrivate, false);
  for (const bad of [
    "{",
    "{}",
    JSON.stringify([{ name: "Bad Name", url: "https://a" }]),
    JSON.stringify([{ name: "a", url: "ftp://a" }]),
    JSON.stringify([{ name: "a", url: "https://u:p@a" }]),
    JSON.stringify([
      { name: "a", url: "https://a", tokenEnv: "NEXT_PUBLIC_X" },
    ]),
    JSON.stringify([
      { name: "a", url: "https://a" },
      { name: "a", url: "https://b" },
    ]),
  ]) {
    assert.equal(parseMcpConfig(bad).ok, false, bad);
  }
});

test("tool names are qualified, cleaned and capped at 64", () => {
  assert.equal(
    qualifiedToolName("linear", "create.issue"),
    "mcp__linear__create_issue",
  );
  assert.equal(qualifiedToolName("a", "x".repeat(60)), null);
  assert.equal(qualifiedToolName("a", ""), null);
});

test("schemas are reduced to the subset the model takes", () => {
  const schema = liteInputSchema({
    type: "object",
    properties: {
      title: { type: "string", description: "<b>Title</b>" },
      tags: { type: "array", items: { type: ["string", "null"] } },
      any: { anyOf: [{ type: "string" }] },
    },
    required: ["title", "missing"],
    $defs: { x: 1 },
  });
  assert.deepEqual(schema, {
    type: "object",
    properties: {
      title: { type: "string", description: "b Title /b" },
      tags: { type: "array", items: { type: "string" } },
      any: { type: "string" },
    },
    required: ["title"],
  });
  assert.deepEqual(liteInputSchema("nope"), { type: "object", properties: {} });
});

test("only text parts of a result become text", () => {
  assert.equal(
    resultText([{ type: "text", text: "a" }, { type: "image", data: "…" }, 3]),
    "a\n[image content]",
  );
  assert.equal(cleanDescription("x".repeat(2000)).length, 1000);
});
