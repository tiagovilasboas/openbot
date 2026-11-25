import assert from "node:assert/strict";
import test from "node:test";
import type { MessageData } from "../chat/ChatMessageItem.tsx";
import { isMessagesUnsynced } from "../conversations/sync/local-conversations-port.ts";
import { syncConversationsOnLoad } from "../conversations/sync/sync-conversations-on-load.ts";
import type { BackupStorage } from "./backup-types.ts";
import { parseBackup } from "./parse-backup.ts";
import { restoreBackup } from "./restore-backup.ts";

class MemoryStorage implements BackupStorage {
  readonly map = new Map<string, string>();
  getItem(key: string) {
    return this.map.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.map.set(key, value);
  }
  removeItem(key: string) {
    this.map.delete(key);
  }
}

const bot = (id: string) => ({
  id,
  name: id,
  description: "d",
  avatarShape: "hexagon",
  avatarColor: "cyan",
  skills: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
});
const msg = (id: number, text: string): MessageData => ({
  id,
  role: "user",
  language: "en",
  text,
});

function backupOf(messages: Record<string, MessageData[]>, ids: string[]) {
  const parsed = parseBackup(
    JSON.stringify({
      app: "openbot",
      version: 1,
      exportedAt: "2026-01-01T00:00:00.000Z",
      data: { bots: ids.map(bot), messages, memory: {} },
    }),
  );
  assert.ok(parsed.ok, "fixture backup must parse");
  return parsed.backup;
}

/** Runs the real on-load sync against this storage and a fake server. */
async function load(
  storage: MemoryStorage,
  server: Record<string, MessageData[]>,
) {
  const puts: { botId: string; messages: MessageData[] }[] = [];
  // Like the real cache: the same array until the stored thread changes.
  const cache = new Map<string, { raw: string; list: MessageData[] }>();
  const read = (botId: string): MessageData[] => {
    const raw = storage.getItem(`openbot_msgs_${botId}`) ?? "[]";
    const hit = cache.get(botId);
    if (hit?.raw === raw) return hit.list;
    const list: MessageData[] = JSON.parse(raw);
    cache.set(botId, { raw, list });
    return list;
  };
  await syncConversationsOnLoad({
    api: {
      get: async (botId) => ({ ok: true, messages: server[botId] ?? [] }),
      put: async (botId, messages) => {
        puts.push({ botId, messages });
        return { ok: true };
      },
      remove: async () => ({ ok: true }),
    },
    botIds: () => Object.keys(server),
    readLocal: read,
    isUnsynced: (botId) => isMessagesUnsynced(storage, botId),
    setUnsynced: () => {},
    mirror: (botId, messages) =>
      void storage.setItem(`openbot_msgs_${botId}`, JSON.stringify(messages)),
    reportFailure: () => {},
  });
  return { puts, read };
}

test("restore then load keeps the restored chat and sends it", async () => {
  const storage = new MemoryStorage();
  const restored = [msg(1, "restored hello")];
  restoreBackup(backupOf({ b1: restored }, ["b1"]), storage, "replace");
  const { puts, read } = await load(storage, { b1: [msg(9, "stale server")] });
  assert.deepEqual(read("b1"), restored);
  assert.deepEqual(puts, [{ botId: "b1", messages: restored }]);
});

test("merge restore marks only the added bots with a chat", () => {
  const storage = new MemoryStorage();
  storage.map.set("openbot_bots", JSON.stringify([bot("old")]));
  restoreBackup(
    backupOf({ old: [msg(1, "x")], fresh: [msg(2, "y")] }, ["old", "fresh"]),
    storage,
    "merge",
  );
  assert.equal(isMessagesUnsynced(storage, "fresh"), true);
  assert.equal(isMessagesUnsynced(storage, "old"), false);
});

test("a normal load without a restore still takes the server copy", async () => {
  const storage = new MemoryStorage();
  storage.map.set("openbot_msgs_b1", JSON.stringify([msg(1, "local")]));
  const serverChat = [msg(9, "server")];
  const { puts, read } = await load(storage, { b1: serverChat });
  assert.deepEqual(read("b1"), serverChat);
  assert.deepEqual(puts, []);
});
