import { expect, test } from "./app-fixture.ts";

const SPANISH_HEADING = "¿Cómo puede ayudarte Chief of Staff hoy?";

test("the language switch offers Spanish and it survives a reload", async ({
  page,
}) => {
  await page.goto("/");
  const switcher = page.getByRole("group", { name: "Idioma" });
  await expect(switcher.getByRole("button", { name: "ES" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );

  await switcher.getByRole("button", { name: "ES" }).click();
  await expect(
    page.getByRole("heading", { name: SPANISH_HEADING }),
  ).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "es-419");
  await expect(
    page.getByRole("textbox", { name: "mensaje para OpenBot" }),
  ).toBeVisible();

  await page.reload();
  await expect(
    page.getByRole("heading", { name: SPANISH_HEADING }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("group", { name: "Idioma" })
      .getByRole("button", { name: "ES" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("html")).toHaveAttribute("lang", "es-419");
});

test("the Settings sheet shows Spanish and the crew is asked to answer in it", async ({
  page,
  model,
}) => {
  model.queue({ text: "Respuesta de prueba" });
  await page.goto("/");
  await page
    .getByRole("group", { name: "Idioma" })
    .getByRole("button", { name: "ES" })
    .click();

  await page.getByRole("button", { name: "Configuración" }).first().click();
  await expect(
    page.getByRole("heading", { name: "Configuración de OpenBot" }),
  ).toBeVisible();
  await expect(page.getByRole("tab", { name: "Seguridad" })).toBeVisible();
  await page.getByRole("button", { name: "Cerrar configuración" }).click();

  const composer = page.getByRole("textbox", { name: "mensaje para OpenBot" });
  await composer.fill("Hola equipo");
  await composer.press("Enter");
  await expect(
    page
      .getByRole("region", { name: "Conversación" })
      .getByText("Respuesta de prueba"),
  ).toBeVisible();

  const [request] = model.chatRequests() as Array<{
    language?: string;
    systemPrompt?: string;
  }>;
  expect(request?.language).toBe("es");
});
