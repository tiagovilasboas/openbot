import { appPage, expect, test } from "./app-fixture.ts";

// A fresh install: no agent exists until the person creates one.
test.use({ seededCrew: false });

test("a fresh install opens the agent setup with no agent ready-made", async ({
  page,
}) => {
  await page.goto("/");
  const setup = page.getByRole("form", { name: "Crie seus agentes" });
  await expect(setup).toBeVisible();
  await expect(page.getByRole("region", { name: "Conversa" })).toHaveCount(0);
  for (const box of await setup.getByRole("checkbox").all()) {
    await expect(box).not.toBeChecked();
  }
  await expect(
    setup.getByRole("button", { name: "Criar e começar" }),
  ).toBeDisabled();
});

test("creating the main agent alone leaves a crew of one", async ({ page }) => {
  await page.goto("/");
  const setup = page.getByRole("form", { name: "Crie seus agentes" });
  await setup.getByLabel("Nome do agente principal").fill("Ana");
  await setup.getByRole("button", { name: "Criar e começar" }).click();

  await expect(appPage(page).botRows()).toHaveCount(1);
  await expect(appPage(page).botRows().first()).toContainText("Ana");
  await page.reload();
  await expect(appPage(page).botRows()).toHaveCount(1);
});

test("only the roles the person checks are created", async ({ page }) => {
  await page.goto("/");
  const setup = page.getByRole("form", { name: "Crie seus agentes" });
  await setup.getByLabel("Nome do agente principal").fill("Ana");
  await setup.getByRole("checkbox", { name: /Engineering/ }).check();
  await setup.getByRole("button", { name: "Criar e começar" }).click();

  await expect(appPage(page).botRows()).toHaveCount(2);
  await expect(appPage(page).botRows().first()).toContainText("Ana");
  await expect(appPage(page).botRows().nth(1)).toContainText("Engineering");
});
