import { wrapExternalText } from "../untrusted-text/wrap-external-text.ts";
import type { ToolDefinition, ToolRunResult } from "./tool-definition.ts";

/** No tool may run longer than this, whatever it declares. */
export const TOOL_TIMEOUT_MS = 10_000;
const PREVIEW_CHARS = 160;
const CODE_PATTERN = /^[a-z][a-z0-9_]{0,47}$/;
const TRUNCATED = "\n[truncated]";

/** One line, short: what the client shows on a call or result chip. */
export function previewOf(text: string): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length <= PREVIEW_CHARS
    ? flat
    : `${flat.slice(0, PREVIEW_CHARS - 1)}…`;
}

/** Error codes are fixed tags; anything else collapses to tool_failed. */
export function safeCode(code: string): string {
  return CODE_PATTERN.test(code) ? code : "tool_failed";
}

export const errorText = (code: string) => `error: ${safeCode(code)}`;

/**
 * Runs a tool with a hard timeout and the caller's abort. A throw or a
 * timeout becomes a fixed error code; nothing upstream leaks through.
 */
export async function executeTool(
  tool: ToolDefinition<unknown>,
  args: unknown,
  botId: string,
  parent: AbortSignal,
): Promise<ToolRunResult> {
  const timeout = new AbortController();
  const signal = AbortSignal.any([parent, timeout.signal]);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timedOut = new Promise<ToolRunResult>((resolve) => {
    timer = setTimeout(
      () => {
        timeout.abort();
        resolve({ ok: false, code: "timeout" });
      },
      Math.min(tool.timeoutMs, TOOL_TIMEOUT_MS),
    );
  });
  try {
    const run = tool
      .run(args, { botId, signal })
      .catch((): ToolRunResult => ({ ok: false, code: "tool_failed" }));
    const result = await Promise.race([run, timedOut]);
    return result.ok ? result : { ok: false, code: safeCode(result.code) };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * The text replayed to the model: a success is cut to the tool's cap and to
 * what is left of the turn's result budget, then wrapped as external data.
 */
export function resultText(
  text: string,
  maxChars: number,
): { text: string; chars: number } {
  const limit = Math.max(0, maxChars);
  const cut =
    text.length <= limit
      ? text
      : `${text.slice(0, Math.max(0, limit - TRUNCATED.length))}${TRUNCATED}`;
  return { text: wrapExternalText(cut), chars: cut.length };
}
