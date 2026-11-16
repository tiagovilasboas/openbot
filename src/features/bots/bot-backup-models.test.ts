import assert from "node:assert/strict";
import test from "node:test";
import { buildBotTemplateFile } from "../bot-sharing/build-bot-template-file.ts";
import { parseBotTemplateFile } from "../bot-sharing/parse-bot-template-file.ts";
import { sanitizeBotProfile } from "./bot-sanitize.ts";

const raw = {
  id: "researcher",
  name: "Researcher",
  description: "Finds things",
  avatarShape: "circle",
  avatarColor: "blue",
  modelId: "main/model",
  backupModelIds: ["b/one", "b/one", "bad id", "b/two", "b/three", "b/four"],
};

test("a stored bot keeps up to three valid, unique backups in order", () => {
  const bot = sanitizeBotProfile(raw);
  assert.deepEqual(bot?.backupModelIds, ["b/one", "b/two", "b/three"]);
});

test("a bot without backups has no backup field", () => {
  const bot = sanitizeBotProfile({ ...raw, backupModelIds: "nope" });
  assert.equal(bot && "backupModelIds" in bot, false);
});

test("backups survive an export and import of the template file", () => {
  const bot = sanitizeBotProfile(raw);
  assert.ok(bot);
  const file = buildBotTemplateFile(bot);
  const parsed = parseBotTemplateFile(JSON.stringify(file));
  assert.ok(parsed.ok);
  assert.deepEqual(parsed.ok && parsed.draft.backupModelIds, [
    "b/one",
    "b/two",
    "b/three",
  ]);
});
