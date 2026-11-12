import { expect, test } from "./app-fixture.ts";

// Talks to the real /api/memory route; the e2e server keeps its data in a
// temporary dir, never in the user's home.
test.use({ realMemoryStore: true });

const NOTE = "Prefiro respostas curtas";

const isNotesSave = (response: {
  url(): string;
  request(): { method(): string; postData(): string | null };
}) =>
  new URL(response.url()).pathname === "/api/memory" &&
  response.request().method() === "PUT" &&
  (response.request().postData() ?? "").includes(NOTE);

test("a saved note reaches the server and survives clearing the browser storage", async ({
  page,
}) => {
  await page.goto("/");
  const dialog = page.getByRole("dialog", { name: "Editar bot" });

  await page.getByRole("button", { name: "Editar Chief of Staff" }).click();
  const field = dialog.getByRole("textbox", { name: "Nova anotação" });
  const saved = page.waitForResponse(isNotesSave);
  await field.fill(NOTE);
  await field.press("Enter");
  await expect(dialog.getByText(NOTE)).toBeVisible();
  const response = await saved;
  expect(response.status()).toBe(200);
  const body = response.request().postDataJSON() as {
    entries: { text: string }[];
  };
  expect(body.entries.map((entry) => entry.text)).toEqual([NOTE]);

  // Only the server can bring the note back after this.
  await dialog.getByRole("button", { name: "Cancelar" }).first().click();
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await page.getByRole("button", { name: "Editar Chief of Staff" }).click();
  await expect(dialog.getByText(NOTE)).toBeVisible();
});
