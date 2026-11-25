import type { DatabaseSync } from "node:sqlite";
import type { BotProfile } from "../../bots/bot-types.ts";
import { listBots } from "../../bots/server/bots-repository.ts";
import { checkLoopGuard, type LoopTurn } from "../../crew/loop-guard/index.ts";
import { saveRoutine } from "../../routines/server/routines-repository.ts";
import { readSettings } from "../../settings/server/settings-repository.ts";
import type {
  ParsedArgs,
  ToolDefinition,
} from "../../tools/tool-definition.ts";
import {
  externalDataRule,
  wrapExternalText,
} from "../../untrusted-text/wrap-external-text.ts";
import {
  BOT_MESSAGE_COPY,
  BOT_MESSAGE_MAX_LENGTH,
} from "../bot-messages-copy.ts";
import {
  countSentInLastHour,
  pairMessagesInLastHour,
  recordMessage,
} from "./bot-messages-repository.ts";

export const MESSAGE_BOT = "message_bot";
export const MAX_MESSAGES_PER_HOUR = 10;
/** The target answers a moment after the handoff, never inside the call. */
export const DELIVERY_DELAY_MS = 30_000;

type Args = { target: string; text: string };

export function parseMessageBotArgs(raw: unknown): ParsedArgs<Args> {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { ok: false };
  }
  const v = raw as Record<string, unknown>;
  if (typeof v.target !== "string" || typeof v.text !== "string") {
    return { ok: false };
  }
  const target = v.target.trim();
  const text = v.text.trim();
  if (!target || target.length > 120) return { ok: false };
  if (!text || text.length > BOT_MESSAGE_MAX_LENGTH) return { ok: false };
  return { ok: true, args: { target, text } };
}

/** By id first, then by name; a name shared by two bots is not a match. */
export function findTargetBot(
  bots: readonly BotProfile[],
  target: string,
): BotProfile | null {
  const byId = bots.find((b) => b.id === target);
  if (byId) return byId;
  const wanted = target.toLowerCase();
  const byName = bots.filter((b) => b.name.toLowerCase() === wanted);
  return byName.length === 1 ? byName[0] : null;
}

function exchange(
  db: DatabaseSync,
  from: string,
  to: string,
  text: string,
  now: number,
): LoopTurn[] {
  const past = pairMessagesInLastHour(db, from, to, now);
  return [
    ...past.map((m): LoopTurn => ({
      kind: "bot",
      botId: m.fromBot,
      text: m.text,
    })),
    { kind: "bot", botId: from, text },
  ];
}

export function createMessageBotTool(
  db: DatabaseSync,
  clock: () => number = Date.now,
  newId: () => string = () =>
    `m_${clock().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
): ToolDefinition<Args> {
  return {
    name: MESSAGE_BOT,
    description:
      "Send a message to another bot of this app, by its id or name. The other bot answers later in its own conversation; you do not get its reply here. Use it to hand work over or ask a colleague, not to chat.",
    parameters: {
      type: "object",
      properties: {
        target: { type: "string", description: "Id or name of the other bot" },
        text: {
          type: "string",
          description: "The message",
          maxLength: BOT_MESSAGE_MAX_LENGTH,
        },
      },
      required: ["target", "text"],
      additionalProperties: false,
    },
    policy: "ask",
    allowAlways: true,
    timeoutMs: 10_000,
    maxResultChars: 300,
    parseArgs: parseMessageBotArgs,
    async run(args, ctx) {
      if (ctx.signal.aborted) return { ok: false, code: "aborted" };
      const bots = listBots(db);
      const sender = bots.find((b) => b.id === ctx.botId);
      const target = findTargetBot(bots, args.target);
      if (!sender) return { ok: false, code: "invalid_bot" };
      if (!target) return { ok: false, code: "bot_not_found" };
      if (target.id === sender.id) {
        return { ok: false, code: "cannot_message_self" };
      }
      const now = clock();
      if (countSentInLastHour(db, sender.id, now) >= MAX_MESSAGES_PER_HOUR) {
        return { ok: false, code: "too_many_messages" };
      }
      const turns = exchange(db, sender.id, target.id, args.text, now);
      if (!checkLoopGuard(turns).allowed) {
        return { ok: false, code: "conversation_loop" };
      }
      const language = readSettings(db).language ?? "pt";
      const copy = BOT_MESSAGE_COPY[language];
      const title = copy.title(sender.name, target.name);
      const prompt = [
        copy.intro(sender.name),
        externalDataRule(language),
        wrapExternalText(args.text),
      ].join("\n\n");
      const saved = saveRoutine(
        db,
        {
          id: newId(),
          botId: target.id,
          title,
          prompt,
          schedule: { kind: "once", at: now + DELIVERY_DELAY_MS },
          enabled: true,
          silentWhenNothingNew: false,
          runInThread: true,
        },
        now,
      );
      if (!saved.ok) return { ok: false, code: saved.error };
      recordMessage(db, {
        fromBot: sender.id,
        toBot: target.id,
        text: args.text,
        sentAt: now,
      });
      return {
        ok: true,
        text: `Message sent to "${target.name}". It will answer in its own conversation.`,
        preview: title,
      };
    },
  };
}
