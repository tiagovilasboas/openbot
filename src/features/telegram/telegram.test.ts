import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import type { DatabaseSync } from "node:sqlite";
import { openLocalStore } from "../../shared/local-store/local-store.ts";
import { parseTelegramConfig } from "./telegram-config.ts";
import { commandOf, splitForTelegram } from "./telegram-text.ts";
import {
  createTelegramApi,
  type TelegramUpdate,
} from "./server/telegram-api.ts";
import {
  handleUpdate,
  pollOnce,
  type BridgeDeps,
} from "./server/telegram-bridge.ts";
import { readOffset, recentTurns } from "./server/telegram-history.ts";

const TOKEN = `123456:${"a".repeat(35)}`;
const NOW = 1_700_000_000_000;

async function withDb(run: (db: DatabaseSync) => Promise<void>) {
  const dir = mkdtempSync(join(tmpdir(), "openbot-tg-"));
  const db = openLocalStore(dir);
  try {
    await run(db);
  } finally {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
}

function deps(db: DatabaseSync, reply = "Hi!") {
  const sent: [string, string][] = [];
  const asked: unknown[] = [];
  const config = parseTelegramConfig({
    TELEGRAM_BOT_TOKEN: TOKEN,
    TELEGRAM_ALLOWED_CHATS: "42",
  });
  assert.ok(config.enabled);
  const d: BridgeDeps = {
    db,
    config,
    api: {
      getUpdates: async () => [],
      sendMessage: async (chat, text) => {
        sent.push([chat, text]);
        return true;
      },
    },
    ask: async (_bot, turns) => {
      asked.push(turns);
      return { kind: "replied", text: reply };
    },
    defaultBotId: () => "main",
    language: () => "en",
    now: () => NOW,
    busy: new Set(),
  };
  return { d, sent, asked };
}

const msg = (text: string, chat = 42, date = NOW / 1000): TelegramUpdate => ({
  update_id: 1,
  message: { date, text, chat: { id: chat, type: "private" } },
});

test("the bridge stays off without a valid token and an allow list", () => {
  assert.deepEqual(parseTelegramConfig({}), { enabled: false });
  assert.equal(parseTelegramConfig({ TELEGRAM_BOT_TOKEN: "x" }).enabled, false);
  assert.deepEqual(parseTelegramConfig({ TELEGRAM_BOT_TOKEN: TOKEN }), {
    enabled: false,
    problem: "no_allowed_chats",
  });
  assert.equal(
    parseTelegramConfig({
      TELEGRAM_BOT_TOKEN: TOKEN,
      TELEGRAM_ALLOWED_CHATS: "1, abc",
    }).enabled,
    false,
  );
  const on = parseTelegramConfig({
    TELEGRAM_BOT_TOKEN: TOKEN,
    TELEGRAM_ALLOWED_CHATS: "1, -100200",
    TELEGRAM_OPENBOT_BOT_ID: "bot_x",
  });
  assert.ok(
    on.enabled && on.allowedChats.has("-100200") && on.botId === "bot_x",
  );
});

test("long replies split at breaks under the limit", () => {
  const text = `${"a".repeat(60)}\n\n${"b".repeat(60)}`;
  assert.deepEqual(splitForTelegram(text, 100), [
    "a".repeat(60),
    "b".repeat(60),
  ]);
  assert.deepEqual(
    splitForTelegram("x".repeat(250), 100).map((p) => p.length),
    [100, 100, 50],
  );
  assert.deepEqual(splitForTelegram("  "), []);
  assert.equal(commandOf("/new@MyBot"), "new");
  assert.equal(commandOf("/start please"), null);
});

test("an allowed chat gets a reply with its history as context", async () => {
  await withDb(async (db) => {
    const { d, sent, asked } = deps(db);
    await handleUpdate(msg("Hello"), d);
    await handleUpdate(msg("Again"), d);
    assert.deepEqual(sent, [
      ["42", "Hi!"],
      ["42", "Hi!"],
    ]);
    assert.deepEqual(asked[1], [
      { role: "user", text: "Hello" },
      { role: "assistant", text: "Hi!" },
      { role: "user", text: "Again" },
    ]);
    await handleUpdate(msg("/new"), d);
    assert.deepEqual(recentTurns(db, "42"), []);
  });
});

test("other chats only learn their id, and stale or busy messages wait", async () => {
  await withDb(async (db) => {
    const { d, sent, asked } = deps(db);
    await handleUpdate(msg("secret", 7), d);
    await handleUpdate(msg("/start", 7), d);
    assert.equal(sent.length, 1);
    assert.match(sent[0][1], /This chat is 7/);
    await handleUpdate(msg("old", 42, (NOW - 11 * 60_000) / 1000), d);
    d.busy.add("42");
    await handleUpdate(msg("now"), d);
    assert.equal(asked.length, 0);
    assert.match(sent[1][1], /Still answering/);
  });
});

test("polling saves the offset before handling, so nothing replays", async () => {
  await withDb(async (db) => {
    const { d } = deps(db);
    const offsets: number[] = [];
    d.api.getUpdates = async (offset) => {
      offsets.push(offset);
      return offset === 0 ? [{ update_id: 9 }, { update_id: 10 }] : [];
    };
    const seen: number[] = [];
    await pollOnce(d, async (u) => {
      seen.push(readOffset(db));
      return void u;
    });
    await pollOnce(d, async () => undefined);
    assert.deepEqual(offsets, [0, 11]);
    assert.deepEqual(seen, [10, 11]);
  });
});

test("the API never puts the token in an error", async () => {
  const api = createTelegramApi(
    TOKEN,
    (async () =>
      new Response(JSON.stringify({ ok: false }), {
        status: 401,
      })) as typeof fetch,
  );
  await assert.rejects(
    api.getUpdates(0),
    (error: Error) => !error.message.includes(TOKEN),
  );
  assert.equal(await api.sendMessage("1", "x"), false);
});
