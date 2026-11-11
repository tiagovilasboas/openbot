import assert from "node:assert/strict";
import test from "node:test";
import type { MessageData } from "../../chat/ChatMessageItem.tsx";
import type {
  ConversationsApi,
  SyncFailure,
  ThreadResult,
  WriteResult,
} from "./conversations-sync-types.ts";
import {
  syncConversationsOnLoad,
  type LoadDeps,
} from "./sync-conversations-on-load.ts";

const msg = (id: number): MessageData => ({
  id,
  language: "en",
  role: "user",
  text: `m${id}`,
});

const EMPTY: MessageData[] = []; // stable, like the real cache's empty thread

function harness(options: {
  server: Record<string, ThreadResult>;
  local: Record<string, MessageData[]>;
  unsynced?: string[];
  putResult?: WriteResult;
}) {
  const puts: { botId: string; messages: MessageData[] }[] = [];
  const mirrored: { botId: string; messages: MessageData[] }[] = [];
  const failures: SyncFailure[] = [];
  const local = { ...options.local };
  const unsynced = new Set(options.unsynced ?? []);
  const api: ConversationsApi = {
    get: async (botId) => options.server[botId]!,
    put: async (botId, messages) => {
      puts.push({ botId, messages });
      return options.putResult ?? { ok: true };
    },
    remove: async () => ({ ok: true }),
  };
  const deps: LoadDeps = {
    api,
    botIds: () => Object.keys(options.server),
    readLocal: (botId) => local[botId] ?? EMPTY,
    isUnsynced: (botId) => unsynced.has(botId),
    setUnsynced: (botId, value) =>
      void (value ? unsynced.add(botId) : unsynced.delete(botId)),
    mirror: (botId, messages) => {
      mirrored.push({ botId, messages });
      local[botId] = messages;
    },
    reportFailure: (f) => failures.push(f),
  };
  return {
    deps,
    puts,
    mirrored,
    failures,
    local,
    isUnsynced: (botId = "a") => unsynced.has(botId),
  };
}

const found = (...messages: MessageData[]): ThreadResult => ({
  ok: true,
  messages,
});

test("the server's thread is mirrored into the cache without a PUT", async () => {
  const h = harness({ server: { a: found(msg(1), msg(2)) }, local: {} });
  await syncConversationsOnLoad(h.deps);
  assert.deepEqual(h.mirrored, [{ botId: "a", messages: [msg(1), msg(2)] }]);
  assert.equal(h.puts.length, 0);
  assert.equal(h.isUnsynced(), false);
});

test("an empty server takes the local thread once", async () => {
  const h = harness({
    server: { a: found(), b: found() },
    local: { a: [msg(1)] },
  });
  await syncConversationsOnLoad(h.deps);
  assert.deepEqual(h.puts, [{ botId: "a", messages: [msg(1)] }]);
});

test("both empty sends nothing", async () => {
  const h = harness({ server: { a: found() }, local: {} });
  await syncConversationsOnLoad(h.deps);
  assert.equal(h.puts.length + h.mirrored.length, 0);
});

test("an unreachable server keeps local and marks unsynced", async () => {
  const h = harness({
    server: { a: { ok: false, failure: { kind: "network" } } },
    local: { a: [msg(1)] },
  });
  await syncConversationsOnLoad(h.deps);
  assert.deepEqual(h.local.a, [msg(1)]);
  assert.equal(h.mirrored.length, 0);
  assert.equal(h.isUnsynced(), true);
});

test("a refused import is reported and leaves the flag set", async () => {
  const failure: SyncFailure = {
    kind: "http",
    status: 413,
    error: "payload_too_large",
  };
  const h = harness({
    server: { a: found() },
    local: { a: [msg(1)] },
    putResult: { ok: false, failure },
  });
  await syncConversationsOnLoad(h.deps);
  assert.deepEqual(h.failures, [failure]);
  assert.equal(h.isUnsynced(), true);
});

test("a delivered import clears an old unsynced flag", async () => {
  const h = harness({
    server: { a: found() },
    local: { a: [msg(1)] },
    unsynced: ["a"],
  });
  await syncConversationsOnLoad(h.deps);
  assert.equal(h.puts.length, 1);
  assert.equal(h.isUnsynced(), false);
});

test("a thread saved while the request was out is not overwritten", async () => {
  const h = harness({ server: { a: found(msg(1)) }, local: { a: [msg(9)] } });
  const slowApi: ConversationsApi = {
    ...h.deps.api,
    get: async () => {
      h.local.a = [msg(9), msg(10)];
      return found(msg(1));
    },
  };
  await syncConversationsOnLoad({ ...h.deps, api: slowApi });
  assert.equal(h.mirrored.length, 0);
  assert.deepEqual(h.local.a, [msg(9), msg(10)]);
});

test("an undelivered clear is sent as an empty thread, only for that bot", async () => {
  const h = harness({
    server: { a: found(msg(1)), b: found(msg(2)) },
    local: {},
    unsynced: ["a"],
  });
  await syncConversationsOnLoad(h.deps);
  assert.deepEqual(h.puts, [{ botId: "a", messages: [] }]);
  assert.deepEqual(h.mirrored, [{ botId: "b", messages: [msg(2)] }]);
  assert.equal(h.isUnsynced("a"), false);
});
