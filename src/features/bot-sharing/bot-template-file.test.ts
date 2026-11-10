import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { BotProfile } from "../bots/bot-types.ts";
import { buildBackup } from "../backup/build-backup.ts";
import {
  TEMPLATE_FILE_MAX_BYTES,
  TEMPLATE_MAX_SKILLS,
} from "./bot-template-file-types.ts";
import {
  botTemplateFileName,
  buildBotTemplateFile,
} from "./build-bot-template-file.ts";
import { parseBotTemplateFile } from "./parse-bot-template-file.ts";

const bot: BotProfile = {
  id: "bot_123_abc",
  name: "Reviewer",
  title: "Code review",
  description: "You review code.",
  workspaceContext: "House rules",
  avatarShape: "hexagon",
  avatarColor: "violet",
  skills: [
    {
      id: "skill_1",
      name: "Review",
      command: "/review",
      description: "When a diff shows up.",
      instructions: "Check the diff.",
      isBuiltin: false,
      source: "created",
      createdAt: "2026-01-01T00:00:00.000Z",
    },
  ],
  createdAt: "2026-01-02T00:00:00.000Z",
  updatedAt: "2026-01-03T00:00:00.000Z",
};

function file(overrides: Record<string, unknown> = {}, botPatch = {}) {
  const base = buildBotTemplateFile(bot);
  return JSON.stringify({
    ...base,
    bot: { ...base.bot, ...botPatch },
    ...overrides,
  });
}

describe("buildBotTemplateFile", () => {
  it("carries only the allowed fields, never ids, dates or chats", () => {
    const built = buildBotTemplateFile(bot, new Date("2026-02-02T00:00:00Z"));
    const json = JSON.stringify(built);
    assert.equal(built.exportedAt, "2026-02-02T00:00:00.000Z");
    assert.deepEqual(Object.keys(built.bot).sort(), [
      "avatarColor",
      "avatarShape",
      "description",
      "name",
      "skills",
      "title",
      "workspaceContext",
    ]);
    assert.deepEqual(Object.keys(built.bot.skills[0]!).sort(), [
      "command",
      "description",
      "instructions",
      "name",
    ]);
    for (const leaked of ["bot_123_abc", "skill_1", "createdAt", "updatedAt"]) {
      assert.ok(!json.includes(leaked), `${leaked} leaked`);
    }
  });

  it("leaves optional fields out when the bot has none", () => {
    const built = buildBotTemplateFile({
      ...bot,
      title: undefined,
      workspaceContext: undefined,
    });
    assert.ok(!("title" in built.bot));
    assert.ok(!("workspaceContext" in built.bot));
  });
});

describe("parseBotTemplateFile", () => {
  it("round-trips a bot into a draft with no identity", () => {
    const result = parseBotTemplateFile(file());
    assert.ok(result.ok);
    const { draft } = result;
    assert.equal(draft.name, "Reviewer");
    assert.equal(draft.title, "Code review");
    assert.equal(draft.avatarShape, "hexagon");
    assert.equal(draft.avatarColor, "violet");
    assert.ok(!("id" in draft));
    assert.equal(draft.skills.length, 1);
  });

  it("marks every skill as imported with a fresh id", () => {
    const result = parseBotTemplateFile(file());
    assert.ok(result.ok);
    const skill = result.draft.skills[0]!;
    assert.equal(skill.source, "imported");
    assert.equal(skill.isBuiltin, false);
    assert.notEqual(skill.id, "skill_1");
    assert.equal(skill.command, "/review");
  });

  it("refuses a backup file as not a template", () => {
    const storage = new Map<string, string>();
    const backup = buildBackup(
      {
        getItem: (key) => storage.get(key) ?? null,
        setItem: (key, value) => void storage.set(key, value),
        removeItem: (key) => void storage.delete(key),
      },
      "pt",
    );
    const result = parseBotTemplateFile(JSON.stringify(backup));
    assert.deepEqual(result, { ok: false, error: "not_a_template" });
  });

  it("refuses other apps, bad JSON and non-strings", () => {
    assert.deepEqual(parseBotTemplateFile(file({ app: "other" })), {
      ok: false,
      error: "invalid_file",
    });
    assert.deepEqual(parseBotTemplateFile("{nope"), {
      ok: false,
      error: "invalid_file",
    });
    assert.deepEqual(parseBotTemplateFile(42), {
      ok: false,
      error: "invalid_file",
    });
  });

  it("refuses an unknown version", () => {
    assert.deepEqual(parseBotTemplateFile(file({ version: 2 })), {
      ok: false,
      error: "unsupported_version",
    });
  });

  it("refuses a file over the size limit", () => {
    const big = "x".repeat(TEMPLATE_FILE_MAX_BYTES + 1);
    assert.deepEqual(parseBotTemplateFile(big), {
      ok: false,
      error: "too_large",
    });
  });

  it("refuses a bot without a name or a description", () => {
    assert.equal(parseBotTemplateFile(file({}, { name: "  " })).ok, false);
    assert.equal(parseBotTemplateFile(file({}, { description: "" })).ok, false);
    assert.equal(parseBotTemplateFile(file({ bot: null })).ok, false);
  });

  it("falls back on an unknown shape or color", () => {
    const result = parseBotTemplateFile(
      file({}, { avatarShape: "dragon", avatarColor: "plaid" }),
    );
    assert.ok(result.ok);
    assert.equal(result.draft.avatarColor, "cyan");
    assert.ok(result.draft.avatarShape.length > 0);
  });

  it("clamps the name and drops skills that have no name", () => {
    const result = parseBotTemplateFile(
      file(
        {},
        {
          name: "N".repeat(200),
          skills: [{ name: "" }, "text", null, { name: "Keep" }],
        },
      ),
    );
    assert.ok(result.ok);
    assert.ok(result.draft.name.length <= 40);
    assert.deepEqual(
      result.draft.skills.map((s) => s.name),
      ["Keep"],
    );
  });

  it("refuses too many skills", () => {
    const skills = Array.from({ length: TEMPLATE_MAX_SKILLS + 1 }, (_, i) => ({
      name: `S${i}`,
    }));
    assert.equal(parseBotTemplateFile(file({}, { skills })).ok, false);
  });

  it("ignores prototype keys and extra fields", () => {
    const hostile =
      '{"app":"openbot","kind":"bot-template","version":1,"__proto__":{"x":1},' +
      '"bot":{"name":"A","description":"d","id":"main","skills":[],"__proto__":{"y":1}}}';
    const result = parseBotTemplateFile(hostile);
    assert.ok(result.ok);
    assert.ok(!("id" in result.draft));
    assert.equal(({} as Record<string, unknown>).x, undefined);
    assert.equal(({} as Record<string, unknown>).y, undefined);
  });
});

describe("botTemplateFileName", () => {
  it("makes a safe slug", () => {
    assert.equal(
      botTemplateFileName("Revisão de Código!"),
      "openbot-bot-revisao-de-codigo.json",
    );
    assert.equal(botTemplateFileName("///"), "openbot-bot-template.json");
  });
});
