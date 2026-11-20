import { appPage, expect, test } from "./app-fixture.ts";

// End-to-end checks for the openbot.run parity rounds (#191 to #193):
// what a person does with each feature, against the built app.

const conversation = (page: import("@playwright/test").Page) =>
  page.getByRole("region", { name: "Conversa" });

test("correct course stops the reply and answers the newest message first", async ({
  page,
  model,
}) => {
  model.queue(
    { text: "Slow answer", delayMs: 4_000 },
    { text: "Answer to the correction" },
    { text: "Answer to the older one" },
  );
  await page.goto("/");
  const app = appPage(page);
  await app.send("first question");
  await app.send("older queued");
  await app.send("correction");
  await page.getByRole("button", { name: "Corrigir o rumo" }).click();

  await expect(conversation(page)).toContainText("Answer to the correction");
  await expect(conversation(page)).toContainText("Answer to the older one");
  const requests = model.chatRequests() as {
    messages: { role: string; text: string }[];
  }[];
  expect(requests).toHaveLength(3);
  expect(requests[1].messages.at(-1)?.text).toBe("correction");
  expect(requests[2].messages.at(-1)?.text).toBe("older queued");
  await expect(conversation(page)).not.toContainText("Slow answer");
});

test("a side question is answered in its panel and never enters the thread", async ({
  page,
  model,
}) => {
  model.queue({ text: "Main reply" }, { text: "Side answer" });
  await page.goto("/");
  const app = appPage(page);
  await app.send("plan the launch");
  await expect(conversation(page)).toContainText("Main reply");

  await page.getByRole("button", { name: "Pergunta lateral" }).click();
  const dialog = page.getByRole("dialog", { name: "Pergunta lateral" });
  await dialog.getByRole("textbox", { name: "Sua pergunta" }).fill("what now?");
  await dialog.getByRole("button", { name: "Perguntar" }).click();
  await expect(dialog).toContainText("Side answer");

  const side = model.chatRequests()[1] as {
    messages: { role: string; text: string }[];
  };
  expect(side.messages.map((m) => m.text)).toEqual([
    "plan the launch",
    "Main reply",
    "what now?",
  ]);
  await page.keyboard.press("Escape");
  await expect(conversation(page)).not.toContainText("what now?");
  await expect(conversation(page)).not.toContainText("Side answer");
});

test("a pinned side conversation stays pinned after a reload", async ({
  page,
}) => {
  await page.goto("/");
  const threads = page.getByRole("navigation", {
    name: "Conversas deste agente",
  });
  await page.getByRole("button", { name: "Conversa paralela" }).click();
  const pin = page.getByRole("button", { name: "Fixar" });
  await pin.click();
  await expect(page.getByRole("button", { name: "Desafixar" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.reload();
  await expect(threads).toContainText("Fixada");
});

test("a bot moved to a folder shows under that folder in the sidebar", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Editar Engineering" }).click();
  const dialog = page.getByRole("dialog", { name: "Editar bot" });
  await dialog.getByText("Mais opções", { exact: true }).click();
  await dialog.getByPlaceholder("Ex.: Trabalho").fill("Produto");
  await dialog.getByRole("button", { name: "Mover para a pasta" }).click();
  const folder = page.getByRole("button", { name: /Produto \(1\)/ });
  await expect(folder).toBeVisible();
  await folder.click();
  await expect(folder).toHaveAttribute("aria-expanded", "false");
});

test("an install link shows a preview and installs only on confirm", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");
  await page.getByRole("button", { name: "Editar Engineering" }).click();
  const dialog = page.getByRole("dialog", { name: "Editar bot" });
  await dialog.getByText("Mais opções", { exact: true }).click();
  await dialog
    .getByRole("button", { name: "Copiar link de instalação" })
    .click();
  await expect(dialog).toContainText("Link copiado");
  const link = await page.evaluate(() => navigator.clipboard.readText());
  expect(link).toContain("#install=");

  const before = await appPage(page).botRows().count();
  await page.goto(link);
  const prompt = page.getByRole("dialog", { name: "Instalar este bot?" });
  await expect(prompt).toContainText("Engineering");
  await prompt.getByRole("button", { name: "Instalar bot" }).click();
  await expect(appPage(page).botRows()).toHaveCount(before + 1);
  expect(new URL(page.url()).hash).toBe("");
});

test("a broken install link says so and installs nothing", async ({ page }) => {
  await page.goto("/#install=not-a-template");
  await expect(
    page.getByRole("dialog", { name: "Instalar este bot?" }),
  ).toContainText("não é válido");
});

test("Settings show the MCP state and the bot editor the files section", async ({
  page,
}) => {
  await page.goto("/");
  await appPage(page).openSettingsTab("Conexões");
  await expect(
    page.getByRole("region", { name: "Integrações do servidor" }),
  ).toContainText("Nenhum servidor em OPENBOT_MCP_SERVERS");
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Editar Engineering" }).click();
  const dialog = page.getByRole("dialog", { name: "Editar bot" });
  await dialog.getByText("Arquivos", { exact: true }).click();
  await expect(dialog).toContainText("OPENBOT_WORKSPACE_DIR");
});
