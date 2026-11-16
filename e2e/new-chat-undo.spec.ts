import { appPage, expect, test } from "./app-fixture.ts";

test("New chat can be undone and the thread comes back after a reload", async ({
  page,
  model,
}) => {
  model.queue({ text: "Answer one" });
  await page.goto("/");
  const app = appPage(page);

  await app.send("first question");
  await expect(page.getByText("Answer one")).toBeVisible();

  await page.getByRole("button", { name: "Nova conversa" }).first().click();
  await expect(page.getByText("Answer one")).toHaveCount(0);
  const notice = page
    .getByRole("status")
    .filter({ hasText: "Conversa limpa." });
  await expect(notice).toBeVisible();

  await notice.getByRole("button", { name: "Desfazer" }).click();
  await expect(page.getByText("first question")).toBeVisible();
  await expect(page.getByText("Answer one")).toBeVisible();
  await expect(page.getByText("Conversa limpa.")).toHaveCount(0);

  // The restore is stored, not only shown.
  await page.reload();
  await expect(page.getByText("Answer one")).toBeVisible();
});

test("sending after New chat closes the undo window", async ({
  page,
  model,
}) => {
  model.queue({ text: "Answer one" }, { text: "Answer two" });
  await page.goto("/");
  const app = appPage(page);

  await app.send("first question");
  await expect(page.getByText("Answer one")).toBeVisible();

  await page.getByRole("button", { name: "Nova conversa" }).first().click();
  await expect(page.getByText("Conversa limpa.")).toBeVisible();

  await app.send("second question");
  await expect(page.getByText("Answer two")).toBeVisible();
  await expect(page.getByText("Conversa limpa.")).toHaveCount(0);
  await expect(page.getByText("Answer one")).toHaveCount(0);
});
