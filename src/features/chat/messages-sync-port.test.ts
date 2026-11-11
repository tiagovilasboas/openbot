import assert from "node:assert/strict";
import test, { afterEach, beforeEach } from "node:test";
import type { MessageData } from "./ChatMessageItem.tsx";
import { connectMessagesSync } from "./messages-sync-port.ts";
import { forgetBotMessages, saveBotMessages } from "./use-bot-messages.ts";

const win = globalThis as { window?: unknown };

function fakeStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
  };
}

const msg = (id: number): MessageData => ({
  id,
  language: "en",
  role: "user",
  text: `m${id}`,
});

const calls: string[] = [];
beforeEach(() => {
  calls.length = 0;
  win.window = { localStorage: fakeStorage() };
  connectMessagesSync({
    saved: (botId, messages) => calls.push(`saved:${botId}:${messages.length}`),
    forgotten: (botId) => calls.push(`forgotten:${botId}`),
  });
});
afterEach(() => {
  connectMessagesSync(null);
  delete win.window;
});

test("every save is handed to the sync", () => {
  saveBotMessages("port-a", [msg(1)]);
  saveBotMessages("port-a", [msg(1), msg(2)]);
  assert.deepEqual(calls, ["saved:port-a:1", "saved:port-a:2"]);
});

test("clearing a thread is a save of an empty list", () => {
  saveBotMessages("port-b", []);
  assert.deepEqual(calls, ["saved:port-b:0"]);
});

test("a mirror write with sync off does not call the sync", () => {
  saveBotMessages("port-c", [msg(1)], { sync: false });
  assert.deepEqual(calls, []);
});

test("forgetting a thread tells the sync", () => {
  forgetBotMessages("port-d");
  assert.deepEqual(calls, ["forgotten:port-d"]);
});

test("without a connected sync nothing is called", () => {
  connectMessagesSync(null);
  assert.doesNotThrow(() => saveBotMessages("port-e", [msg(1)]));
  assert.deepEqual(calls, []);
});
