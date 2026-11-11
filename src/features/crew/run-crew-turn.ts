import { buildBotSystemPrompt } from "../bots/bot-system-prompt.ts";
import type { BotProfile } from "../bots/bot-types.ts";
import type { IncompleteKind } from "../chat/incomplete-reply.ts";
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
/**
 * A failed call may carry `partial`: the text that arrived before the stream
 * broke. A user cancel never carries one; the caller handles it.
 */
export type CrewModelReply =
  | { ok: true; text: string }
  | { ok: false; partial?: { text: string; kind: IncompleteKind } };

/** The model call, injected so the turn runs the same with fakes in tests. */
export type AskCrewModel = (request: {
  systemPrompt: string;
  messages: CrewMessage[];
  /** The model of the bot answering; empty means the global model. */
  modelId?: string;
  /** The specialist answering; absent for the Chief's own synthesis. */
  speaker?: BotProfile;
  /** The answering bot's memory notes, raw; the server delimits them. */
  memory?: string[];
}) => Promise<CrewModelReply>;

export interface SpecialistAnswer {
  bot: BotProfile;
  task: string;
  ok: boolean;
  text: string;
  /** How long the specialist took to answer or fail, in milliseconds. */
  durationMs: number;
  /** Set when `text` is only what arrived before the stream broke (ok stays true). */
  incomplete?: IncompleteKind;
}

export interface CrewTurn {
  /** What the Chief shows before the specialists answer. */
  kickoff: string;
  specialists: SpecialistAnswer[];
  /** The Chief's final reply; null when no synthesis could be written. */
  synthesis: string | null;
  /** Set when the synthesis is only what arrived before its stream broke. */
  synthesisIncomplete?: IncompleteKind;
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
  /** Each bot's own memory notes; a specialist never sees another's. */
  memoryFor?: (botId: string) => string[];
  /** Called with whichever bot is working now, for the thinking indicator. */
  onBotWorking?: (bot: BotProfile) => void;
  /** Called once the Chief's kickoff is known, before the specialists run. */
  onKickoff?: (kickoff: string) => void;
}

async function askSpecialist(
  { bot, task }: Delegation,
  { userText, language, askModel, memoryFor }: CrewTurnInput,
): Promise<SpecialistAnswer> {
  const copy = crewCopy[language];
  const systemPrompt = `${buildBotSystemPrompt(bot, language, copy.antiLoopRule.length + 2)}\n\n${copy.antiLoopRule}`;
  const request = `${copy.userAsked}:\n${userText}\n\n${copy.yourTask}:\n${task}`;
  const startedAt = Date.now();
  const elapsed = () => Math.max(0, Date.now() - startedAt);
  try {
    const reply = await askModel({
      systemPrompt,
      messages: [{ role: "user", text: request }],
      modelId: bot.modelId,
      speaker: bot,
      memory: memoryFor?.(bot.id),
    });
    if (reply.ok) {
      return { bot, task, ok: true, text: reply.text, durationMs: elapsed() };
    }
    if (reply.partial) {
      return {
        bot,
        task,
        ok: true,
        text: reply.partial.text,
        durationMs: elapsed(),
        incomplete: reply.partial.kind,
      };
    }
  } catch {
    // A failing specialist must not break the Chief's turn.
  }
  return {
    bot,
    task,
    ok: false,
    text: copy.specialistFailed(bot.name),
    durationMs: elapsed(),
  };
}

async function synthesize(
  input: CrewTurnInput,
  kickoff: string,
  answers: SpecialistAnswer[],
): Promise<{ text: string; incomplete?: IncompleteKind } | null> {
  const copy = crewCopy[input.language];
  const report = answers
    .map(
      (a) =>
        `### ${a.bot.name}\n${wrapExternalText(a.text.slice(0, MAX_ANSWER_IN_REPORT))}${a.incomplete ? `\n${copy.specialistCut}` : ""}`,
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
      memory: input.memoryFor?.(input.chief.id),
    });
    if (reply.ok) return { text: reply.text };
    return reply.partial
      ? { text: reply.partial.text, incomplete: reply.partial.kind }
      : null;
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
  input.onKickoff?.(kickoff);

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
  return {
    kickoff,
    specialists,
    synthesis: synthesis?.text ?? null,
    ...(synthesis?.incomplete
      ? { synthesisIncomplete: synthesis.incomplete }
      : {}),
  };
}
