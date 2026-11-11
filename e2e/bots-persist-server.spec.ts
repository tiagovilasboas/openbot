import { appPage, expect, test } from "./app-fixture.ts";

// This spec uses the real /api/bots route and the server's data dir, so its
// tests run one after the other. Other specs are stubbed and never touch that
// store, and nothing here counts bots: it may hold bots from earlier runs.
test.describe.configure({ mode: "serial" });
test.use({ realBotsStore: true });

type SaveResponse = {
  url(): string;
  request(): { method(): string; postData(): string | null };
};

const isBotsSave = (response: SaveResponse) =>
  new URL(response.url()).pathname === "/api/bots" &&
  response.request().method() === "PUT";

// A save can be followed by another PUT (the selection, a coalesced flush):
// wait for the one that carries the expected name, not just any PUT.
const isBotsSaveWith = (text: string) => (response: SaveResponse) =>
  isBotsSave(response) &&
  (response.request().postData() ?? "").includes(JSON.stringify(text));

test("a created and renamed bot survives clearing the browser storage", async ({
  page,
}) => {
  const name = `Persist ${Date.now().toString(36)}`;
  const renamed = `${name} B`;
  await page.goto("/");
  const app = appPage(page);

  const created = page.waitForResponse(isBotsSave);
  await page.getByRole("button", { name: "Criar bot" }).click();
  await page.getByRole("textbox", { name: "Nome" }).fill(name);
  await page
    .getByRole("textbox", { name: "Instruções do bot" })
    .fill("Keep answers short.");
  await page.getByRole("button", { name: "Salvar bot" }).click();
  expect((await created).status()).toBe(200);

  const saved = page.waitForResponse(isBotsSaveWith(renamed));
  await page.getByRole("button", { name: `Editar ${name}` }).click();
  await page.getByRole("textbox", { name: "Nome" }).fill(renamed);
  await page.getByRole("button", { name: "Salvar bot" }).click();
  expect((await saved).status()).toBe(200);

  // Only the server can bring the bot back after this.
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await expect(app.botRows().filter({ hasText: renamed })).toHaveCount(1);

  // Leaves the shared store as it was found.
  const removed = page.waitForResponse(isBotsSave);
  await page.getByRole("button", { name: `Editar ${renamed}` }).click();
  await page.getByRole("button", { name: "Excluir bot" }).click();
  await page.getByRole("button", { name: "Confirmar" }).click();
  expect((await removed).status()).toBe(200);
  await expect(page.getByText(renamed)).toHaveCount(0);
});
