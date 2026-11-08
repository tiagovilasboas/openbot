import assert from "node:assert/strict";
import test from "node:test";
import { BOT_TEMPLATES } from "./bot-templates.ts";

test("BOT_TEMPLATES contains valid agent archetypes ported from openbot.run", () => {
  assert.ok(BOT_TEMPLATES.length >= 5);

  const ids = BOT_TEMPLATES.map((t) => t.id);
  assert.ok(ids.includes("architect"));
  assert.ok(ids.includes("code-reviewer"));
  assert.ok(ids.includes("security-specialist"));
  assert.ok(ids.includes("platform-engineer"));
  assert.ok(ids.includes("technical-writer"));
  assert.ok(ids.includes("bug-hunter"));

  for (const template of BOT_TEMPLATES) {
    assert.ok(template.name.trim().length > 0);
    assert.ok(template.title.trim().length > 0);
    assert.ok(template.description.trim().length > 0);
    assert.ok(template.workspaceContext?.trim().length);
    assert.ok(template.avatarShape);
    assert.ok(template.avatarColor);
  }
});
