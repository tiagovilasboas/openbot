import type { DatabaseSync } from "node:sqlite";
import { createBotProfile } from "../../bots/bot-storage.ts";
import {
  BOT_LABEL_MAX_LENGTH,
  BOT_NAME_MAX_LENGTH,
  BOT_TEXT_MAX_LENGTH,
  type BotProfile,
} from "../../bots/bot-types.ts";
import { listBots, replaceBots } from "../../bots/server/bots-repository.ts";
import { validateBotsWrite } from "../../bots/server/validate-bots-write.ts";
import type { ParsedArgs, ToolDefinition } from "../tool-definition.ts";

export const CREATE_BOT = "create_bot";
export const UPDATE_BOT = "update_bot";

type Fields = { name?: string; title?: string; instructions?: string };
type CreateArgs = Fields & { name: string; instructions: string };
type UpdateArgs = Fields & { botId: string };

const LIMITS: Record<keyof Fields, number> = {
  name: BOT_NAME_MAX_LENGTH,
  title: BOT_LABEL_MAX_LENGTH,
  instructions: BOT_TEXT_MAX_LENGTH,
};

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** Optional text fields: trimmed, non-empty and within the bot's limits. */
function readFields(raw: Record<string, unknown>): Fields | null {
  const fields: Fields = {};
  for (const key of Object.keys(LIMITS) as (keyof Fields)[]) {
    const value = raw[key];
    if (value === undefined) continue;
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    if (!trimmed || trimmed.length > LIMITS[key]) return null;
    fields[key] = trimmed;
  }
  return fields;
}

export function parseCreateArgs(raw: unknown): ParsedArgs<CreateArgs> {
  if (!isRecord(raw)) return { ok: false };
  const fields = readFields(raw);
  if (!fields?.name || !fields.instructions) return { ok: false };
  return {
    ok: true,
    args: { ...fields, name: fields.name, instructions: fields.instructions },
  };
}

export function parseUpdateArgs(raw: unknown): ParsedArgs<UpdateArgs> {
  if (!isRecord(raw) || typeof raw.botId !== "string") return { ok: false };
  const fields = readFields(raw);
  if (!fields || Object.keys(fields).length === 0) return { ok: false };
  const botId = raw.botId.trim();
  return botId ? { ok: true, args: { ...fields, botId } } : { ok: false };
}

/** Saves through the same validator as the bots API; never a partial list. */
function save(db: DatabaseSync, bots: BotProfile[]): string | null {
  const checked = validateBotsWrite(bots);
  if (!checked.ok) return `bots_${checked.error}`;
  replaceBots(db, checked.bots);
  return null;
}

const FIELD_SCHEMA = {
  name: { type: "string", maxLength: BOT_NAME_MAX_LENGTH },
  title: {
    type: "string",
    description: "Short role shown under the name",
    maxLength: BOT_LABEL_MAX_LENGTH,
  },
  instructions: {
    type: "string",
    description: "The bot's system prompt, in plain text",
    maxLength: BOT_TEXT_MAX_LENGTH,
  },
} as const;

/**
 * Creates a bot in the crew. It changes the crew, so every call asks the
 * user; "always allow" is not on offer.
 */
export function createCreateBotTool(
  db: DatabaseSync,
): ToolDefinition<CreateArgs> {
  return {
    name: CREATE_BOT,
    description:
      "Create a new bot in the user's crew with a name, an optional title and its instructions.",
    parameters: {
      type: "object",
      properties: FIELD_SCHEMA,
      required: ["name", "instructions"],
      additionalProperties: false,
    },
    policy: "ask",
    allowAlways: false,
    timeoutMs: 10_000,
    maxResultChars: 500,
    parseArgs: parseCreateArgs,
    async run(args, ctx) {
      if (ctx.signal.aborted) return { ok: false, code: "aborted" };
      const bots = listBots(db);
      // An empty server list means the browser has not synced yet: writing
      // now would replace the whole crew with one bot.
      if (bots.length === 0) return { ok: false, code: "bots_not_synced" };
      const bot = createBotProfile({
        name: args.name,
        title: args.title,
        description: args.instructions,
      });
      const error = save(db, [...bots, bot]);
      if (error) return { ok: false, code: error };
      return {
        ok: true,
        text: `Created bot "${bot.name}" with id ${bot.id}.`,
        preview: bot.name,
        effect: { kind: "bots_changed" },
      };
    },
  };
}

/** Changes a bot's name, title or instructions; asks every time. */
export function createUpdateBotTool(
  db: DatabaseSync,
): ToolDefinition<UpdateArgs> {
  return {
    name: UPDATE_BOT,
    description:
      "Change an existing bot's name, title or instructions. Pass only the fields to change.",
    parameters: {
      type: "object",
      properties: {
        botId: { type: "string", description: "Id of the bot to change" },
        ...FIELD_SCHEMA,
      },
      required: ["botId"],
      additionalProperties: false,
    },
    policy: "ask",
    allowAlways: false,
    timeoutMs: 10_000,
    maxResultChars: 500,
    parseArgs: parseUpdateArgs,
    async run(args, ctx) {
      if (ctx.signal.aborted) return { ok: false, code: "aborted" };
      const bots = listBots(db);
      const target = bots.find((bot) => bot.id === args.botId);
      if (!target) return { ok: false, code: "bot_not_found" };
      const changed: BotProfile = {
        ...target,
        ...(args.name ? { name: args.name } : {}),
        ...(args.title ? { title: args.title } : {}),
        ...(args.instructions ? { description: args.instructions } : {}),
        updatedAt: new Date().toISOString(),
      };
      const error = save(
        db,
        bots.map((bot) => (bot.id === target.id ? changed : bot)),
      );
      if (error) return { ok: false, code: error };
      return {
        ok: true,
        text: `Updated bot "${changed.name}" (${changed.id}).`,
        preview: changed.name,
        effect: { kind: "bots_changed" },
      };
    },
  };
}
