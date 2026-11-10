import { appPage, expect, test } from "./app-fixture.ts";

test("bots are reordered by keyboard, the main bot stays on top and the order persists", async ({
  page,
}) => {
  await page.goto("/");
  const app = appPage(page);
  await expect(app.botRows().nth(0)).toContainText("Chief of Staff");
  await expect(app.botRows().nth(1)).toContainText("Engineering");
  await expect(app.botRows().nth(2)).toContainText("Publishing");

  // The main bot has no move handle: it cannot leave the top.
  await expect(
    page.getByRole("button", { name: "Reordenar Chief of Staff" }),
  ).toHaveCount(0);

  const handle = page.getByRole("button", { name: "Reordenar Engineering" });
  await handle.focus();
  await handle.press("ArrowDown");
  await expect(app.botRows().nth(1)).toContainText("Publishing");
  await expect(app.botRows().nth(2)).toContainText("Engineering");
  await expect(page.getByRole("status")).toContainText(
    "Engineering na posição 3 de 9",
  );
  // The handle keeps the focus, so the next arrow keeps moving the same bot.
  await expect(handle).toBeFocused();
  await handle.press("ArrowDown");
  await expect(app.botRows().nth(3)).toContainText("Engineering");

  // Pushing a bot up stops under the main bot.
  await handle.press("ArrowUp");
  await handle.press("ArrowUp");
  await handle.press("ArrowUp");
  await handle.press("ArrowUp");
  await expect(app.botRows().nth(0)).toContainText("Chief of Staff");
  await expect(app.botRows().nth(1)).toContainText("Engineering");

  await handle.press("ArrowDown");
  await expect(app.botRows().nth(2)).toContainText("Engineering");
  const order = await app.botRows().allInnerTexts();

  await page.reload();
  await expect(app.botRows()).toHaveCount(9);
  expect(await app.botRows().allInnerTexts()).toEqual(order);
  await expect(app.botRows().nth(0)).toContainText("Chief of Staff");
});

test("a bot is reordered by dragging its handle", async ({ page }) => {
  await page.goto("/");
  const app = appPage(page);
  await expect(app.botRows().nth(1)).toContainText("Engineering");

  const handle = page.getByRole("button", { name: "Reordenar Engineering" });
  await app.botRows().nth(1).hover();
  const from = await handle.boundingBox();
  const target = await app.botRows().nth(3).boundingBox();
  expect(from && target).toBeTruthy();

  await page.mouse.move(from!.x + from!.width / 2, from!.y + from!.height / 2);
  await page.mouse.down();
  await page.mouse.move(from!.x + 4, target!.y + target!.height - 4, {
    steps: 8,
  });
  await page.mouse.up();

  await expect(app.botRows().nth(0)).toContainText("Chief of Staff");
  await expect(app.botRows().nth(3)).toContainText("Engineering");
  await page.reload();
  await expect(app.botRows().nth(3)).toContainText("Engineering");
});

test("a bot's row shows it is replying while its turn is in flight", async ({
  page,
  model,
}) => {
  model.queue({ text: "Done.", delayMs: 1500 });
  await page.goto("/");
  const app = appPage(page);

  const working = page.getByTestId("bot-working-dot");
  await expect(working).toHaveCount(0);

  await app.send("Quick question");
  await expect(working).toHaveCount(1);
  // The state has a text label too, not only a coloured dot.
  await expect(
    page.getByRole("button", { name: /Chief of Staff.*respondendo/ }),
  ).toBeVisible();

  await expect(page.getByText("Done.")).toBeVisible();
  await expect(working).toHaveCount(0);
});
