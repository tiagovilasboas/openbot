import { appPage, expect, test } from "./app-fixture.ts";

type ChatBody = { modelId?: string };

test("the model badge opens a picker that saves the bot's model", async ({
  page,
  model,
}) => {
  await page.route("**/api/model/free", (route) =>
    route.fulfill({
      json: {
        ok: true,
        source: "public",
        models: [
          { id: "openrouter/free", name: "Auto Free Router" },
          { id: "vendor/picked:free", name: "Picked Model (free)" },
        ],
      },
    }),
  );
  await page.goto("/");
  const app = appPage(page);
  const picker = page.getByRole("dialog", { name: "Modelo deste bot" });

  await page.getByRole("button", { name: /Escolher modelo do bot/ }).click();
  await expect(
    picker.getByRole("radio", { name: /Modelo padrão das Configurações/ }),
  ).toHaveAttribute("aria-checked", "true");

  await picker.getByRole("radio", { name: /Picked Model/ }).click();
  await expect(picker).toBeHidden();
  await expect(
    page.getByRole("status").filter({ hasText: "usa agora" }),
  ).toContainText("vendor/picked:free");
  await expect(
    page.getByRole("button", { name: /vendor\/picked:free/ }).first(),
  ).toBeVisible();

  await app.send("hello");
  await expect(page.getByText("Stub reply").first()).toBeVisible();
  expect((model.chatRequests()[0] as ChatBody).modelId).toBe(
    "vendor/picked:free",
  );

  // The choice is marked next time, and can be cleared back to the default.
  await page.getByRole("button", { name: /Escolher modelo do bot/ }).click();
  await expect(
    picker.getByRole("radio", { name: /Picked Model/ }),
  ).toHaveAttribute("aria-checked", "true");

  await picker.getByRole("textbox", { name: "Outro modelo (id)" }).fill("não");
  await picker.getByRole("button", { name: "Usar este modelo" }).click();
  await expect(picker.getByRole("alert")).toContainText("Use só letras");

  await picker
    .getByRole("radio", { name: /Modelo padrão das Configurações/ })
    .click();
  await app.send("again");
  await expect.poll(() => model.chatRequests().length).toBe(2);
  expect("modelId" in (model.chatRequests()[1] as ChatBody)).toBe(false);
});

test("a model picked mid-reply waits for the next message", async ({
  page,
  model,
}) => {
  await page.route("**/api/model/free", (route) =>
    route.fulfill({ json: { ok: true, source: "public", models: [] } }),
  );
  model.queue({ text: "Slow answer", delayMs: 3000 });
  await page.goto("/");
  const app = appPage(page);
  const picker = page.getByRole("dialog", { name: "Modelo deste bot" });

  await app.send("first question");
  await expect.poll(() => model.chatRequests().length).toBe(1);
  expect("modelId" in (model.chatRequests()[0] as ChatBody)).toBe(false);

  await page.getByRole("button", { name: /Escolher modelo do bot/ }).click();
  await picker
    .getByRole("textbox", { name: "Outro modelo (id)" })
    .fill("vendor/next:free");
  await picker.getByRole("button", { name: "Usar este modelo" }).click();

  await expect(
    page.getByRole("status").filter({ hasText: "a próxima usa" }),
  ).toContainText("vendor/next:free");
  await expect(
    page.getByRole("button", { name: /próximo: .*vendor\/next:free/ }).first(),
  ).toBeVisible();

  // The reply in flight ends on its model; the badge then drops "next".
  await expect(page.getByText("Slow answer").first()).toBeVisible();
  await expect(page.getByRole("button", { name: /próximo:/ })).toHaveCount(0);

  await app.send("second question");
  await expect.poll(() => model.chatRequests().length).toBe(2);
  expect((model.chatRequests()[1] as ChatBody).modelId).toBe(
    "vendor/next:free",
  );
});

test("the composer chip picks a model for the next turn on a phone", async ({
  page,
  model,
}) => {
  await page.route("**/api/model/free", (route) =>
    route.fulfill({
      json: {
        ok: true,
        source: "public",
        models: [{ id: "vendor/picked:free", name: "Picked Model (free)" }],
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
  const app = appPage(page);
  const picker = page.getByRole("dialog", { name: "Modelo deste bot" });
  await app.send("hello");
  await expect(page.getByText("Stub reply").first()).toBeVisible();

  const chip = page.getByRole("button", { name: /^Modelo do bot: .* Trocar$/ });
  await expect(chip).toBeVisible();
  const box = await app.composer.boundingBox();
  const chipBox = await chip.boundingBox();
  expect(chipBox && box && chipBox.x + chipBox.width <= 375).toBe(true);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);

  await chip.focus();
  await page.keyboard.press("Enter");
  await picker.getByRole("radio", { name: /Picked Model/ }).click();
  await expect(picker).toBeHidden();
  await expect(
    page.getByRole("button", { name: /Modelo do bot: .*vendor\/picked:free/ }),
  ).toContainText("picked:free");
  await page.screenshot({ path: "test-results/composer-model-chip-375.png" });

  await app.send("again");
  await expect.poll(() => model.chatRequests().length).toBe(2);
  expect((model.chatRequests()[1] as ChatBody).modelId).toBe(
    "vendor/picked:free",
  );
});

test.describe("without a model", () => {
  test.use({ configuredModel: false });

  test("the composer chip says Conectar and stays locked with the composer", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(
      page.getByRole("button", { name: "Conectar um modelo" }),
    ).toBeDisabled();
  });
});
