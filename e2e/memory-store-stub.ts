import type { BrowserContext } from "@playwright/test";

/**
 * Stands in for /api/memory per browser context: one list of notes per bot,
 * kept in memory. GET reads, PUT replaces the whole list (an empty list
 * deletes it), DELETE answers 204.
 */
export async function stubMemoryStore(context: BrowserContext): Promise<void> {
  const notes = new Map<string, { entries: unknown[]; updatedAt: number }>();
  await context.route("**/api/memory**", async (route) => {
    const request = route.request();
    const method = request.method();
    const botId = new URL(request.url()).searchParams.get("botId");
    if (!botId) {
      const list = [...notes].map(([id, n]) => ({
        botId: id,
        updatedAt: n.updatedAt,
        count: n.entries.length,
      }));
      await route.fulfill({ json: { notes: list } });
      return;
    }
    if (method === "PUT") {
      const body = request.postDataJSON() as { entries?: unknown[] };
      const entries = Array.isArray(body.entries) ? body.entries : [];
      if (entries.length === 0) notes.delete(botId);
      else notes.set(botId, { entries, updatedAt: Date.now() });
      await route.fulfill({
        json: {
          botId,
          updatedAt: entries.length === 0 ? null : Date.now(),
          count: entries.length,
        },
      });
      return;
    }
    if (method === "DELETE") {
      notes.delete(botId);
      await route.fulfill({ status: 204, body: "" });
      return;
    }
    const stored = notes.get(botId);
    await route.fulfill({
      json: {
        botId,
        entries: stored?.entries ?? [],
        updatedAt: stored?.updatedAt ?? null,
      },
    });
  });
}
