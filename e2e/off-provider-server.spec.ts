import { appPage, expect, test } from "./app-fixture.ts";

// Talks to the real /api/settings and /api/chat routes; the e2e server keeps
// its data in a temporary dir. The server is shared by every worker, so the
// spec ends by switching OpenRouter back on there.
test.use({ realSettingsStore: true });

const headers = {
  "content-type": "application/json",
  "x-openbot-client": "1",
};

const isOffSave = (response: {
  url(): string;
  request(): { method(): string; postDataJSON(): unknown };
}) =>
  new URL(response.url()).pathname === "/api/settings" &&
  response.request().method() === "PUT" &&
  JSON.stringify(response.request().postDataJSON()).includes("providersOff");

test("a provider switched off is refused by the server after the browser storage is cleared", async ({
  page,
}) => {
  await page.goto("/");
  const app = appPage(page);
  const saved = page.waitForResponse(isOffSave);
  await app.openSettingsTab("Conexões");
  await page.getByRole("button", { name: /^OpenRouter/ }).click();
  await page.getByRole("switch", { name: "Usar OpenRouter" }).click();
  expect((await saved).status()).toBe(200);

  // A cleared browser takes the off list back from the server.
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await expect
    .poll(() =>
      page.evaluate(() => localStorage.getItem("openbot_providers_off")),
    )
    .toBe('["router"]');

  // The real chat route refuses it, whatever the browser sends.
  await page.context().unroute("**/api/chat");
  const refused = await page.evaluate(async (init) => {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: init,
      body: JSON.stringify({
        language: "pt",
        messages: [{ role: "user", text: "oi" }],
        config: {
          provider: "router",
          baseUrl: "https://openrouter.ai/api/v1",
          model: "e2e/stub-model",
        },
      }),
    });
    return { status: response.status, body: await response.json() };
  }, headers);
  expect(refused).toEqual({
    status: 409,
    body: { error: "provider_off", provider: "router" },
  });
});

// Leave the shared server as the other specs expect it, pass or fail.
test.afterEach(async ({ page }) => {
  const restored = await page.evaluate(async (init) => {
    const response = await fetch("/api/settings", {
      method: "PUT",
      headers: init,
      body: JSON.stringify({ settings: { providersOff: null } }),
    });
    return response.status;
  }, headers);
  expect(restored).toBe(200);
});
