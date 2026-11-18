import type { Route } from "@playwright/test";
import { appPage, expect, test } from "./app-fixture.ts";

test("a 502 from the model shows a readable error and the composer stays usable", async ({
  page,
  model,
}) => {
  model.queue({ status: 502 }, { text: "Back online" });
  await page.goto("/");
  const app = appPage(page);

  await app.send("Are you there?");
  const thread = page.getByRole("region", { name: "Conversa" });
  await expect(
    thread.getByText(/O servidor do modelo teve um problema/),
  ).toBeVisible();
  // No raw stack, JSON or stub internals leak into the chat.
  await expect(thread.getByText("provider_error")).toHaveCount(0);

  await expect(app.composer).toBeEnabled();
  await app.send("Try again");
  await expect(thread.getByText("Back online")).toBeVisible();
});

test("an auth failure offers Open settings, which opens Settings", async ({
  page,
  model,
}) => {
  model.queue({ status: 401, detail: "401: No auth credentials found" });
  await page.goto("/");
  const app = appPage(page);

  await app.send("Hello");
  const thread = page.getByRole("region", { name: "Conversa" });
  await expect(thread.getByText(/chave de API está faltando/)).toBeVisible();
  await expect(
    thread.getByRole("button", { name: "Tentar de novo" }),
  ).toHaveCount(0);

  const action = thread.getByRole("button", { name: "Abrir configurações" });
  const box = await action.boundingBox();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  await action.click();
  await expect(
    page.getByRole("heading", { name: "Configurações do OpenBot" }),
  ).toBeVisible();
});

test("a server failure offers Try again, which sends the message again", async ({
  page,
  model,
}) => {
  model.queue({ status: 502 }, { text: "Back online" });
  await page.goto("/");
  const app = appPage(page);

  await app.send("Are you there?");
  const thread = page.getByRole("region", { name: "Conversa" });
  await thread.getByRole("button", { name: "Tentar de novo" }).click();

  await expect(thread.getByText("Back online")).toBeVisible();
  // The error reply was replaced, and the question was not duplicated.
  await expect(
    thread.getByText(/O servidor do modelo teve um problema/),
  ).toHaveCount(0);
  await expect(thread.getByText("Are you there?")).toHaveCount(1);
  expect(model.chatRequests()).toHaveLength(2);
});

test("a switched-off provider is named, with Open settings", async ({
  page,
}) => {
  // Both chat routes refuse it, as the server does for an off provider.
  const refuse = (route: Route) =>
    route.fulfill({
      status: 409,
      json: { error: "provider_off", provider: "router" },
    });
  await page.route("**/api/chat/stream", refuse);
  await page.route("**/api/chat", refuse);
  await page.goto("/");
  const app = appPage(page);

  await app.send("Hello");
  const thread = page.getByRole("region", { name: "Conversa" });
  await expect(thread.getByText(/OpenRouter está desativado/)).toBeVisible();
  await expect(
    thread.getByRole("button", { name: "Abrir configurações" }),
  ).toBeVisible();
  await expect(thread.getByText("provider_off")).toHaveCount(0);
});
