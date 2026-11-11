import assert from "node:assert/strict";
import test from "node:test";
import type { BotProfile } from "../bots/bot-types.ts";
import { CREW_PRESETS } from "../bots/crew-presets.ts";
import type { ChatLanguage } from "../chat/respond-to-message.ts";
import { LANGUAGES } from "../language/language.ts";
import { crewCopy } from "./crew-copy.ts";
import { buildCrewRoster } from "./crew-roster.ts";
import { runCrewTurn, type AskCrewModel } from "./run-crew-turn.ts";

const bots = [...CREW_PRESETS] as BotProfile[];
const chief = bots[0] as BotProfile;

// What a prompt must say about the answer's language, per UI language.
const MENTIONS: Record<ChatLanguage, RegExp> = {
  pt: /sempre em português/i,
  en: /always write in english/i,
  es: /siempre en español/i,
};

async function promptsOf(language: ChatLanguage) {
  const prompts: Array<{ kind: "specialist" | "synthesis"; prompt: string }> =
    [];
  const askModel: AskCrewModel = async (call) => {
    prompts.push({
      kind: call.systemPrompt.startsWith("CHIEF") ? "synthesis" : "specialist",
      prompt: call.systemPrompt,
    });
    return { ok: true, text: "answer" };
  };
  const specialist = bots.find((b) => b.id !== chief.id) as BotProfile;
  await runCrewTurn({
    chief,
    chiefPrompt: "CHIEF PROMPT",
    chiefReply: `@delegate ${specialist.name}: do it`,
    bots,
    history: [{ role: "user", text: "x" }],
    userText: "x",
    language,
    askModel,
  });
  return prompts;
}

for (const language of LANGUAGES) {
  test(`the Chief's delegation rules state the answer language (${language})`, () => {
    const roster = buildCrewRoster(chief, bots, language);
    assert.match(roster, MENTIONS[language]);
  });

  test(`specialist and synthesis prompts state the answer language (${language})`, async () => {
    const prompts = await promptsOf(language);
    assert.ok(prompts.some((p) => p.kind === "specialist"));
    assert.ok(prompts.some((p) => p.kind === "synthesis"));
    for (const { prompt } of prompts) assert.match(prompt, MENTIONS[language]);
  });
}

test("the synthesis rule still ends the prompt, with the language last", () => {
  assert.ok(crewCopy.pt.synthesisRule.endsWith("outro idioma."));
  assert.ok(crewCopy.en.synthesisRule.endsWith("another language."));
  assert.ok(crewCopy.es.synthesisRule.endsWith("otro idioma."));
});
