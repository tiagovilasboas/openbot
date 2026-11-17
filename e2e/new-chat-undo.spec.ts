import { appPage, expect, test } from "./app-fixture.ts";

test("New chat can be undone and the thread comes back after a reload", async ({
  page,
  model,
}) => {
  model.queue({ text: "Answer one" });
  await page.goto("/");
  const app = appPage(page);

  await app.send("first question");
  await expect(page.getByText("Answer one")).toBeVisible();

  await page.getByRole("button", { name: "Nova conversa" }).first().click();
  await expect(page.getByText("Answer one")).toHaveCount(0);
  const notice = page
    .getByRole("status")
    .filter({ hasText: "Conversa limpa." });
  await expect(notice).toBeVisible();

  await notice.getByRole("button", { name: "Desfazer" }).click();
  await expect(page.getByText("first question")).toBeVisible();
  await expect(page.getByText("Answer one")).toBeVisible();
  await expect(page.getByText("Conversa limpa.")).toHaveCount(0);

  // The restore is stored, not only shown.
  await page.reload();
  await expect(page.getByText("Answer one")).toBeVisible();
});

test("sending after New chat closes the undo window", async ({
  page,
  model,
}) => {
  model.queue({ text: "Answer one" }, { text: "Answer two" });
  await page.goto("/");
  const app = appPage(page);

  await app.send("first question");
  await expect(page.getByText("Answer one")).toBeVisible();

  await page.getByRole("button", { name: "Nova conversa" }).first().click();
  await expect(page.getByText("Conversa limpa.")).toBeVisible();

  await app.send("second question");
  await expect(page.getByText("Answer two")).toBeVisible();
  await expect(page.getByText("Conversa limpa.")).toHaveCount(0);
  await expect(page.getByText("Answer one")).toHaveCount(0);
});

test("a rollback that empties the thread does not bring Undo back", async ({
  page,
  model,
}) => {
  model.queue({ text: "Answer one" }, { text: "Answer two" });
  await page.goto("/");
  const app = appPage(page);

  await app.send("first question");
  await expect(page.getByText("Answer one")).toBeVisible();
  await page.getByRole("button", { name: "Nova conversa" }).first().click();
  await expect(page.getByText("Conversa limpa.")).toBeVisible();

  await app.send("second question");
  await expect(page.getByText("Answer two")).toBeVisible();
  await expect(page.getByText("Conversa limpa.")).toHaveCount(0);

  const turns = page
    .getByRole("region", { name: "Conversa" })
    .locator("article");
  await turns
    .nth(0)
    .getByRole("button", { name: /Editar e reenviar/ })
    .click();
  await page.getByRole("button", { name: "Voltar aqui" }).click();
  await expect(page.getByRole("region", { name: "Conversa" })).toHaveCount(0);

  await expect(page.getByText("Conversa limpa.")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Desfazer" })).toHaveCount(0);
});

test("switching bot and back does not offer Undo again", async ({
  page,
  model,
}) => {
  model.queue({ text: "Answer one" });
  await page.goto("/");
  const app = appPage(page);

  await app.send("first question");
  await expect(page.getByText("Answer one")).toBeVisible();
  await page.getByRole("button", { name: "Nova conversa" }).first().click();
  await expect(page.getByText("Conversa limpa.")).toBeVisible();

  await app.botRows().nth(1).click();
  await expect(page.getByText("Conversa limpa.")).toHaveCount(0);
  await app.botRows().nth(0).click();
  await expect(app.botRows().nth(0)).toHaveAttribute("aria-current", "page");
  await expect(page.getByText("Conversa limpa.")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Desfazer" })).toHaveCount(0);
});

test("keyboard focus lands in the composer after New chat and after Undo", async ({
  page,
  model,
}) => {
  model.queue({ text: "Answer one" });
  await page.goto("/");
  const app = appPage(page);

  await app.send("first question");
  await expect(page.getByText("Answer one")).toBeVisible();

  const newChat = page
    .locator("header")
    .getByRole("button", { name: "Nova conversa" });
  await newChat.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Conversa limpa.")).toBeVisible();
  await expect(app.composer).toBeFocused();

  const undo = page.getByRole("button", { name: "Desfazer" });
  await undo.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Answer one")).toBeVisible();
  await expect(app.composer).toBeFocused();
});
