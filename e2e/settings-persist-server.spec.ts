import { expect, test } from "./app-fixture.ts";

// Talks to the real /api/settings route; the e2e server keeps its data in a
// temporary dir, never in the user's home. The server is shared by every
// worker, so the spec ends by putting the language back.
test.use({ realSettingsStore: true });

const isLanguageSave = (response: {
  url(): string;
  request(): { method(): string; postDataJSON(): unknown };
}) =>
  new URL(response.url()).pathname === "/api/settings" &&
  response.request().method() === "PUT" &&
  JSON.stringify(response.request().postDataJSON()).includes('"language"');

test("the chosen language is saved on the server and survives clearing the browser storage", async ({
  page,
}) => {
  await page.goto("/");
  const saved = page.waitForResponse(isLanguageSave);
  await page
    .getByRole("group", { name: "Idioma" })
    .getByRole("button", { name: "EN" })
    .click();
  expect((await saved).status()).toBe(200);

  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await expect(
    page.getByRole("heading", {
      name: "How can Chief of Staff help you today?",
    }),
  ).toBeVisible();

  // Leave the shared server as the other specs expect it.
  const restored = page.waitForResponse(isLanguageSave);
  await page
    .getByRole("group", { name: "Language" })
    .getByRole("button", { name: "PT" })
    .click();
  await restored;
});
