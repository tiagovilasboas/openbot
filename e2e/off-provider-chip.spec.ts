import { appPage, expect, test } from "./app-fixture.ts";

const SHOTS = process.env.OFF_PROVIDER_SHOTS ?? "test-results/off-provider";
const FREE_ID = "vendor/picked-model:free";

test("the composer chip warns while the model's provider is switched off", async ({
  page,
}) => {
  await page.route("**/api/model/free", (route) =>
    route.fulfill({
      json: {
        ok: true,
        source: "public",
        models: [{ id: FREE_ID, name: "Picked Model (free)" }],
      },
    }),
  );
  // A local model keeps the chat configured while OpenRouter is off.
  await page.addInitScript(() => {
    {
      localStorage.setItem(
        "openbot_model_config",
        JSON.stringify({
          provider: "local",
          baseUrl: "http://localhost:11434",
          model: "llama3",
        }),
      );
    }
  });
  await page.goto("/");
  const app = appPage(page);
  const pill = page
    .locator("header")
    .getByRole("button", { name: /Escolher modelo do bot/ });
  const chip = page.locator('button[data-tone][aria-haspopup="dialog"]');
  const picker = page.getByRole("dialog", { name: "Modelo deste bot" });

  // The bot picks an OpenRouter model; the chip is plain while it is on.
  await pill.click();
  await picker.getByRole("radio", { name: /Picked Model/ }).click();
  await expect(chip).toHaveAttribute("data-tone", "default");

  // Switching it off in Settings flips the chip live.
  await app.openSettingsTab("Conexões");
  await page.getByRole("button", { name: /^OpenRouter/ }).click();
  await page.getByRole("switch", { name: "Usar OpenRouter" }).click();
  await page.getByRole("button", { name: "Fechar configurações" }).click();
  await expect(chip).toHaveAttribute("data-tone", "warning");
  await expect(chip).toHaveAttribute("title", /OpenRouter está desativado/);
  await expect(chip).toHaveAccessibleName(/OpenRouter está desativado/);

  // Same width budget on a phone; the page does not scroll sideways.
  await page.setViewportSize({ width: 375, height: 760 });
  const box = await chip.boundingBox();
  expect(box?.width ?? 999).toBeLessThanOrEqual(136);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: `${SHOTS}-chip-375.png` });
  await page.setViewportSize({ width: 1280, height: 800 });

  // Tapping it still opens the picker.
  await chip.click();
  await expect(picker).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(picker).toBeHidden();

  // Back on, the warning clears.
  await app.openSettingsTab("Conexões");
  await page.getByRole("button", { name: /^OpenRouter/ }).click();
  await page.getByRole("switch", { name: "Usar OpenRouter" }).click();
  await page.getByRole("button", { name: "Fechar configurações" }).click();
  await expect(chip).toHaveAttribute("data-tone", "default");
});
