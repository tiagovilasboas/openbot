import {
  appPage,
  expect,
  stubBotsStore,
  stubConversationsStore,
  stubKeysStore,
  test,
} from "./app-fixture.ts";

test("an exported backup imports into a fresh browser profile", async ({
  page,
  browser,
  model,
}, testInfo) => {
  model.queue({ text: "Reply worth keeping" });
  await page.goto("/");
  const app = appPage(page);

  await page.getByRole("button", { name: "Criar bot" }).click();
  await page.getByRole("textbox", { name: "Nome" }).fill("Ops Bot");
  await page.getByRole("textbox", { name: "Especialidade" }).fill("On call");
  await page
    .getByRole("textbox", { name: "Instruções do bot" })
    .fill("Be brief.");
  await page.getByRole("button", { name: "Salvar bot" }).click();
  await page.getByRole("button", { name: "Chief of Staff Manager" }).click();
  await app.send("Remember this question");
  await expect(page.getByText("Reply worth keeping")).toBeVisible();

  await app.openSettingsTab("Segurança");
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Exportar backup" }).click(),
  ]);
  const file = testInfo.outputPath("openbot-backup.json");
  await download.saveAs(file);

  // A different context has fresh storage: nothing of the first one leaks in.
  const fresh = await browser.newContext({ serviceWorkers: "block" });
  // A context made here skips the fixture: give it its own empty stores, so
  // the backup alone fills it and the real server stores stay untouched.
  await stubBotsStore(fresh);
  await stubKeysStore(fresh);
  await stubConversationsStore(fresh);
  const freshPage = await fresh.newPage();
  await freshPage.goto("/");
  const freshApp = appPage(freshPage);
  await expect(freshApp.botRows()).toHaveCount(9);

  await freshApp.openSettingsTab("Segurança");
  await freshPage
    .getByLabel("Arquivo de backup do OpenBot")
    .setInputFiles(file);
  await expect(
    freshPage.getByText(/10 bot\(s\) e 1 conversa\(s\)/),
  ).toBeVisible();
  await freshPage.getByRole("radio", { name: /Substituir/ }).check();
  await freshPage.getByRole("button", { name: "Substituir tudo" }).click();

  // The page reloads itself after restoring.
  await expect(freshApp.botRows()).toHaveCount(10);
  await expect(freshApp.botRows().last()).toContainText("Ops Bot");
  await freshPage
    .getByRole("button", { name: "Chief of Staff Manager" })
    .click();
  await expect(freshPage.getByText("Remember this question")).toBeVisible();
  await expect(freshPage.getByText("Reply worth keeping")).toBeVisible();
  await fresh.close();
});
