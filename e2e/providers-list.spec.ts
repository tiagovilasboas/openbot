import { appPage, expect, test } from "./app-fixture.ts";

test("providers: list with states, a page per provider, and an off switch", async ({
  page,
  model,
}) => {
  model.queue({ text: "ok" });
  await page.goto("/");
  const app = appPage(page);
  await app.openSettingsTab("Conexões");

  // The list shows each provider once, with its state.
  const router = page.getByRole("button", { name: /OpenRouter/ });
  const anthropic = page.getByRole("button", { name: /Anthropic/ });
  await expect(router).toContainText("Em uso");
  await expect(anthropic).toContainText("Conectar");

  // Connect OpenRouter with a key (stubbed vault), then open its page.
  await router.click();
  await page.getByLabel("Chave de API").fill("sk-or-v1-e2e-list-key");
  await page.getByRole("button", { name: "Testar e conectar" }).click();
  await expect(page.getByText("Conectado. A chave funcionou.")).toBeVisible();
  await expect(page.getByText("Salva neste aparelho")).toBeVisible();
  await expect(page.getByText("Modelo em uso: e2e/stub-model")).toBeVisible();

  // Off keeps the key and takes the model out of chat.
  const toggle = page.getByRole("switch", { name: "Usar OpenRouter" });
  await expect(toggle).toHaveAttribute("aria-checked", "true");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-checked", "false");
  expect(
    await page.evaluate(() => localStorage.getItem("openbot_model_config")),
  ).toBeNull();
  await expect(page.getByText("Salva neste aparelho")).toBeVisible();

  await page.getByRole("button", { name: "Voltar para conexões" }).click();
  await expect(router).toContainText("Desativado");

  // On again: a default model returns because the key is still saved.
  await router.click();
  await page.getByRole("switch", { name: "Usar OpenRouter" }).click();
  await expect(page.getByText("Modelo em uso: openrouter/free")).toBeVisible();
  await page.getByRole("button", { name: "Voltar para conexões" }).click();
  await expect(router).toContainText("Em uso");
});

test("providers: the switch is refused while a reply is running", async ({
  page,
  model,
}) => {
  model.queue({ text: "slow reply", delayMs: 4000 });
  await page.goto("/");
  const app = appPage(page);
  await app.send("hello");
  await app.openSettingsTab("Conexões");
  await page.getByRole("button", { name: /OpenRouter/ }).click();

  const toggle = page.getByRole("switch", { name: "Usar OpenRouter" });
  await toggle.click();
  await expect(
    page.getByText("Uma resposta está em andamento com OpenRouter."),
  ).toBeVisible();
  await expect(toggle).toHaveAttribute("aria-checked", "true");
});
