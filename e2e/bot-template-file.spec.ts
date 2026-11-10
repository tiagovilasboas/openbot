import { readFileSync, writeFileSync } from "node:fs";
import { appPage, expect, test } from "./app-fixture.ts";

test("a bot exported as a file fills a new bot's form, without chats or ids", async ({
  page,
  model,
}, testInfo) => {
  model.queue({ text: "A private answer" });
  await page.goto("/");
  const app = appPage(page);

  await page.getByRole("button", { name: "Criar bot" }).click();
  await page.getByRole("textbox", { name: "Nome" }).fill("Ops Bot");
  await page.getByRole("textbox", { name: "Especialidade" }).fill("On call");
  await page
    .getByRole("textbox", { name: "Instruções do bot" })
    .fill("Keep answers short.");
  await page.getByRole("button", { name: "Salvar bot" }).click();
  await app.send("A private question");
  await expect(page.getByText("A private answer")).toBeVisible();

  await page.getByRole("button", { name: "Editar Ops Bot" }).click();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Exportar este bot" }).click(),
  ]);
  expect(download.suggestedFilename()).toBe("openbot-bot-ops-bot.json");
  const file = testInfo.outputPath("ops-bot.json");
  await download.saveAs(file);
  await page.getByRole("button", { name: "Cancelar" }).click();

  const content = readFileSync(file, "utf8");
  expect(content).not.toContain("private");
  expect(content).not.toContain("createdAt");

  await page.getByRole("button", { name: "Criar bot" }).click();
  await page.getByLabel("Arquivo de bot do OpenBot").setInputFiles(file);
  await expect(page.getByText("Bot carregado no formulário")).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Nome" })).toHaveValue(
    "Ops Bot",
  );
  await page.getByRole("textbox", { name: "Nome" }).fill("Ops Bot 2");
  await page.getByRole("button", { name: "Salvar bot" }).click();

  await expect(app.botRows()).toHaveCount(11);
  await expect(app.botRows().last()).toContainText("Ops Bot 2");
  await expect(app.botRows().last()).toContainText("On call");
});

test("importing a backup file as a bot says what to do instead", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Criar bot" }).click();
  const file = testInfo.outputPath("not-a-bot.json");
  writeFileSync(
    file,
    JSON.stringify({ app: "openbot", version: 1, data: { bots: [] } }),
  );
  await page.getByLabel("Arquivo de bot do OpenBot").setInputFiles(file);
  await expect(page.getByText("Esse é um backup completo")).toBeVisible();
});
