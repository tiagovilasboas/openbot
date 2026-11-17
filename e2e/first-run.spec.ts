import { appPage, expect, test } from "./app-fixture.ts";

test.use({ configuredModel: false });

const storedConfig = (page: import("@playwright/test").Page) =>
  page.evaluate(() => localStorage.getItem("openbot_model_config"));

test("start free without a saved key says a key is needed and offers connect", async ({
  page,
  model,
}) => {
  await page.goto("/");
  const app = appPage(page);
  await expect(
    page.getByRole("heading", { name: "Comece em um minuto" }),
  ).toBeVisible();
  // Nothing was sent to a provider just by opening the app.
  expect(model.chatRequests()).toHaveLength(0);
  expect(await storedConfig(page)).toBeNull();

  await page.getByRole("button", { name: "Começar grátis" }).click();

  expect(JSON.parse((await storedConfig(page)) ?? "{}")).toEqual({
    provider: "router",
    baseUrl: "https://openrouter.ai/api/v1",
    model: "openrouter/free",
  });
  await expect(app.composer).toHaveValue(
    "Oi! O que você consegue fazer por mim?",
  );
  await expect(
    page.getByText("Falta uma chave gratuita do OpenRouter"),
  ).toBeVisible();

  await page.getByRole("button", { name: "Conectar chave" }).click();
  // The connect form opens in place of Settings; Back returns to the card.
  await expect(page.getByLabel("Chave de API")).toBeVisible();
  await expect(page.getByRole("tab", { name: "Conexões" })).toHaveCount(0);
});

test("connect from the choice pastes a key and lands in the chat with a model", async ({
  page,
  model,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Conectar um provedor" }).click();
  await expect(page.getByLabel("Chave de API")).toBeVisible();

  // Back returns to the choice without connecting anything.
  await page.getByRole("button", { name: "Voltar" }).click();
  await expect(
    page.getByRole("button", { name: "Começar grátis" }),
  ).toBeVisible();
  expect(await storedConfig(page)).toBeNull();

  await page.getByRole("button", { name: "Conectar um provedor" }).click();
  await page.getByLabel("Chave de API").fill("sk-or-v1-e2e-first-run");
  await page.getByRole("button", { name: "Testar e conectar" }).click();

  // The card (form included) leaves and the chat has a model active.
  await expect(page.getByLabel("Chave de API")).toBeHidden();
  await expect(page.getByRole("button", { name: "Voltar" })).toBeHidden();
  await expect
    .poll(async () => JSON.parse((await storedConfig(page)) ?? "{}").provider)
    .toBe("router");
  await expect(
    page.getByRole("heading", { name: "Comece em um minuto" }),
  ).toHaveCount(0);
  expect(model.chatRequests()).toHaveLength(0);
});

test("a failed connect return shows a notice on the card and Try again reopens the form", async ({
  page,
}) => {
  await page.route("**/api/connections/router/callback", (route) =>
    route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({ status: "failed", reason: "denied" }),
    }),
  );
  await page.addInitScript(() => {
    if (!sessionStorage.getItem("e2e_seeded")) {
      sessionStorage.setItem("e2e_seeded", "1");
      sessionStorage.setItem("openbot_first_run_connect", "1");
    }
  });
  await page.goto("/?connect=router&state=s&error=access_denied");

  const notice = page.getByRole("alert").filter({ hasText: "conectar" });
  await expect(notice).toContainText("Não foi possível conectar");
  // The failure stays on the chat card; Settings did not open.
  await expect(page.getByRole("tab", { name: "Conexões" })).toHaveCount(0);

  await notice.getByRole("button", { name: "Tentar de novo" }).click();
  await expect(page.getByLabel("Chave de API")).toBeVisible();
  await page.getByRole("button", { name: "Voltar" }).click();
  await expect(
    page.getByRole("button", { name: "Começar grátis" }),
  ).toBeVisible();
  await expect(
    page.getByRole("alert").filter({ hasText: "conectar" }),
  ).toHaveCount(0);
});

test("other providers opens Settings", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Conectar um provedor" }).click();
  await page.getByRole("button", { name: "Outros provedores" }).click();
  await expect(page.getByRole("tab", { name: "Conexões" })).toBeVisible();
});

test("start free with a saved OpenRouter key ends in a chat ready to send", async ({
  page,
  model,
}) => {
  model.queue({ text: "Olá!" });
  await page.goto("/");
  await page.evaluate(() =>
    fetch("/api/keys", {
      method: "PUT",
      headers: { "content-type": "application/json", "x-openbot-client": "1" },
      body: JSON.stringify({
        provider: "router",
        origin: "https://openrouter.ai",
        key: "sk-or-v1-e2e",
      }),
    }),
  );
  await page.reload();
  const app = appPage(page);

  await page.getByRole("button", { name: "Começar grátis" }).click();
  await expect(
    page.getByRole("heading", { name: "Comece em um minuto" }),
  ).toBeHidden();
  await expect(page.getByText("Falta uma chave gratuita")).toHaveCount(0);

  await app.composer.press("Enter");
  await expect(page.getByText("Olá!", { exact: true })).toBeVisible();
});

test("a profile with a model never sees the first-run card", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "openbot_model_config",
      JSON.stringify({
        provider: "router",
        baseUrl: "https://openrouter.ai/api/v1",
        model: "openrouter/free",
      }),
    ),
  );
  await page.goto("/");
  await expect(
    page.getByRole("textbox", { name: "mensagem para o OpenBot" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Comece em um minuto" }),
  ).toHaveCount(0);
});

test("without a connection agents are locked, the composer says why, and a key unlocks them", async ({
  page,
  model,
}) => {
  await page.goto("/");
  const app = appPage(page);

  await expect(app.composer).toBeDisabled();
  await expect(
    page.getByText("Conecte um provedor acima para começar a conversar"),
  ).toBeVisible();
  await expect(
    page.getByText("Conecte um provedor para usar os agentes"),
  ).toBeVisible();
  await expect(app.botRows().first()).toBeDisabled();
  await expect(page.getByRole("button", { name: "Criar bot" })).toBeDisabled();
  // Settings stays reachable while locked.
  await expect(
    page.getByRole("button", { name: "Configurações" }),
  ).toBeEnabled();

  await page.getByRole("button", { name: "Conectar um provedor" }).click();
  await page.getByLabel("Chave de API").fill("sk-or-v1-e2e-gate");
  await page.getByRole("button", { name: "Testar e conectar" }).click();

  expect(model.chatRequests()).toHaveLength(0);
  await expect(app.composer).toBeEnabled();
  await expect(app.botRows().first()).toBeEnabled();
  await expect(page.getByRole("button", { name: "Criar bot" })).toBeEnabled();
  await expect(
    page.getByText("Conecte um provedor para usar os agentes"),
  ).toHaveCount(0);
});

test("with a server model, the first-run buttons never appear while the gate checks", async ({
  page,
}) => {
  await page.route("**/api/model/test", async (route) => {
    if (route.request().method() !== "GET") return route.fallback();
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await route.fulfill({
      json: { configured: true, provider: "router", model: "e2e/server" },
    });
  });
  // Records every moment the card's buttons exist, not only the end state.
  await page.addInitScript(() => {
    const w = window as unknown as { __firstRunSeen: boolean };
    w.__firstRunSeen = false;
    new MutationObserver(() => {
      if (document.body?.textContent?.includes("Começar grátis"))
        w.__firstRunSeen = true;
    }).observe(document, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  });
  await page.goto("/");
  await page.waitForTimeout(800);
  await expect(
    page.getByRole("button", { name: "Começar grátis" }),
  ).toHaveCount(0);
  await page.waitForTimeout(1500);
  expect(
    await page.evaluate(
      () => (window as unknown as { __firstRunSeen: boolean }).__firstRunSeen,
    ),
  ).toBe(false);
});

test("when the saved keys cannot be listed, the card offers Try again instead of waiting", async ({
  page,
}) => {
  let failing = true;
  await page.route("**/api/keys**", (route) =>
    failing
      ? route.fulfill({ status: 500, json: { error: "down" } })
      : route.fallback(),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Começar grátis" }).click();

  const notice = page.getByRole("alert").filter({ hasText: "chaves salvas" });
  await expect(notice).toBeVisible();
  await expect(page.getByText("Verificando se há uma chave")).toHaveCount(0);

  failing = false;
  await notice.getByRole("button", { name: "Tentar de novo" }).click();
  await expect(
    page.getByText("Falta uma chave gratuita do OpenRouter"),
  ).toBeVisible();
});
