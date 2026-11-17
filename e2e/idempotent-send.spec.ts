import { appPage, expect, test } from "./app-fixture.ts";

test("Try again reuses the send id and never duplicates the user message", async ({
  page,
  model,
}) => {
  model.queue({ status: 502 }, { status: 502 }, { text: "Back online" });
  await page.goto("/");
  const app = appPage(page);
  const thread = page.getByRole("region", { name: "Conversa" });

  await app.send("Are you there?");
  const retry = thread.getByRole("button", { name: "Tentar de novo" });
  await expect(retry).toBeVisible();
  await retry.click();
  await expect(retry).toBeVisible();
  await retry.click();

  await expect(thread.getByText("Back online")).toBeVisible();
  await expect(thread.getByText("Are you there?")).toHaveCount(1);

  const ids = model.chatSendIds();
  expect(ids).toHaveLength(3);
  expect(ids[0]).toMatch(/^[A-Za-z0-9_-]{8,64}$/);
  expect(new Set(ids).size).toBe(1);

  // The stored message keeps one copy after a reload.
  await page.reload();
  await expect(thread.getByText("Are you there?")).toHaveCount(1);
});

test("a double submit stores one message and sends one request", async ({
  page,
  model,
}) => {
  model.queue({ text: "Once" });
  await page.goto("/");
  const app = appPage(page);
  const thread = page.getByRole("region", { name: "Conversa" });

  await app.composer.fill("Only once");
  // Two Enter presses in the same tick, before the composer re-renders.
  await app.composer.evaluate((el) => {
    for (let i = 0; i < 2; i += 1) {
      el.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Enter",
          bubbles: true,
          cancelable: true,
        }),
      );
    }
  });

  await expect(thread.getByText("Once", { exact: true })).toBeVisible();
  await expect(thread.getByText("Only once")).toHaveCount(1);
  expect(model.chatRequests()).toHaveLength(1);
});

test("two separate sends of the same text carry different ids", async ({
  page,
  model,
}) => {
  model.queue({ text: "One" }, { text: "Two" });
  await page.goto("/");
  const app = appPage(page);
  const thread = page.getByRole("region", { name: "Conversa" });

  await app.send("Same words");
  await expect(thread.getByText("One", { exact: true })).toBeVisible();
  await page.waitForTimeout(1700);
  await app.send("Same words");
  await expect(thread.getByText("Two", { exact: true })).toBeVisible();

  const ids = model.chatSendIds();
  expect(ids).toHaveLength(2);
  expect(ids[0]).not.toBe(ids[1]);
  await expect(thread.getByText("Same words")).toHaveCount(2);
});
