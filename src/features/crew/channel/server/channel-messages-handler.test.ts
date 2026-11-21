import assert from "node:assert/strict";
import { test } from "node:test";
import { CREW_PRESETS } from "../../../bots/crew-presets.ts";
import { SKIP_TOKEN } from "./group-chat.ts";
import {
  handleListMessages,
  handlePostMessage,
  handleStopChannel,
} from "./channel-messages-handler.ts";
import { claimTurn, runningTurn } from "./channel-messages-repository.ts";
import { handleSaveChannel } from "./channels-handler.ts";
import { fakeModel, withChannelDb, type ModelCall } from "./channel-test-db.ts";

const base = "http://localhost/api/crew/channels";
const botIds = () => CREW_PRESETS.map((b) => b.id);
const group = {
  id: "c1",
  name: "Launch",
  memberBotIds: ["engineering", "publishing", "security"],
  leaderBotId: "engineering",
  instructions: "",
};

const put = (body: unknown) =>
  new Request(base, { method: "PUT", body: JSON.stringify(body) });
const post = (body: unknown) =>
  new Request(`${base}/messages`, {
    method: "POST",
    body: JSON.stringify(body),
  });
const list = async (db: Parameters<typeof handleListMessages>[1]) =>
  (await handleListMessages(
    new Request(`${base}/messages?channelId=c1`),
    db,
  ).json()) as {
    messages: { seq: number; text: string; author: Record<string, unknown> }[];
    turn: unknown;
  };

/** Deps that collect the background work so a test can await it. */
function deps(answer: (call: ModelCall) => string | null) {
  const model = fakeModel(answer);
  const work: Promise<void>[] = [];
  return {
    model,
    settle: () => Promise.all(work),
    deps: {
      bots: () => [...CREW_PRESETS],
      language: () => "en" as const,
      askModel: model.askModel,
      schedule: (p: Promise<void>) => void work.push(p),
    },
  };
}

const speakerOf = (call: ModelCall) => call.speaker?.id ?? "picker";

test("a post answers at once and the chosen members reply in the background", () =>
  withChannelDb(async (db) => {
    await handleSaveChannel(put(group), db, botIds);
    const run = deps((call) =>
      call.speaker ? `${call.speaker.name} here` : "Security, Publishing",
    );
    const response = await handlePostMessage(
      post({ channelId: "c1", text: "is the launch safe?" }),
      db,
      run.deps,
    );
    assert.equal(response.status, 202);
    const body = await response.json();
    assert.equal(body.messages.length, 1);
    await run.settle();
    const { messages, turn } = await list(db);
    assert.deepEqual(
      messages.map((m) => [m.author.kind, m.author.botId ?? null, m.text]),
      [
        ["human", null, "is the launch safe?"],
        ["member", "security", "Security here"],
        ["member", "publishing", "Publishing here"],
      ],
    );
    assert.equal(turn, null);
    assert.deepEqual(run.model.calls.map(speakerOf), [
      "picker",
      "security",
      "publishing",
    ]);
  }));

test("each member sees the others' replies, marked as data", () =>
  withChannelDb(async (db) => {
    await handleSaveChannel(put(group), db, botIds);
    const run = deps((call) => (call.speaker ? "ok" : "x"));
    await handlePostMessage(
      post({ channelId: "c1", text: "@Security @Publishing check" }),
      db,
      run.deps,
    );
    await run.settle();
    const second = run.model.calls[1]!;
    assert.equal(second.speaker?.id, "publishing");
    const last = second.messages.at(-1)!;
    assert.equal(last.role, "user");
    assert.match(
      last.text,
      /Security:\n<external-data>\nok\n<\/external-data>/,
    );
    assert.match(second.systemPrompt, /group chat/);
  }));

test("mentions and replies pick the speaker without asking the model", () =>
  withChannelDb(async (db) => {
    await handleSaveChannel(put(group), db, botIds);
    const run = deps(() => "noted");
    await handlePostMessage(
      post({ channelId: "c1", text: "@Engineering ship it" }),
      db,
      run.deps,
    );
    await run.settle();
    assert.deepEqual(run.model.calls.map(speakerOf), ["engineering"]);
    const { messages } = await list(db);
    await handlePostMessage(
      post({ channelId: "c1", text: "why?", replyToSeq: messages[1]!.seq }),
      db,
      run.deps,
    );
    await run.settle();
    assert.deepEqual(run.model.calls.map(speakerOf), [
      "engineering",
      "engineering",
    ]);
    const after = await list(db);
    assert.equal(after.messages[2]!.author.replyToSeq, messages[1]!.seq);
  }));

test("@todos asks every member, and a member with nothing to add stays quiet", () =>
  withChannelDb(async (db) => {
    await handleSaveChannel(put(group), db, botIds);
    const run = deps((call) =>
      call.speaker?.id === "security" ? SKIP_TOKEN : "update",
    );
    await handlePostMessage(
      post({ channelId: "c1", text: "@todos status" }),
      db,
      run.deps,
    );
    await run.settle();
    assert.equal(run.model.calls.length, 3);
    const { messages } = await list(db);
    assert.deepEqual(
      messages.slice(1).map((m) => m.author.botId),
      ["engineering", "publishing"],
    );
  }));

test("stop ends the live turn: nothing more is stored", () =>
  withChannelDb(async (db) => {
    await handleSaveChannel(put(group), db, botIds);
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const model = fakeModel(() => "late");
    const work: Promise<void>[] = [];
    const slow = {
      bots: () => [...CREW_PRESETS],
      language: () => "en" as const,
      askModel: async (call: ModelCall) => {
        await gate;
        return model.askModel(call);
      },
      schedule: (p: Promise<void>) => void work.push(p),
    };
    await handlePostMessage(
      post({ channelId: "c1", text: "@Security look" }),
      db,
      slow,
    );
    assert.equal(runningTurn(db, "c1", Date.now())?.speakingBotId, "security");
    const stop = await handleStopChannel(
      new Request(`${base}/stop`, {
        method: "POST",
        body: JSON.stringify({ channelId: "c1" }),
      }),
      db,
    );
    assert.deepEqual(await stop.json(), { stopped: 1 });
    release();
    await Promise.all(work);
    const { messages, turn } = await list(db);
    assert.equal(messages.length, 1);
    assert.equal(turn, null);
  }));

test("a new post takes priority over the turn still running", () =>
  withChannelDb(async (db) => {
    await handleSaveChannel(put(group), db, botIds);
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const work: Promise<void>[] = [];
    let first = true;
    const d = {
      bots: () => [...CREW_PRESETS],
      language: () => "en" as const,
      askModel: async (call: ModelCall) => {
        if (first) {
          first = false;
          await gate;
          return { ok: true as const, text: "stale answer" };
        }
        return { ok: true as const, text: `${call.speaker?.name} on it` };
      },
      schedule: (p: Promise<void>) => void work.push(p),
    };
    await handlePostMessage(
      post({ channelId: "c1", text: "@Security a" }),
      db,
      d,
    );
    await handlePostMessage(
      post({ channelId: "c1", text: "@Publishing never mind, b" }),
      db,
      d,
    );
    release();
    await Promise.all(work);
    const { messages } = await list(db);
    assert.deepEqual(
      messages.map((m) => m.text),
      ["@Security a", "@Publishing never mind, b", "Publishing on it"],
    );
  }));

test("a busy channel, unknown channels and bad text are refused", () =>
  withChannelDb(async (db) => {
    const run = deps(() => "x");
    const missing = await handlePostMessage(
      post({ channelId: "nope", text: "hi" }),
      db,
      run.deps,
    );
    assert.equal(missing.status, 404);
    await handleSaveChannel(put(group), db, botIds);
    const empty = await handlePostMessage(
      post({ channelId: "c1", text: "  " }),
      db,
      run.deps,
    );
    assert.equal(empty.status, 400);
    const badId = handleListMessages(
      new Request(`${base}/messages?channelId=a%20b`),
      db,
    );
    assert.equal(badId.status, 400);
    // A turn left running by a crash stops counting after a while.
    const now = Date.now();
    assert.notEqual(claimTurn(db, "c1", now), null);
    assert.notEqual(claimTurn(db, "c1", now + 60 * 60 * 1000), null);
  }));
