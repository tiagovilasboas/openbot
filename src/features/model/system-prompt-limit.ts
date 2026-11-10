/**
 * The most characters a system prompt may have when it reaches the server.
 * The client builds its prompt to fit this (bots/bot-system-prompt.ts), and the
 * server refuses a longer one instead of cutting its tail, because the tail is
 * where the team roster and the delegation rules sit.
 */
export const MAX_SYSTEM_PROMPT_CHARS = 12_000;
