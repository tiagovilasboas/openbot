import assert from "node:assert/strict";
import test from "node:test";
import { attachmentCopy } from "../attachments/attachment-copy.ts";
import { getLockCopy } from "../auth/auth-copy.ts";
import { securityCopy } from "../auth/security-copy.ts";
import { backupCopy } from "../backup/backup-copy.ts";
import { getBotTemplateFileCopy } from "../bot-sharing/bot-template-file-copy.ts";
import { getBotsCopy } from "../bots/bots-copy.ts";
import { chatCopy } from "../chat/chat-copy.ts";
import { connectionsCopy } from "../connections/connections-copy.ts";
import { crewCopy } from "../crew/crew-copy.ts";
import { crewRoomCopy } from "../crew/crew-room-copy.ts";
import { getMemoryCopy } from "../memory/memory-copy.ts";
import { settingsCopy } from "../model/settings-copy.ts";
import { skillsCopy } from "../skills/skills-copy.ts";
import { suggestionCopy } from "../skills/suggestion-copy.ts";
import { getSummaryCopy } from "../summary/summary-copy.ts";
import { getUsageCopy } from "../usage/usage-copy.ts";
import { LANGUAGES, type Language } from "./language.ts";

/** One entry per leaf: its path, and the {placeholders} its text uses. */
function shapeOf(value: unknown, prefix = ""): string[] {
  if (typeof value === "string") {
    const holes = [...value.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    return [`${prefix} text ${holes.join(",")}`];
  }
  if (typeof value === "function") return [`${prefix} function`];
  return Object.entries(value as Record<string, unknown>).flatMap(([k, v]) =>
    shapeOf(v, prefix ? `${prefix}.${k}` : k),
  );
}

const DICTIONARIES: Record<string, (language: Language) => unknown> = {
  chat: (l) => chatCopy[l],
  security: (l) => securityCopy[l],
  backup: (l) => backupCopy[l],
  connections: (l) => connectionsCopy[l],
  settings: (l) => settingsCopy[l],
  skills: (l) => skillsCopy[l],
  suggestion: (l) => suggestionCopy[l],
  attachments: (l) => attachmentCopy[l],
  crew: (l) => crewCopy[l],
  crewRoom: (l) => crewRoomCopy[l],
  botTemplateFile: (l) => getBotTemplateFileCopy(l),
  bots: (l) => getBotsCopy(l),
  memory: (l) => getMemoryCopy(l),
  lock: (l) => getLockCopy(l),
  usage: (l) => getUsageCopy(l),
  summary: (l) => getSummaryCopy(l),
};

for (const [name, read] of Object.entries(DICTIONARIES)) {
  test(`the ${name} dictionary has the same keys and placeholders in every language`, () => {
    const reference = shapeOf(read("pt"));
    assert.ok(reference.length > 0);
    for (const language of LANGUAGES) {
      assert.deepEqual(shapeOf(read(language)), reference, language);
    }
  });
}

test("the language names in the chat copy are the same in every language", () => {
  for (const language of LANGUAGES) {
    assert.equal(chatCopy[language].languagePortuguese, "Português");
    assert.equal(chatCopy[language].languageEnglish, "English");
    assert.equal(chatCopy[language].languageSpanish, "Español");
  }
});

test("Spanish copy is not left in another language", () => {
  const tells = /\b(você|voce|não|configurações|the|please|settings)\b/i;
  const text = Object.values(chatCopy.es).join("\n");
  assert.doesNotMatch(text, tells);
});
