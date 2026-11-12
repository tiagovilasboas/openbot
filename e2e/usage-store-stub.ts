import type { BrowserContext } from "@playwright/test";

/**
 * Stands in for /api/usage per browser context: one global log kept in
 * memory. GET reads, PUT replaces the whole log, DELETE answers 204.
 */
export async function stubUsageStore(context: BrowserContext): Promise<void> {
  let records: unknown[] = [];
  let updatedAt: number | null = null;
  await context.route("**/api/usage**", async (route) => {
    const request = route.request();
    const method = request.method();
    if (method === "PUT") {
      const body = request.postDataJSON() as { records?: unknown[] };
      records = Array.isArray(body.records) ? body.records : [];
      updatedAt = records.length === 0 ? null : Date.now();
      await route.fulfill({ json: { updatedAt, count: records.length } });
      return;
    }
    if (method === "DELETE") {
      records = [];
      updatedAt = null;
      await route.fulfill({ status: 204, body: "" });
      return;
    }
    await route.fulfill({ json: { records, updatedAt } });
  });
}
