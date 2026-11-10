import { appPage, expect, test } from "./app-fixture.ts";

test("two messages sent quickly are both answered, in order", async ({
  page,
  model,
}) => {
  model.queue(
    { text: "Answer to one", delayMs: 700 },
    { text: "Answer to two" },
  );
  await page.goto("/");
  const app = appPage(page);

  await app.send("first question");
  // The first reply is still pending, so this one joins the queue.
  await app.send("second question");

  const turns = page
    .getByRole("region", { name: "Conversa" })
    .locator("article");
  await expect(turns).toHaveCount(4);
  await expect(turns.nth(0)).toContainText("first question");
  await expect(turns.nth(1)).toContainText("Answer to one");
  await expect(turns.nth(2)).toContainText("second question");
  await expect(turns.nth(3)).toContainText("Answer to two");
  expect(model.chatRequests()).toHaveLength(2);
});
