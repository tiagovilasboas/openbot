import type { BotProfile } from "@/features/bots/bot-types.ts";
import { chiefPlainReply } from "@/features/crew/chief-plain-reply.ts";
import { crewCopy } from "@/features/crew/crew-copy.ts";
import { runCrewTurn } from "@/features/crew/run-crew-turn.ts";
import type { ChatReplyOutcome } from "./chat-reply-outcome.ts";
import { crewReplyFields } from "./crew-reply-fields.ts";
import { incompleteKindOf } from "./incomplete-reply.ts";
import type { createLiveBoard } from "./live-board.ts";
import type {
  HistoryMessage,
  ModelReplyOutcome,
} from "./request-model-reply.ts";
import type { requestModelStream } from "./request-model-stream.ts";
import type { ChatLanguage } from "./respond-to-message.ts";

type ModelAnswer =
  ModelReplyOutcome | Awaited<ReturnType<typeof requestModelStream>>;

interface CrewTurnReplyInput {
  /** The model's finished reply to the user's message. */
  reply: { text: string; failover?: ChatReplyOutcome["failover"] };
  executingBot: BotProfile;
  delegatedBot: BotProfile | undefined;
  isChief: boolean;
  /** The Chief's own prompt, without the roster and the synthesis rule. */
  botPrompt: string;
  bots: BotProfile[];
  history: HistoryMessage[];
  text: string;
  language: ChatLanguage;
  board: ReturnType<typeof createLiveBoard> | null;
  onBotWorking?: (bot: BotProfile) => void;
  memoryFor: (botId: string) => string[];
  /** One model call that also counts the usage. */
  askAndCount: (
    system: string,
    messages: HistoryMessage[],
    modelId: string | undefined,
    memory: string[] | undefined,
    speaker: BotProfile | undefined,
  ) => Promise<ModelAnswer>;
}

/**
 * The reply to a finished model answer: the Chief's crew runs and its
 * synthesis answers; any other bot's text is the reply as it came.
 */
export async function crewTurnReply({
  reply: outcome,
  executingBot,
  delegatedBot,
  isChief,
  botPrompt,
  bots,
  history,
  text,
  language,
  board,
  onBotWorking,
  memoryFor,
  askAndCount,
}: CrewTurnReplyInput): Promise<ChatReplyOutcome> {
  const crewTurn = isChief
    ? await runCrewTurn({
        chief: executingBot,
        chiefPrompt: botPrompt,
        chiefReply: outcome.text,
        bots,
        history,
        userText: text,
        language,
        onBotWorking,
        memoryFor,
        onKickoff: (kickoff) => board?.settle(kickoff),
        askModel: async ({
          systemPrompt,
          messages,
          modelId,
          memory,
          speaker,
        }) => {
          const reply = await askAndCount(
            systemPrompt,
            messages,
            modelId,
            memory,
            speaker,
          );
          if (reply.kind === "partial") {
            // A broken stream keeps what arrived; a cancel keeps nothing here
            // (the user's cancel stores the live entries instead).
            const kind = incompleteKindOf(reply.failure);
            if (kind !== "cancelled") {
              board?.keep();
              return { ok: false, partial: { text: reply.text, kind } };
            }
          }
          if (reply.kind !== "text") {
            board?.drop();
            return { ok: false };
          }
          board?.keep();
          return { ok: true, text: reply.text };
        },
      })
    : null;
  return {
    text: crewTurn
      ? (crewTurn.synthesis ?? crewCopy[language].synthesisFailed)
      : isChief
        ? chiefPlainReply(outcome.text, bots, executingBot.id, language)
        : outcome.text,
    ...crewReplyFields(crewTurn),
    delegatedBot,
    ...(crewTurn?.synthesisIncomplete
      ? {
          incomplete: crewTurn.synthesisIncomplete,
          modelCall: "failed" as const,
        }
      : { modelCall: "ok" as const }),
    ...(outcome.failover ? { failover: outcome.failover } : {}),
  };
}
