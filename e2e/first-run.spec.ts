import { appPage, expect, test } from "./app-fixture.ts";

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
