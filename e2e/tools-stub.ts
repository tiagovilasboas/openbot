import type { BrowserContext } from "@playwright/test";

/** One scripted /api/chat/tools answer: NDJSON events, or a bare status. */
export type ToolsAnswer = { events: object[] } | { status: number };

export interface ToolsStub {
  /** Answers for /api/chat/tools calls, in order. With none left the route
   * answers 503, so a first turn falls back to the plain /api/chat stub. */
  queue: (...answers: ToolsAnswer[]) => void;
  /** Bodies of the /api/chat/tools calls received so far. */
  requests: () => unknown[];
}

/** Events written the way the tool route writes them. */
export const toolEvents = {
  delta: (text: string) => ({ type: "delta", text }),
  done: { type: "done", provider: "stub" },
  call: (callId: string, name: string, preview: string) => ({
    type: "tool_call",
    callId,
    name,
    preview,
    policy: "ask",
  }),
  result: (callId: string, ok: boolean, preview: string) => ({
    type: "tool_result",
    callId,
    ok,
    preview,
  }),
  approval: (turnId: string, calls: object[], expiresAt: number) => ({
    type: "approval_required",
    turnId,
    calls,
    expiresAt,
  }),
};

/**
 * Stubs /api/chat/tools on a context. Each answer is the whole NDJSON body
 * at once: the approval flow needs no gates, only the right order of events.
 */
export async function stubTools(context: BrowserContext): Promise<ToolsStub> {
  const answers: ToolsAnswer[] = [];
  const received: unknown[] = [];
  await context.route("**/api/chat/tools", async (route) => {
    received.push(route.request().postDataJSON());
    const answer = answers.shift();
    if (!answer) {
      await route.fulfill({
        status: 503,
        json: { error: "no_provider_configured" },
      });
      return;
    }
    if ("status" in answer) {
      await route.fulfill({
        status: answer.status,
        json: { error: "turn_gone" },
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/x-ndjson; charset=utf-8",
      body: answer.events.map((event) => `${JSON.stringify(event)}\n`).join(""),
    });
  });
  return {
    queue: (...next) => void answers.push(...next),
    requests: () => received,
  };
}
