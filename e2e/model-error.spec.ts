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
    thread.getByText(/Não consegui falar com o modelo configurado/),
  ).toBeVisible();
  // No raw stack, JSON or stub internals leak into the chat.
  await expect(thread.getByText("provider_error")).toHaveCount(0);

  await expect(app.composer).toBeEnabled();
  await app.send("Try again");
  await expect(thread.getByText("Back online")).toBeVisible();
});
