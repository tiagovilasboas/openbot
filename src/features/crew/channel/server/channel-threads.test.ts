import assert from "node:assert/strict";
import { test } from "node:test";
import { CREW_PRESETS } from "../../../bots/crew-presets.ts";
import {
  handleListMessages,
  handlePostMessage,
} from "./channel-messages-handler.ts";
import { appendMessage } from "./channel-messages-repository.ts";
import { fakeModel, withChannelDb, type ModelCall } from "./channel-test-db.ts";
import { saveChannel } from "./channels-repository.ts";

const base = "http://localhost/api/crew/channels/messages";
const group = {
  id: "c1",
  name: "Launch",
  memberBotIds: ["engineering", "publishing", "security"],
  leaderBotId: "engineering",
  instructions: "",
};

const post = (body: unknown) =>
  new Request(base, { method: "POST", body: JSON.stringify(body) });

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

async function listed(db: Parameters<typeof handleListMessages>[1], q = "") {
  const response = handleListMessages(
    new Request(`${base}?channelId=c1${q}`),
    db,
  );
  return (await response.json()) as {
    messages: {
      text: string;
      parentSeq?: number;
      author: { botId?: string };
    }[];
    threadCounts?: Record<number, number>;
  };
}

test("a thread post defaults to the parent's author and stays out of the timeline", () =>
  withChannelDb(async (db) => {
    saveChannel(db, group, 1);
    const parent = appendMessage(
      db,
      "c1",
      { kind: "member", botId: "security", ok: true },
      "Found two risks.",
      1,
    );
    const run = deps((call) => `${call.speaker?.name} in thread`);
    const response = await handlePostMessage(
      post({ channelId: "c1", text: "which ones?", parentSeq: parent.seq }),
      db,
      run.deps,
    );
    assert.equal(response.status, 202);
    await run.settle();
    // No picker call: the parent's author answered.
    assert.deepEqual(
      run.model.calls.map((c) => c.speaker?.id),
      ["security"],
    );
    // The bot read the parent message, then the person's thread post.
    const seen = run.model.calls[0]!.messages.map((m) => m.text).join("\n");
    assert.match(seen, /Found two risks\./);
    assert.match(seen, /which ones\?/);

    const main = await listed(db);
    assert.deepEqual(
      main.messages.map((m) => m.text),
      ["Found two risks."],
    );
    assert.deepEqual(main.threadCounts, { 1: 2 });
    const thread = await listed(db, `&parentSeq=${parent.seq}`);
    assert.deepEqual(
      thread.messages.map((m) => [m.author.botId ?? "human", m.parentSeq]),
      [
        ["human", 1],
        ["security", 1],
      ],
    );
  }));

test("@name in a thread still picks the speaker", () =>
  withChannelDb(async (db) => {
    saveChannel(db, group, 1);
    const parent = appendMessage(
      db,
      "c1",
      { kind: "member", botId: "security", ok: true },
      "Found two risks.",
      1,
    );
    const run = deps(() => "noted");
    await handlePostMessage(
      post({
        channelId: "c1",
        text: "@Publishing can you word it?",
        parentSeq: parent.seq,
      }),
      db,
      run.deps,
    );
    await run.settle();
    assert.deepEqual(
      run.model.calls.map((c) => c.speaker?.id),
      ["publishing"],
    );
  }));

test("a thread needs an existing main-timeline parent", () =>
  withChannelDb(async (db) => {
    saveChannel(db, group, 1);
    const run = deps(() => "x");
    const missing = await handlePostMessage(
      post({ channelId: "c1", text: "hi", parentSeq: 9 }),
      db,
      run.deps,
    );
    assert.equal(missing.status, 400);
    assert.deepEqual(await missing.json(), { error: "invalid_parent" });
    assert.equal(run.model.calls.length, 0);
  }));
