import type { DatabaseSync } from "node:sqlite";
import { MEMORY_MAX_ENTRY_LENGTH } from "../../memory/memory-entries.ts";
import { appendNote } from "../../memory/server/memory-repository.ts";
import type { ToolDefinition } from "../tool-definition.ts";

export const MEMORY_ADD_NOTE = "memory_add_note";

/**
 * Longest text the tool accepts: the memory's own cap per note, so a call
 * the user approves never fails for its length afterwards.
 */
export const MEMORY_NOTE_ARG_MAX_CHARS = MEMORY_MAX_ENTRY_LENGTH;

type Args = { text: string };

function parseArgs(raw: unknown): { ok: true; args: Args } | { ok: false } {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { ok: false };
  }
  const { text } = raw as Record<string, unknown>;
  if (typeof text !== "string") return { ok: false };
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > MEMORY_NOTE_ARG_MAX_CHARS) {
    return { ok: false };
  }
  return { ok: true, args: { text: trimmed } };
}

/**
 * Saves one note to the bot's memory. It changes stored data, so it asks
 * first; the user may allow it always for this bot.
 */
export function createMemoryAddNoteTool(
  db: DatabaseSync,
): ToolDefinition<Args> {
  return {
    name: MEMORY_ADD_NOTE,
    description:
      "Save one short note to this bot's memory so it is remembered in later chats.",
    parameters: {
      type: "object",
      properties: {
        text: {
          type: "string",
          description: "The note, one line of plain text",
          maxLength: MEMORY_NOTE_ARG_MAX_CHARS,
        },
      },
      required: ["text"],
      additionalProperties: false,
    },
    policy: "ask",
    allowAlways: true,
    timeoutMs: 10_000,
    maxResultChars: 500,
    parseArgs,
    async run(args, ctx) {
      if (ctx.signal.aborted) return { ok: false, code: "aborted" };
      const result = appendNote(db, ctx.botId, args.text);
      if (!result.ok) return { ok: false, code: `memory_${result.error}` };
      return {
        ok: true,
        text: `Saved note ${result.count}: ${result.entry.text}`,
        effect: { kind: "memory_changed" },
      };
    },
  };
}
