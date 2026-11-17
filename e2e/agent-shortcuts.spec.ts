import type { Page } from "@playwright/test";
import { appPage, expect, test } from "./app-fixture.ts";

/**
 * Opens the app and waits for the first bots sync to finish. A fresh browser
 * seeds the server with a PUT, and its answer sets the active agent again, so
 * a shortcut pressed before it lands would be undone.
 */
async function openChat(page: Page): Promise<void> {
  const seeded = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/bots") &&
      response.request().method() === "PUT",
  );
  await page.goto("/");
  await seeded;
}

test("Alt plus a digit switches to the Nth agent and focuses the composer", async ({
  page,
}) => {
  await openChat(page);
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

  // The caret is in the composer now, and the shortcut still works.
  await app.composer.press("Alt+Digit1");
  await expect(app.botRows().nth(0)).toHaveAttribute("aria-current", "page");
});

test("the shortcut works again and again without clicking anywhere", async ({
  page,
}) => {
  await openChat(page);
  const app = appPage(page);
  await expect(app.botRows()).toHaveCount(9);

  await page.keyboard.press("Alt+Digit2");
  await expect(app.botRows().nth(1)).toHaveAttribute("aria-current", "page");
  await expect(app.composer).toBeFocused();

  await page.keyboard.press("Alt+Digit3");
  await expect(app.botRows().nth(2)).toHaveAttribute("aria-current", "page");
  await expect(app.composer).toBeFocused();
  // The key switched the agent; it typed nothing.
  await expect(app.composer).toHaveValue("");
});

test("Alt plus a digit does nothing in any other text field", async ({
  page,
}) => {
  await openChat(page);
  const app = appPage(page);
  await expect(app.botRows()).toHaveCount(9);
  await page.evaluate(() => {
    for (const tag of ["input", "textarea", "select"]) {
      const field = document.createElement(tag);
      field.setAttribute("aria-label", `outside ${tag}`);
      document.body.append(field);
    }
    const editable = document.createElement("div");
    editable.setAttribute("contenteditable", "true");
    editable.setAttribute("aria-label", "outside editable");
    document.body.append(editable);
  });

  for (const name of [
    "outside input",
    "outside textarea",
    "outside select",
    "outside editable",
  ]) {
    await page.locator(`[aria-label="${name}"]`).focus();
    await page.keyboard.press("Alt+Digit3");
    await page.waitForTimeout(200);
    await expect(app.botRows().nth(0)).toHaveAttribute("aria-current", "page");
  }
});

test.describe("without a connected model", () => {
  test.use({ configuredModel: false });

  test("the shortcut stays locked with the agents", async ({ page }) => {
    await openChat(page);
    const app = appPage(page);
    await expect(app.botRows().nth(0)).toHaveAttribute("aria-current", "page");
    await page.keyboard.press("Alt+Digit3");
    await page.waitForTimeout(300);
    await expect(app.botRows().nth(0)).toHaveAttribute("aria-current", "page");
  });
});
