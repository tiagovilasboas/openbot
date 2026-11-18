import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import type { MessageData } from "../chat/ChatMessageItem.tsx";
import { connectMessagesSync } from "../chat/messages-sync-port.ts";
import {
  forgetBotMessages,
  forgetThreadMessages,
  loadBotMessages,
  saveBotMessages,
  storedMessageBotIds,
} from "../chat/use-bot-messages.ts";
import { DEFAULT_THREAD_ID } from "./thread-model.ts";
import { selectThread } from "./thread-selection.ts";

const win = globalThis as { window?: unknown };

function fakeStorage(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
  return {
    store,
    get length() {
      return store.size;
    },
    key: (i: number) => [...store.keys()][i] ?? null,
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  };
}

const msg = (id: number, text = `m${id}`): MessageData => ({
  id,
  language: "en",
  role: id % 2 ? "user" : "assistant",
  text,
});

afterEach(() => {
  delete win.window;
  connectMessagesSync(null);
});

test("a thread saved before there were several is still the default thread", () => {
  const old = JSON.stringify([msg(1), msg(2)]);
  win.window = { localStorage: fakeStorage({ openbot_msgs_mig: old }) };
  assert.equal(loadBotMessages("mig").length, 2);
  assert.equal(loadBotMessages("mig", DEFAULT_THREAD_ID).length, 2);
});

test("each thread has its own messages; selecting switches what loads", () => {
  const storage = fakeStorage();
  win.window = { localStorage: storage };
  saveBotMessages("iso", [msg(1, "main")]);
  saveBotMessages("iso", [msg(1, "side")], { threadId: "t1" });
  assert.equal(loadBotMessages("iso")[0].text, "main");
  selectThread("iso", "t1");
  assert.equal(loadBotMessages("iso")[0].text, "side");
  assert.ok(storage.store.has("openbot_msgs_iso~t1"));
  selectThread("iso", DEFAULT_THREAD_ID);
  assert.equal(loadBotMessages("iso")[0].text, "main");
});

test("only the default thread is synced to the server", () => {
  win.window = { localStorage: fakeStorage() };
  const saved: string[] = [];
  connectMessagesSync({
    saved: (id) => void saved.push(id),
    forgotten: () => undefined,
  });
  saveBotMessages("syn", [msg(1)], { threadId: "t1" });
  assert.deepEqual(saved, []);
  saveBotMessages("syn", [msg(1)], { threadId: DEFAULT_THREAD_ID });
  assert.deepEqual(saved, ["syn"]);
});

test("forgetting one thread leaves the default and the others", () => {
  win.window = { localStorage: fakeStorage() };
  saveBotMessages("one", [msg(1)], { threadId: DEFAULT_THREAD_ID });
  saveBotMessages("one", [msg(1)], { threadId: "t1" });
  forgetThreadMessages("one", "t1");
  forgetThreadMessages("one", DEFAULT_THREAD_ID);
  assert.equal(loadBotMessages("one", "t1").length, 0);
  assert.equal(loadBotMessages("one", DEFAULT_THREAD_ID).length, 1);
});

test("deleting a bot drops every thread and its list; pruning sees extras", () => {
  const storage = fakeStorage({
    openbot_msgs_gone: "[]",
    "openbot_msgs_gone~t1": "[]",
    openbot_threads_gone: "[]",
    "openbot_msgs_keep~t9": "[]",
    openbot_msgs_other: "[]",
  });
  assert.deepEqual(storedMessageBotIds(storage).sort(), [
    "gone",
    "keep",
    "other",
  ]);
  win.window = { localStorage: storage };
  forgetBotMessages("gone", storage);
  assert.deepEqual([...storage.store.keys()].sort(), [
    "openbot_msgs_keep~t9",
    "openbot_msgs_other",
  ]);
});
