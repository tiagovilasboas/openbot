import { appPage, expect, test } from "./app-fixture.ts";

test("going back to the first message empties the thread and restores its text", async ({
  page,
  model,
}) => {
  model.queue({ text: "Answer one" }, { text: "Answer two" });
  await page.goto("/");
  const app = appPage(page);

  await app.send("first question");
  await expect(page.getByText("Answer one")).toBeVisible();
  await app.send("second question");
  await expect(page.getByText("Answer two")).toBeVisible();

  const turns = page
    .getByRole("region", { name: "Conversa" })
    .locator("article");
  await expect(turns).toHaveCount(4);

  await turns
    .nth(0)
    .getByRole("button", { name: /Editar e reenviar/ })
    .click();
  // The confirmation says what is lost: the reply and the second exchange.
  await expect(turns.getByRole("alert")).toContainText(
    "3 mensagens depois desta serão removidas.",
  );
  await page.getByRole("button", { name: "Voltar aqui" }).click();

  await expect(page.getByRole("region", { name: "Conversa" })).toHaveCount(0);
  await expect(app.composer).toHaveValue("first question");
  await expect(app.composer).toBeFocused();

  // The cut is stored: after a reload the thread stays empty.
  await page.reload();
  await expect(page.getByText("first question")).toHaveCount(0);
  await expect(page.getByText("Answer one")).toHaveCount(0);
});

test("going back to a later message keeps the earlier exchange", async ({
  page,
  model,
}) => {
  model.queue({ text: "Answer one" }, { text: "Answer two" });
  await page.goto("/");
  const app = appPage(page);

  await app.send("first question");
  await expect(page.getByText("Answer one")).toBeVisible();
  await app.send("second question");
  await expect(page.getByText("Answer two")).toBeVisible();

  const turns = page
    .getByRole("region", { name: "Conversa" })
    .locator("article");
  await turns
    .nth(2)
    .getByRole("button", { name: /Editar e reenviar/ })
    .click();
  await expect(turns.getByRole("alert")).toContainText(
    "1 mensagem depois desta será removida.",
  );
  await page.getByRole("button", { name: "Voltar aqui" }).click();

  await expect(turns).toHaveCount(2);
  await expect(turns.nth(0)).toContainText("first question");
  await expect(turns.nth(1)).toContainText("Answer one");
  await expect(app.composer).toHaveValue("second question");

  await page.reload();
  await expect(turns).toHaveCount(2);
  await expect(turns.nth(1)).toContainText("Answer one");

  // Sending the restored text again continues from the cut thread.
  await app.send("second question, edited");
  await expect(turns).toHaveCount(4);
  await expect(turns.nth(2)).toContainText("second question, edited");
});

test("the confirmation can be dismissed without losing anything", async ({
  page,
  model,
}) => {
  model.queue({ text: "Answer one" });
  await page.goto("/");
  const app = appPage(page);

  await app.send("first question");
  await expect(page.getByText("Answer one")).toBeVisible();

  const turns = page
    .getByRole("region", { name: "Conversa" })
    .locator("article");
  await turns
    .nth(0)
    .getByRole("button", { name: /Editar e reenviar/ })
    .click();
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();

  await expect(turns.getByRole("alert")).toHaveCount(0);
  await expect(turns).toHaveCount(2);
  await expect(app.composer).toHaveValue("");
});

test("going back is disabled, with the reason, while a reply is pending", async ({
  page,
  model,
}) => {
  model.queue({ text: "Slow answer", delayMs: 1500 });
  await page.goto("/");
  const app = appPage(page);

  await app.send("first question");

  const turns = page
    .getByRole("region", { name: "Conversa" })
    .locator("article");
  const action = turns
    .nth(0)
    .getByRole("button", { name: "Editar e reenviar" });
  await expect(action).toHaveAttribute("aria-disabled", "true");
  await expect(turns.nth(0)).toContainText(
    "Aguarde a resposta ou cancele para voltar.",
  );
  await action.click({ force: true });
  await expect(turns.getByRole("alert")).toHaveCount(0);
  await expect(turns).toHaveCount(1);

  // Once the reply lands, the action works again.
  await expect(page.getByText("Slow answer")).toBeVisible();
  await expect(
    turns.nth(0).getByRole("button", { name: /Editar e reenviar/ }),
  ).not.toHaveAttribute("aria-disabled", "true");
});
