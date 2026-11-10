import { appPage, expect, test } from "./app-fixture.ts";

type ChatBody = { modelId?: string };

test("a bot's own model id travels with its chat calls and can be cleared", async ({
  page,
  model,
}) => {
  await page.goto("/");
  const app = appPage(page);
  const dialog = page.getByRole("dialog", { name: "Editar bot" });
  const modelField = dialog.getByRole("textbox", {
    name: "Modelo deste bot (opcional)",
  });

  await page.getByRole("button", { name: "Editar Chief of Staff" }).click();
  await modelField.fill("vendor/bot-model:free");
  await dialog.getByRole("button", { name: "Salvar bot" }).click();

  await app.send("first question");
  await expect(page.getByText("Stub reply").first()).toBeVisible();
  expect((model.chatRequests()[0] as ChatBody).modelId).toBe(
    "vendor/bot-model:free",
  );

  // Saved on the bot: still there after a reload.
  await page.reload();
  await page.getByRole("button", { name: "Editar Chief of Staff" }).click();
  await expect(modelField).toHaveValue("vendor/bot-model:free");

  // Empty means "use the global model": the request carries no modelId.
  await modelField.fill("");
  await dialog.getByRole("button", { name: "Salvar bot" }).click();
  await app.send("second question");
  await expect.poll(() => model.chatRequests().length).toBe(2);
  expect("modelId" in (model.chatRequests()[1] as ChatBody)).toBe(false);
});

test("a malformed model id blocks saving the bot", async ({ page }) => {
  await page.goto("/");
  const dialog = page.getByRole("dialog", { name: "Editar bot" });

  await page.getByRole("button", { name: "Editar Chief of Staff" }).click();
  await dialog
    .getByRole("textbox", { name: "Modelo deste bot (opcional)" })
    .fill("not a model");
  await expect(dialog.getByRole("alert")).toContainText("Use só letras");
  await expect(
    dialog.getByRole("button", { name: "Salvar bot" }),
  ).toBeDisabled();
});
