import { appPage, expect, test } from "./app-fixture.ts";

test("a bot can be created, edited and deleted", async ({ page }) => {
  await page.goto("/");
  const app = appPage(page);

  await page.getByRole("button", { name: "Criar bot" }).click();
  await page.getByRole("textbox", { name: "Nome" }).fill("Ops Bot");
  await page.getByRole("textbox", { name: "Especialidade" }).fill("On call");
  await page
    .getByRole("textbox", { name: "Instruções do bot" })
    .fill("Keep answers short.");
  await page.getByRole("button", { name: "Salvar bot" }).click();

  await expect(app.botRows()).toHaveCount(10);
  await expect(app.botRows().last()).toContainText("Ops Bot");
  await expect(app.botRows().last()).toContainText("On call");

  await page.getByRole("button", { name: "Editar Ops Bot" }).click();
  await page.getByRole("textbox", { name: "Nome" }).fill("Ops Bot Prime");
  await page.getByRole("button", { name: "Salvar bot" }).click();
  await expect(app.botRows().last()).toContainText("Ops Bot Prime");
  await expect(app.botRows()).toHaveCount(10);

  await page.getByRole("button", { name: "Editar Ops Bot Prime" }).click();
  await page.getByRole("button", { name: "Excluir bot" }).click();
  await page.getByRole("button", { name: "Confirmar" }).click();
  await expect(app.botRows()).toHaveCount(9);
  await expect(page.getByText("Ops Bot Prime")).toHaveCount(0);
});

test("the main bot cannot be deleted; making another bot main moves it to the top", async ({
  page,
}) => {
  await page.goto("/");
  const app = appPage(page);

  await page.getByRole("button", { name: "Editar Chief of Staff" }).click();
  const dialog = page.getByRole("dialog", { name: "Editar bot" });
  await expect(dialog.getByText("Bot principal").first()).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Excluir bot" })).toHaveCount(
    0,
  );
  await dialog.getByRole("button", { name: "Cancelar" }).click();

  await page.getByRole("button", { name: "Editar Security" }).click();
  await dialog.getByRole("button", { name: "Tornar principal" }).click();
  await dialog.getByRole("button", { name: "Salvar bot" }).click();

  await expect(app.botRows().first()).toContainText("Security");
  await expect(app.botRows().first()).toContainText("Manager & Orquestrador");

  // The new main bot is protected; the former one can now be deleted.
  await page.getByRole("button", { name: "Editar Security" }).click();
  await expect(dialog.getByRole("button", { name: "Excluir bot" })).toHaveCount(
    0,
  );
  await dialog.getByRole("button", { name: "Cancelar" }).click();
  await page.getByRole("button", { name: "Editar Chief of Staff" }).click();
  await expect(
    dialog.getByRole("button", { name: "Excluir bot" }),
  ).toBeVisible();
});
