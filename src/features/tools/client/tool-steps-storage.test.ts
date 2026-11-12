import assert from "node:assert/strict";
import test from "node:test";
import { parseBackup } from "../../backup/parse-backup.ts";
import { sanitizeBotProfile } from "../../bots/bot-storage.ts";
import { sanitizeStoredMessage } from "../../chat/stored-message.ts";
import { sanitizeToolSteps } from "./tool-steps.ts";

const step = { name: "memory_add_note", status: "ok", summary: "saved" };

test("tool steps keep known fields, valid names and statuses, up to eight", () => {
  assert.deepEqual(sanitizeToolSteps([{ ...step, args: { secret: 1 } }]), [
    step,
  ]);
  assert.equal(sanitizeToolSteps("nope"), undefined);
  assert.equal(sanitizeToolSteps([]), undefined);
  assert.equal(
    sanitizeToolSteps([
      { ...step, name: "Bad Name" },
      { ...step, name: "x".repeat(65) },
      { ...step, status: "running" },
      null,
      [step],
    ]),
    undefined,
  );
  assert.equal(sanitizeToolSteps(Array(12).fill(step))?.length, 8);
  assert.equal(
    sanitizeToolSteps([{ ...step, summary: "z".repeat(400) }])?.[0].summary
      .length,
    300,
  );
  assert.equal(sanitizeToolSteps([{ ...step, summary: 3 }])?.[0].summary, "");
});

test("a stored assistant message keeps its steps; a user message never has any", () => {
  const assistant = {
    id: 2,
    role: "assistant",
    language: "en",
    text: "done",
    toolSteps: [step, { ...step, status: "bogus" }],
  };
  assert.deepEqual(sanitizeStoredMessage(assistant)?.toolSteps, [step]);
  const user = { ...assistant, role: "user" };
  assert.equal(sanitizeStoredMessage(user)?.toolSteps, undefined);
});

test("a backup restores the steps of an assistant message", () => {
  const bot = {
    id: "a",
    name: "a",
    description: "d",
    avatarShape: "hexagon",
    avatarColor: "cyan",
    skills: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    toolsEnabled: true,
  };
  const message = {
    id: 2,
    role: "assistant",
    language: "en",
    text: "done",
    toolSteps: [step],
  };
  const parsed = parseBackup(
    JSON.stringify({
      app: "openbot",
      version: 1,
      exportedAt: "2026-01-01T00:00:00.000Z",
      data: { bots: [bot], messages: { a: [message] } },
    }),
  );
  assert.ok(parsed.ok, JSON.stringify(parsed));
  assert.deepEqual(parsed.backup.data.messages.a[0].toolSteps, [step]);
  assert.equal(parsed.backup.data.bots[0].toolsEnabled, true);
});

test("the bot sanitizer keeps the tool opt-in only when it is true", () => {
  const raw = {
    id: "a",
    name: "a",
    description: "d",
    avatarShape: "hexagon",
    avatarColor: "cyan",
    skills: [],
  };
  assert.equal(
    sanitizeBotProfile({ ...raw, toolsEnabled: true })?.toolsEnabled,
    true,
  );
  for (const value of [false, "true", 1, undefined]) {
    const bot = sanitizeBotProfile({ ...raw, toolsEnabled: value });
    assert.ok(bot);
    assert.equal("toolsEnabled" in bot, false);
  }
});
