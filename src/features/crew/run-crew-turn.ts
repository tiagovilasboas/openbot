import { buildBotSystemPrompt } from "../bots/bot-system-prompt.ts";
import type { BotProfile } from "../bots/bot-types.ts";
import type { ChatLanguage } from "../chat/respond-to-message.ts";
import {
  externalDataRule,
  wrapExternalText,
} from "../untrusted-text/wrap-external-text.ts";
import { crewCopy } from "./crew-copy.ts";
import { parseDelegations, type Delegation } from "./parse-delegations.ts";

/** Most specialists the Chief may call in one user turn. */
export const MAX_DELEGATIONS_PER_TURN = 3;
/** Keeps three answers inside one chat message for the synthesis call. */
const MAX_ANSWER_IN_REPORT = 1200;

export type CrewMessage = { role: "assistant" | "user"; text: string };
export type CrewModelReply = { ok: true; text: string } | { ok: false };

/** The model call, injected so the turn runs the same with fakes in tests. */
export type AskCrewModel = (request: {
  systemPrompt: string;
  messages: CrewMessage[];
  /** The model of the bot answering; empty means the global model. */
  modelId?: string;
}) => Promise<CrewModelReply>;

export interface SpecialistAnswer {
  bot: BotProfile;
  task: string;
  ok: boolean;
  text: string;
}

export interface CrewTurn {
  /** What the Chief shows before the specialists answer. */
  kickoff: string;
  specialists: SpecialistAnswer[];
  /** The Chief's final reply; null when no synthesis could be written. */
  synthesis: string | null;
}

interface CrewTurnInput {
  chief: BotProfile;
  /** The Chief's own prompt, without the roster or delegation rules. */
  chiefPrompt: string;
  chiefReply: string;
  bots: BotProfile[];
  history: CrewMessage[];
  userText: string;
  language: ChatLanguage;
  askModel: AskCrewModel;
  /** Called with whichever bot is working now, for the thinking indicator. */
  onBotWorking?: (bot: BotProfile) => void;
}

async function askSpecialist(
  { bot, task }: Delegation,
  { userText, language, askModel }: CrewTurnInput,
): Promise<SpecialistAnswer> {
  const copy = crewCopy[language];
  const systemPrompt = `${buildBotSystemPrompt(bot, language)}\n\n${copy.antiLoopRule}`;
  const request = `${copy.userAsked}:\n${userText}\n\n${copy.yourTask}:\n${task}`;
  try {
    const reply = await askModel({
      systemPrompt,
      messages: [{ role: "user", text: request }],
      modelId: bot.modelId,
    });
    if (reply.ok) return { bot, task, ok: true, text: reply.text };
  } catch {
    // A failing specialist must not break the Chief's turn.
  }
  return { bot, task, ok: false, text: copy.specialistFailed(bot.name) };
}

async function synthesize(
  input: CrewTurnInput,
  kickoff: string,
  answers: SpecialistAnswer[],
): Promise<string | null> {
  const copy = crewCopy[input.language];
  const report = answers
    .map(
      (a) =>
        `### ${a.bot.name}\n${wrapExternalText(a.text.slice(0, MAX_ANSWER_IN_REPORT))}`,
    )
    .join("\n\n");
  try {
    const reply = await input.askModel({
      systemPrompt: `${input.chiefPrompt}\n\n${copy.synthesisRule}`,
      messages: [
        ...input.history,
        { role: "assistant", text: kickoff },
        {
          role: "user",
          text: `${copy.synthesisRequest}\n${externalDataRule(input.language)}\n\n${report}`,
        },
      ],
      modelId: input.chief.modelId,
    });
    return reply.ok ? reply.text : null;
  } catch {
    return null;
  }
}

/**
 * Runs the specialists the Chief delegated to, one hop only: their replies
 * are never read for further delegation. Returns null when the Chief did
 * not delegate, so the caller keeps the plain reply.
 */
export async function runCrewTurn(
  input: CrewTurnInput,
): Promise<CrewTurn | null> {
  const parsed = parseDelegations(input.chiefReply, input.bots, input.chief.id);
  const delegations = parsed.delegations.slice(0, MAX_DELEGATIONS_PER_TURN);
  if (delegations.length === 0) return null;

  const copy = crewCopy[input.language];
  const delegating = copy.delegatingTo(delegations.map((d) => d.bot.name));
  const kickoff = parsed.visibleText
    ? `${parsed.visibleText}\n\n${delegating}`
    : delegating;

  // One at a time: free model tiers rate-limit parallel bursts.
  const specialists: SpecialistAnswer[] = [];
  for (const delegation of delegations) {
    input.onBotWorking?.(delegation.bot);
    specialists.push(await askSpecialist(delegation, input));
  }

  const answered = specialists.filter((s) => s.ok);
  if (answered.length === 0) return { kickoff, specialists, synthesis: null };
  input.onBotWorking?.(input.chief);
  const synthesis = await synthesize(input, kickoff, answered);
  return { kickoff, specialists, synthesis };
}
