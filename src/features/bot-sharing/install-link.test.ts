import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_BOT } from "../bots/bot-types.ts";
import { buildBotTemplateFile } from "./build-bot-template-file.ts";
import {
  buildInstallLink,
  INSTALL_FRAGMENT_MAX_CHARS,
  readInstallFragment,
} from "./install-link.ts";
import { parseBotTemplateFile } from "./parse-bot-template-file.ts";

test("a link round-trips the template, accents included", () => {
  const bot = { ...DEFAULT_BOT, name: "Ação ✓", title: "Revisão" };
  const json = JSON.stringify(buildBotTemplateFile(bot));
  const link = buildInstallLink("https://bot.example/app?x=1#old", json);
  assert.ok(link.startsWith("https://bot.example/app?x=1#install="));
  const text = readInstallFragment(new URL(link).hash);
  assert.equal(text, json);
  const parsed = parseBotTemplateFile(text);
  assert.ok(parsed.ok && parsed.draft.name === "Ação ✓");
});

test("fragments that are not install links give nothing", () => {
  assert.equal(readInstallFragment(""), null);
  assert.equal(readInstallFragment("#settings"), null);
  assert.equal(readInstallFragment("#install="), null);
  assert.equal(readInstallFragment("#install=not base64!"), null);
  assert.equal(
    readInstallFragment(
      `#install=${"A".repeat(INSTALL_FRAGMENT_MAX_CHARS + 1)}`,
    ),
    null,
  );
});

test("bytes that are not UTF-8 are refused", () => {
  // 0xff 0xfe is not valid UTF-8.
  assert.equal(readInstallFragment("#install=__4"), null);
});
