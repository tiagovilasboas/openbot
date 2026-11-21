// The group chat rules, in the Grok Bot style: who answers a post and what
// each member sees. Pure: no storage, no model, no React.
import type { BotProfile } from "../../../bots/bot-types.ts";
import type { ChatLanguage } from "../../../chat/respond-to-message.ts";
import {
  externalDataRule,
  wrapExternalText,
} from "../../../untrusted-text/wrap-external-text.ts";
import { crewRole } from "../../crew-roster.ts";
import { routeByMentions } from "../../mention-routing.ts";
import { findBot } from "../../parse-delegations.ts";
import type { CrewMessage } from "../../run-crew-turn.ts";
import type { ChannelMessage } from "../channel-message.ts";

export const MIN_GROUP_MEMBERS = 2;
export const MAX_GROUP_MEMBERS = 6;
/** Most members that answer one post on their own choice or by mention. */
export const MAX_GROUP_RESPONDERS = 3;
/** Group messages each member reads back. */
export const GROUP_HISTORY = 30;
/** A member with nothing to add answers this, and nothing is posted. */
export const SKIP_TOKEN = "[[skip]]";

const EVERYONE = /(?:^|[\s(,;])@(?:todos|todas|everyone|all)\b/iu;

export type GroupPick =
  | { kind: "fixed"; botIds: string[] }
  /** Nobody named: the members decide, through one short model call. */
  | { kind: "ask" };

/**
 * Who answers a post, before any model runs: everyone on `@todos`, the
 * named members on `@name`, the author of the message the person replied
 * to; otherwise the group decides.
 */
export function pickResponders(input: {
  text: string;
  members: readonly BotProfile[];
  replyTo?: ChannelMessage | null;
}): GroupPick {
  const { text, members } = input;
  if (EVERYONE.test(text)) {
    return {
      kind: "fixed",
      botIds: members.slice(0, MAX_GROUP_MEMBERS).map((b) => b.id),
    };
  }
  const named = routeByMentions(text, [...members], "").map((r) => r.bot.id);
  if (named.length > 0) {
    return { kind: "fixed", botIds: named.slice(0, MAX_GROUP_RESPONDERS) };
  }
  const author = input.replyTo?.author;
  if (author && author.kind !== "human") {
    if (members.some((bot) => bot.id === author.botId)) {
      return { kind: "fixed", botIds: [author.botId] };
    }
  }
  return { kind: "ask" };
}

const PICKER = {
  pt: {
    rule: "Você organiza um chat em grupo. Leia a última mensagem da pessoa e diga quem do grupo deve responder: o membro cujo papel mais tem a ver com o pedido. Responda só com os nomes, separados por vírgula, no máximo 2. Nada além dos nomes.",
    members: "Membros:",
  },
  en: {
    rule: "You run a group chat. Read the person's last message and say who in the group should answer: the member whose role fits the request best. Answer only with the names, comma separated, at most 2. Nothing but the names.",
    members: "Members:",
  },
  es: {
    rule: "Organizas un chat en grupo. Lee el último mensaje de la persona y di quién del grupo debe responder: el miembro cuyo rol más encaja con el pedido. Responde solo con los nombres, separados por coma, como máximo 2. Nada más que los nombres.",
    members: "Miembros:",
  },
} as const;

function rosterLines(members: readonly BotProfile[]): string {
  return members
    .map((bot) => {
      const title = bot.title ? ` (${bot.title})` : "";
      return `- ${bot.name}${title}: ${crewRole(bot)}`;
    })
    .join("\n");
}

/** The system prompt of the "who answers" call. */
export function pickerPrompt(
  members: readonly BotProfile[],
  language: ChatLanguage,
): string {
  const copy = PICKER[language];
  return `${copy.rule}\n\n${copy.members}\n${rosterLines(members)}`;
}

/** The members the picker named, in its order; at most 2, never unknown. */
export function parsePickerAnswer(
  answer: string,
  members: readonly BotProfile[],
): string[] {
  const ids: string[] = [];
  for (const part of answer.split(/[,\n;]+/)) {
    const name = part.replace(/^[\s\-*•@"'`]+|[\s.*"'`]+$/g, "");
    if (!name) continue;
    const bot = findBot(name, [...members]);
    if (bot && !ids.includes(bot.id)) ids.push(bot.id);
    if (ids.length === 2) break;
  }
  return ids;
}

const RULE = {
  pt: (names: string) =>
    `Você está num chat em grupo com a pessoa e com: ${names}. Responda só pela sua parte, em poucas linhas, sem repetir o que outro membro já disse. Mensagens de outros membros chegam marcadas com o nome deles. Se não tiver nada útil a acrescentar, responda exatamente ${SKIP_TOKEN}.`,
  en: (names: string) =>
    `You are in a group chat with the person and with: ${names}. Answer only for your part, in a few lines, without repeating what another member already said. Other members' messages come marked with their name. If you have nothing useful to add, answer exactly ${SKIP_TOKEN}.`,
  es: (names: string) =>
    `Estás en un chat en grupo con la persona y con: ${names}. Responde solo por tu parte, en pocas líneas, sin repetir lo que otro miembro ya dijo. Los mensajes de otros miembros llegan marcados con su nombre. Si no tienes nada útil que aportar, responde exactamente ${SKIP_TOKEN}.`,
} as const;

/** What goes after a member's own prompt in a group. */
export function groupRule(
  speaker: BotProfile,
  members: readonly BotProfile[],
  language: ChatLanguage,
): string {
  const others = members.filter((bot) => bot.id !== speaker.id);
  const names = others.map((bot) => bot.name).join(", ");
  return `${RULE[language](names)}\n${externalDataRule(language)}`;
}

/**
 * The group as one member sees it: the person's messages as the user, its
 * own as the assistant, and every other member's as data with their name.
 * Turns in a row from the same side are joined, so roles alternate.
 */
export function speakerMessages(
  history: readonly ChannelMessage[],
  speaker: BotProfile,
  bots: readonly BotProfile[],
): CrewMessage[] {
  const names = new Map(bots.map((bot) => [bot.id, bot.name]));
  const out: CrewMessage[] = [];
  for (const message of history.slice(-GROUP_HISTORY)) {
    const { author } = message;
    let entry: CrewMessage;
    if (author.kind === "human") {
      entry = { role: "user", text: message.text };
    } else if (author.botId === speaker.id) {
      entry = { role: "assistant", text: message.text };
    } else {
      const name = names.get(author.botId) ?? author.botId;
      entry = {
        role: "user",
        text: `${name}:\n${wrapExternalText(message.text)}`,
      };
    }
    const last = out[out.length - 1];
    if (last && last.role === entry.role) {
      last.text = `${last.text}\n\n${entry.text}`;
    } else {
      out.push(entry);
    }
  }
  while (out[0]?.role === "assistant") out.shift();
  return out;
}

/** A member's answer that says it has nothing to add. */
export function isSkip(text: string): boolean {
  return text.trim().replace(/[.!]$/, "") === SKIP_TOKEN;
}
