import assert from "node:assert/strict";
import test from "node:test";
import { parseBackup } from "../backup/parse-backup.ts";
import { formatStepDuration } from "./crew-room-format.ts";
import { sanitizeCrewStep, sanitizeDurationMs } from "./crew-step-record.ts";

test("a valid step is kept and the duration rounded to milliseconds", () => {
  assert.deepEqual(
    sanitizeCrewStep({ task: "check CI", ok: true, durationMs: 1200.4 }),
    { task: "check CI", ok: true, durationMs: 1200 },
  );
});

test("a step without a duration stays valid", () => {
  assert.deepEqual(sanitizeCrewStep({ task: "t", ok: false }), {
    task: "t",
    ok: false,
  });
});

test("unknown, negative or absurd durations are dropped, not the step", () => {
  for (const durationMs of [-1, NaN, Infinity, "5", null, {}, 1e12]) {
    assert.deepEqual(sanitizeCrewStep({ task: "t", ok: true, durationMs }), {
      task: "t",
      ok: true,
    });
  }
  assert.equal(sanitizeDurationMs(0), 0);
});

test("a step with no usable task or status is dropped", () => {
  for (const raw of [
    null,
    [],
    "x",
    { ok: true },
    { task: "t" },
    { task: 1, ok: true },
  ]) {
    assert.equal(sanitizeCrewStep(raw), null);
  }
});

test("an oversized task is cut and unknown fields do not pass", () => {
  const step = sanitizeCrewStep({ task: "x".repeat(9000), ok: true, evil: 1 });
  assert.equal(step?.task.length, 4000);
  assert.equal("evil" in (step ?? {}), false);
});

const bot = {
  id: "a",
  name: "A",
  description: "d",
  avatarShape: "hexagon",
  avatarColor: "cyan",
  skills: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function backupWith(crewStep: unknown, delegatedBot: unknown = bot) {
  return JSON.stringify({
    app: "openbot",
    version: 1,
    exportedAt: "2026-01-01T00:00:00.000Z",
    data: {
      bots: [bot],
      messages: {
        a: [
          {
            id: 1,
            role: "assistant",
            language: "en",
            text: "hi",
            delegatedBot,
            crewStep,
          },
        ],
      },
    },
  });
}

test("a backup keeps a sanitized crew step on a specialist's reply", () => {
  const parsed = parseBackup(
    backupWith({ task: "t", ok: true, durationMs: -5, extra: 1 }),
  );
  assert.ok(parsed.ok);
  assert.deepEqual(parsed.backup.data.messages.a?.[0]?.crewStep, {
    task: "t",
    ok: true,
  });
});

test("a backup from an older version, with no crew step, still imports", () => {
  const parsed = parseBackup(backupWith(undefined));
  assert.ok(parsed.ok);
  assert.equal(parsed.backup.data.messages.a?.[0]?.crewStep, undefined);
});

test("a crew step on a reply with no specialist is dropped", () => {
  const parsed = parseBackup(backupWith({ task: "t", ok: true }, null));
  assert.ok(parsed.ok);
  assert.equal(parsed.backup.data.messages.a?.[0]?.crewStep, undefined);
});

test("durations read naturally in both languages", () => {
  assert.equal(formatStepDuration(850, "en"), "850 ms");
  assert.equal(formatStepDuration(4200, "en"), "4.2 s");
  assert.equal(formatStepDuration(4200, "pt"), "4,2 s");
  assert.equal(formatStepDuration(65_000, "en"), "1 min 5 s");
  assert.equal(formatStepDuration(120_000, "pt"), "2 min");
  assert.equal(formatStepDuration(119_700, "en"), "2 min");
});

test("an incomplete kind is kept on a step that answered, dropped otherwise", () => {
  const kept = sanitizeCrewStep({
    task: "t",
    ok: true,
    incomplete: "too_long",
  });
  assert.equal(kept?.incomplete, "too_long");
  const weird = sanitizeCrewStep({ task: "t", ok: true, incomplete: "weird" });
  assert.equal(weird?.incomplete, undefined);
  const failed = sanitizeCrewStep({
    task: "t",
    ok: false,
    incomplete: "error",
  });
  assert.equal(failed?.incomplete, undefined);
});
