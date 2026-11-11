import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import {
  STORED_MESSAGES_MAX,
  STORED_MESSAGES_MAX_RAW,
  STORED_TEXT_MAX,
  sanitizeStoredMessage,
  sanitizeStoredMessages,
} from "./stored-message.ts";
import { loadBotMessages } from "./use-bot-messages.ts";

const ok = { id: 1, language: "en", role: "user", text: "hi" };

test("a valid message passes through unchanged", () => {
  assert.deepEqual(sanitizeStoredMessage(ok), ok);
});

test("an unknown role, a missing text or a bad id drops the message", () => {
  for (const bad of [
    { ...ok, role: "system" },
    { ...ok, role: undefined },
    { ...ok, text: 5 },
    { ...ok, text: undefined },
    { ...ok, id: "1" },
    { ...ok, id: -1 },
    { ...ok, id: 1.5 },
    { ...ok, id: Number.NaN },
    null,
    "text",
    7,
    [],
  ]) {
    assert.equal(sanitizeStoredMessage(bad), null, JSON.stringify(bad));
  }
});

test("unknown fields are dropped", () => {
  const message = sanitizeStoredMessage({
    ...ok,
    __proto__: { polluted: true },
    extra: "x",
    html: "<script>",
  });
  assert.deepEqual(message, ok);
});

test("a very long text is cut to the cap", () => {
  const message = sanitizeStoredMessage({
    ...ok,
    text: "a".repeat(STORED_TEXT_MAX + 50),
  });
  assert.equal(message?.text.length, STORED_TEXT_MAX);
});

test("an unknown language falls back to English", () => {
  assert.equal(
    sanitizeStoredMessage({ ...ok, language: "xx" })?.language,
    "en",
  );
  assert.equal(
    sanitizeStoredMessage({ ...ok, language: "pt" })?.language,
    "pt",
  );
});

test("optional fields of the wrong type are dropped, the message stays", () => {
  const message = sanitizeStoredMessage({
    ...ok,
    modelBadge: 3,
    incomplete: "weird",
    failover: { fromModel: 1 },
    attachments: "x",
    crewStep: { task: 1 },
    github: { repo: "x", items: [] },
    delegatedBot: { id: 1 },
  });
  assert.deepEqual(message, ok);
});

test("valid optional fields are kept and nested lists are cleaned", () => {
  const message = sanitizeStoredMessage({
    ...ok,
    modelBadge: "m",
    incomplete: "cancelled",
    failover: { fromModel: "a", toModel: "b", reason: "r", extra: 1 },
    attachments: [
      { name: "a.txt", size: 3, text: "SECRET" },
      { name: 4, size: 1 },
      "junk",
    ],
    crewStep: { task: "t", ok: true, junk: 1 },
    github: {
      repo: { owner: "o", repo: "r" },
      items: [
        {
          id: 1,
          number: 2,
          title: "t",
          author: "a",
          url: "https://github.com/o/r/issues/2",
          labels: ["x", 5],
          isPullRequest: false,
          commentsCount: 0,
          createdAt: "2026-01-01",
        },
        {
          id: 2,
          number: 3,
          title: "t",
          author: "a",
          url: "javascript:alert(1)",
          labels: [],
          isPullRequest: false,
          commentsCount: 0,
          createdAt: "2026-01-01",
        },
      ],
    },
  });
  assert.equal(message?.modelBadge, "m");
  assert.equal(message?.incomplete, "cancelled");
  assert.deepEqual(message?.failover, {
    fromModel: "a",
    toModel: "b",
    reason: "r",
  });
  assert.deepEqual(message?.attachments, [{ name: "a.txt", size: 3 }]);
  assert.deepEqual(message?.crewStep, { task: "t", ok: true });
  assert.equal(message?.github?.items.length, 1);
  assert.deepEqual(message?.github?.items[0]?.labels, ["x"]);
});

test("a non-array stored value yields no messages", () => {
  assert.deepEqual(sanitizeStoredMessages({ a: 1 }), []);
  assert.deepEqual(sanitizeStoredMessages(null), []);
});

test("invalid entries are dropped and the rest kept in order", () => {
  const list = sanitizeStoredMessages([
    ok,
    { id: 2, role: "bot", text: "x" },
    null,
    { ...ok, id: 3 },
  ]);
  assert.deepEqual(
    list.map((m) => m.id),
    [1, 3],
  );
});

test("only the newest messages are kept past the cap", () => {
  const many = Array.from({ length: STORED_MESSAGES_MAX + 10 }, (_, i) => ({
    ...ok,
    id: i + 1,
  }));
  const list = sanitizeStoredMessages(many);
  assert.equal(list.length, STORED_MESSAGES_MAX);
  assert.equal(list[0]?.id, 11);
  assert.equal(list.at(-1)?.id, STORED_MESSAGES_MAX + 10);
});

// The loader itself, with a stored thread that was tampered with.
const win = globalThis as { window?: unknown };
afterEach(() => {
  delete win.window;
});

function storageWith(key: string, raw: string) {
  return { getItem: (k: string) => (k === key ? raw : null) };
}

test("loading a stored thread drops invalid messages instead of returning them", () => {
  const raw = JSON.stringify([ok, { id: 2, role: "root", text: "x" }, 5]);
  win.window = { localStorage: storageWith("openbot_msgs_val-1", raw) };
  assert.deepEqual(loadBotMessages("val-1"), [ok]);
});

test("loading a stored thread over the raw ceiling returns nothing", () => {
  const raw = JSON.stringify([
    { ...ok, pad: "x".repeat(STORED_MESSAGES_MAX_RAW) },
  ]);
  win.window = { localStorage: storageWith("openbot_msgs_val-2", raw) };
  assert.deepEqual(loadBotMessages("val-2"), []);
});

test("loading caps the length of a stored text", () => {
  const raw = JSON.stringify([
    { ...ok, text: "z".repeat(STORED_TEXT_MAX * 2) },
  ]);
  win.window = { localStorage: storageWith("openbot_msgs_val-3", raw) };
  assert.equal(loadBotMessages("val-3")[0]?.text.length, STORED_TEXT_MAX);
});

test("a too_long incomplete reply survives a reload", () => {
  const message = sanitizeStoredMessage({ ...ok, incomplete: "too_long" });
  assert.equal(message?.incomplete, "too_long");
});
