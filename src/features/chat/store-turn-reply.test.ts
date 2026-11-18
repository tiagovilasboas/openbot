import assert from "node:assert/strict";
import test from "node:test";
import "../../shared/testing/register-alias-resolver.mjs";
import type { MessageData } from "./ChatMessageItem.tsx";

const { storeTurnReply } = await import("./store-turn-reply.ts");

const msg = (id: number, role: "user" | "assistant"): MessageData => ({
  id,
  role,
  language: "en",
  text: `${role} ${id}`,
});

function counter(start: number) {
  let n = start;
  return () => n++;
}

function store(overrides: Partial<Parameters<typeof storeTurnReply>[0]> = {}) {
  const writes: MessageData[][] = [];
  const stored = storeTurnReply({
    reply: { text: "the answer" },
    language: "en",
    modelBadge: "vendor/m",
    getNextId: counter(10),
    thread: [msg(1, "user")],
    userMessageId: 1,
    persistMessages: (m) => writes.push(m),
    ...overrides,
  });
  return { writes, stored };
}

test("a plain reply is stored right after its message and returned", () => {
  const { writes, stored } = store();
  assert.equal(stored.length, 1);
  assert.equal(stored[0]?.id, 10);
  assert.equal(stored[0]?.role, "assistant");
  assert.equal(stored[0]?.text, "the answer");
  assert.equal(stored[0]?.modelBadge, "vendor/m");
  assert.deepEqual(writes, [[msg(1, "user"), stored[0]]]);
});

test("a message queued meanwhile stays after the reply", () => {
  const thread = [msg(1, "user"), msg(2, "user")];
  const { writes, stored } = store({ thread });
  assert.deepEqual(
    writes[0]?.map((m) => m.id),
    [1, stored[0]?.id, 2],
  );
});

test("when the user message is gone the reply is appended", () => {
  const { writes, stored } = store({ userMessageId: 99 });
  assert.deepEqual(
    writes[0]?.map((m) => m.id),
    [1, stored[0]?.id],
  );
});

test("a failed reply keeps its failure reason on the stored message", () => {
  const { stored } = store({ reply: { text: "bad key", failure: "auth" } });
  assert.equal(stored[0]?.failure, "auth");
});

test("a cancelled partial reply keeps its incomplete mark", () => {
  const { stored } = store({
    reply: { text: "half", incomplete: "cancelled" },
  });
  assert.equal(stored[0]?.incomplete, "cancelled");
});

test("a crew reply is stored as kickoff, specialists, then the final answer, in id order", () => {
  const specialist = { id: "engineering", name: "Eng" } as never;
  const { writes, stored } = store({
    reply: {
      text: "final",
      crew: {
        kickoff: "kick",
        specialists: [{ bot: specialist, text: "spec" }],
      },
    },
  });
  assert.deepEqual(
    stored.map((m) => m.text),
    ["kick", "spec", "final"],
  );
  assert.deepEqual(
    stored.map((m) => m.id),
    [10, 11, 12],
  );
  assert.equal(writes[0]?.length, 4);
});

test("a storage failure reaches the caller", () => {
  assert.throws(
    () =>
      store({
        persistMessages: () => {
          throw new Error("quota");
        },
      }),
    /quota/,
  );
});
