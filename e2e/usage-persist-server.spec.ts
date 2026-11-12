import { appPage, expect, test } from "./app-fixture.ts";

// Talks to the real /api/usage route; the e2e server keeps its data in a
// temporary dir, never in the user's home.
test.use({ realUsageStore: true });

const isUsageSave = (response: {
  url(): string;
  request(): { method(): string; postDataJSON(): unknown };
}) =>
  new URL(response.url()).pathname === "/api/usage" &&
  response.request().method() === "PUT" &&
  JSON.stringify(response.request().postDataJSON()).includes('"calls":1');

test("usage is saved on the server and survives clearing the browser storage", async ({
  page,
  model,
}) => {
  model.queue({
    text: "Counted reply",
    usage: { inputTokens: 1200, outputTokens: 300 },
  });
  await page.goto("/");
  const app = appPage(page);

  const saved = page.waitForResponse(isUsageSave);
  await app.send("count me");
  await expect(page.getByText("Counted reply")).toBeVisible();
  expect((await saved).status()).toBe(200);

  // Only the server can bring the usage back after this.
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await app.openSettingsTab("Uso");
  const chiefRow = page
    .getByRole("tabpanel")
    .getByRole("listitem")
    .filter({
      has: page.getByText("Chief of Staff", { exact: true }),
    });
  await expect(chiefRow).toContainText("1.200 entrada · 300 saída");
});
