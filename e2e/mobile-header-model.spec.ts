import { expect, test } from "./app-fixture.ts";

const SHOTS = process.env.HEADER_SHOTS ?? "test-results/mobile-header";
const LONG_ID = "vendor/a-very-long-model-name-for-phones:free";

test("the phone header shows a tappable model status that opens the picker", async ({
  page,
}) => {
  await page.route("**/api/model/free", (route) =>
    route.fulfill({
      json: {
        ok: true,
        source: "public",
        models: [{ id: LONG_ID, name: "Picked Model (free)" }],
      },
    }),
  );
  await page.addInitScript(() =>
    localStorage.setItem(
      "openbot_model_config",
      JSON.stringify({
        provider: "router",
        baseUrl: "https://openrouter.ai/api/v1",
        model: "openrouter/free",
      }),
    ),
  );
  await page.setViewportSize({ width: 375, height: 760 });
  await page.goto("/");
  const noOverflow = () =>
    page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    );

  const pill = page
    .locator("header")
    .getByRole("button", { name: /Escolher modelo do bot/ });
  await expect(pill).toBeVisible();
  const box = await pill.boundingBox();
  expect(box && box.height >= 44 && box.x + box.width <= 375).toBe(true);
  expect(await noOverflow()).toBe(true);
  await page.screenshot({ path: `${SHOTS}-closed.png` });

  await pill.click();
  const picker = page.getByRole("dialog", { name: "Modelo deste bot" });
  await expect(picker).toBeVisible();
  await expect(
    picker.getByRole("radio", { name: /Picked Model/ }),
  ).toBeVisible();
  expect(await noOverflow()).toBe(true);
  const sheet = await picker.boundingBox();
  expect(sheet && sheet.x >= 0 && sheet.x + sheet.width <= 375).toBe(true);
  await page.screenshot({ path: `${SHOTS}-picker.png` });

  await picker.getByRole("radio", { name: /Picked Model/ }).click();
  await expect(picker).toBeHidden();
  await expect(pill).toHaveAttribute("title", /vendor\/a-very-long-model-name/);
  await expect(page.locator("header")).toContainText("Chief of Staff");
  const after = await pill.boundingBox();
  expect(after && after.x + after.width <= 375).toBe(true);
  await page.screenshot({ path: `${SHOTS}-picked.png` });
});
