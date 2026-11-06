import type { ChatLanguage } from "./respond-to-message.ts";

export type HistoryMessage = { role: "assistant" | "user"; text: string };

export type ModelReplyOutcome =
  { kind: "text"; text: string } | { kind: "unavailable" } | { kind: "error" };

/**
 * Asks the server chat route for a model reply. "unavailable" means the server
 * has no provider configured, so callers can keep the explicit demo behavior
 * instead of pretending a model answered.
 */
export async function requestModelReply(
  language: ChatLanguage,
  messages: HistoryMessage[],
  fetchImpl: typeof fetch = fetch,
): Promise<ModelReplyOutcome> {
  let response: Response;
  try {
    response = await fetchImpl("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ language, messages }),
    });
  } catch {
    return { kind: "error" };
  }

  const payload: unknown = await response.json().catch(() => null);
  const body = (payload ?? {}) as { error?: unknown; text?: unknown };

  if (response.status === 503 && body.error === "no_provider_configured") {
    return { kind: "unavailable" };
  }
  if (response.ok && typeof body.text === "string" && body.text.trim()) {
    return { kind: "text", text: body.text };
  }
  return { kind: "error" };
}
