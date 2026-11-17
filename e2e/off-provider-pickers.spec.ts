import { appPage, expect, test } from "./app-fixture.ts";

const SHOTS = process.env.OFF_PROVIDER_SHOTS ?? "test-results/off-provider";
const FREE_ID = "vendor/picked-model:free";

test("a switched-off provider leaves the Model form and the bot picker, and returns when on", async ({
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
  // Taps at desktop size (the sidebar holds Settings); sizes the shot at 375.
  async function phoneShot(name: string) {
    await page.setViewportSize({ width: 375, height: 760 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({ path: `${SHOTS}-${name}-375.png` });
    await page.setViewportSize({ width: 1280, height: 800 });
  }
  const pill = page
    .locator("header")
    .getByRole("button", { name: /Escolher modelo do bot/ });
  const picker = page.getByRole("dialog", { name: "Modelo deste bot" });

  // On: the bot picks an OpenRouter model.
  await pill.click();
  await picker.getByRole("radio", { name: /Picked Model/ }).click();
  await expect(picker).toBeHidden();

  // Switch OpenRouter off in Connections.
  await app.openSettingsTab("Conexões");
  await page.getByRole("button", { name: /OpenRouter/ }).click();
  const toggle = page.getByRole("switch", { name: "Usar OpenRouter" });
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-checked", "false");

  // Model form: OpenRouter is disabled with the reason and a way back.
  await page.getByRole("tab", { name: "Modelo" }).click();
  const row = page
    .getByRole("radiogroup", { name: "Provedor de IA" })
    .getByRole("radio", { name: /Roteador/ });
  await expect(row).toBeDisabled();
  await expect(row).toContainText("Desativado em Conexões");
  await expect(page.getByTestId("off-provider-notice")).toBeVisible();
  await phoneShot("model-form");
  await page.getByRole("button", { name: "Abrir conexões" }).click();
  await expect(page.getByRole("tab", { name: "Conexões" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await page.getByRole("button", { name: "Fechar configurações" }).click();

  // Bot picker: no OpenRouter models, a notice, and the warning on the bot.
  await pill.click();
  await expect(picker).toBeVisible();
  await expect(picker.getByRole("radio", { name: /Picked Model/ })).toHaveCount(
    0,
  );
  await expect(picker.getByText(/OpenRouter está desativado/)).toBeVisible();
  await expect(
    picker.getByText(/Este modelo usa OpenRouter, que está desativado/),
  ).toBeVisible();
  await phoneShot("picker");
  await page.keyboard.press("Escape");
  await expect(picker).toBeHidden();

  // On again: models are back and the warning is gone.
  await app.openSettingsTab("Conexões");
  await page.getByRole("button", { name: /OpenRouter/ }).click();
  await page.getByRole("switch", { name: "Usar OpenRouter" }).click();
  await page.getByRole("button", { name: "Fechar configurações" }).click();
  await pill.click();
  await expect(
    picker.getByRole("radio", { name: /Picked Model/ }),
  ).toBeVisible();
  await expect(picker.getByTestId("off-provider-notice")).toHaveCount(0);
});
