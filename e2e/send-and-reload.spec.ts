import { appPage, expect, test } from "./app-fixture.ts";

test("a sent message gets the stubbed reply and the thread survives a reload", async ({
  page,
  model,
}) => {
  model.queue({ text: "Hello from the stub" });
  await page.goto("/");
  const app = appPage(page);

  await app.send("Ping the crew");
  const thread = page.getByRole("region", { name: "Conversa" });
  await expect(thread.getByText("Ping the crew")).toBeVisible();
  await expect(thread.getByText("Hello from the stub")).toBeVisible();
  expect(model.chatRequests()).toHaveLength(1);

  await page.reload();
  const kept = page.getByRole("region", { name: "Conversa" });
  await expect(kept.getByText("Ping the crew")).toBeVisible();
  await expect(kept.getByText("Hello from the stub")).toBeVisible();
  // Reloading must not ask the model again.
  expect(model.chatRequests()).toHaveLength(1);
});
