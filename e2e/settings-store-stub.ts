import type { BrowserContext } from "@playwright/test";

/**
 * Stands in for /api/settings per browser context: the saved keys, in
 * memory. It follows the contract: GET returns only the saved keys, PUT
 * merges per key and a null clears one.
 */
export async function stubSettingsStore(
  context: BrowserContext,
): Promise<void> {
  const settings = new Map<string, unknown>();
  await context.route("**/api/settings", async (route) => {
    const request = route.request();
    if (request.method() === "PUT") {
      const body = request.postDataJSON() as {
        settings?: Record<string, unknown>;
      };
      for (const [key, value] of Object.entries(body.settings ?? {})) {
        if (value === null) settings.delete(key);
        else settings.set(key, value);
      }
    }
    await route.fulfill({ json: { settings: Object.fromEntries(settings) } });
  });
}
