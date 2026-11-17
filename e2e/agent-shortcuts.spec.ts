import { appPage, expect, test } from "./app-fixture.ts";

test("Alt plus a digit switches to the Nth agent and focuses the composer", async ({
  page,
}) => {
  await page.goto("/");
  const app = appPage(page);
  await expect(app.botRows()).toHaveCount(9);
  await expect(app.botRows().nth(0)).toHaveAttribute("aria-current", "page");
  await expect(app.botRows().nth(0)).toHaveAttribute(
    "aria-keyshortcuts",
    "Alt+1",
  );

  await page.keyboard.press("Alt+Digit3");
  await expect(app.botRows().nth(2)).toHaveAttribute("aria-current", "page");
  await expect(app.botRows().nth(0)).not.toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(app.composer).toBeFocused();

  // Typing in the composer is never hijacked.
  await app.composer.press("Alt+Digit1");
  await expect(app.botRows().nth(2)).toHaveAttribute("aria-current", "page");

  // Out of the field, the shortcut works again, back to the first agent.
  await page.locator("body").click({ position: { x: 1, y: 1 } });
  await page.keyboard.press("Alt+Digit1");
  await expect(app.botRows().nth(0)).toHaveAttribute("aria-current", "page");
});

test.describe("without a connected model", () => {
  test.use({ configuredModel: false });

  test("the shortcut stays locked with the agents", async ({ page }) => {
    await page.goto("/");
    const app = appPage(page);
    await expect(app.botRows().nth(0)).toHaveAttribute("aria-current", "page");
    await page.keyboard.press("Alt+Digit3");
    await page.waitForTimeout(300);
    await expect(app.botRows().nth(0)).toHaveAttribute("aria-current", "page");
  });
});
