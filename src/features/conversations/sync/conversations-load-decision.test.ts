import assert from "node:assert/strict";
import test from "node:test";
import type { MessageData } from "../../chat/ChatMessageItem.tsx";
import { decideThreadLoad } from "./conversations-load-decision.ts";
import type { ThreadResult } from "./conversations-sync-types.ts";

const msg = (id: number, text = `m${id}`): MessageData => ({
  id,
  language: "en",
  role: id % 2 ? "user" : "assistant",
  text,
});

const serverWith = (...messages: MessageData[]): ThreadResult => ({
  ok: true,
  messages,
});
const down: ThreadResult = { ok: false, failure: { kind: "network" } };

test("the server wins when it has messages", () => {
  const decision = decideThreadLoad({
    server: serverWith(msg(1), msg(2)),
    local: [msg(1, "old")],
    unsynced: false,
  });
  assert.deepEqual(decision, {
    action: "use-server",
    messages: [msg(1), msg(2)],
  });
});

test("an identical thread is left alone", () => {
  const decision = decideThreadLoad({
    server: serverWith(msg(1)),
    local: [msg(1)],
    unsynced: false,
  });
  assert.deepEqual(decision, { action: "keep-local" });
});

test("an empty server takes the browser's thread", () => {
  const decision = decideThreadLoad({
    server: serverWith(),
    local: [msg(1)],
    unsynced: false,
  });
  assert.deepEqual(decision, { action: "import", messages: [msg(1)] });
});

test("both empty does nothing", () => {
  const decision = decideThreadLoad({
    server: serverWith(),
    local: [],
    unsynced: false,
  });
  assert.deepEqual(decision, { action: "keep-local" });
});

test("undelivered local messages win over the server", () => {
  const decision = decideThreadLoad({
    server: serverWith(msg(1)),
    local: [msg(1), msg(2)],
    unsynced: true,
  });
  assert.deepEqual(decision, {
    action: "import",
    messages: [msg(1), msg(2)],
  });
});

test("an undelivered clear wins over the server's old thread", () => {
  const decision = decideThreadLoad({
    server: serverWith(msg(1)),
    local: [],
    unsynced: true,
  });
  assert.deepEqual(decision, { action: "import", messages: [] });
});

test("an unreachable server keeps the local thread", () => {
  const decision = decideThreadLoad({
    server: down,
    local: [msg(1)],
    unsynced: false,
  });
  assert.deepEqual(decision, { action: "keep-local" });
});
