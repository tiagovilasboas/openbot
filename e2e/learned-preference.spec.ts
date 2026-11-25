import { appPage, expect, test } from "./app-fixture.ts";

const CORRECTION = "não, prefiro respostas curtas";
const SECOND = "não, prefiro respostas objetivas";

test("a stated preference is offered after the reply and saved on request", async ({
  page,
  model,
}) => {
  await page.goto("/");
  const app = appPage(page);
  const offer = page.getByRole("group", { name: "Salvar como preferência?" });

  // "Not now" hides the offer for that reply and writes nothing.
  await app.send(CORRECTION);
  await expect.poll(() => model.chatRequests().length).toBe(1);
  await expect(offer).toBeVisible();
  await offer.getByRole("button", { name: "Agora não" }).click();
  await expect(offer).toBeHidden();

  // The next correction is offered again; Save keeps it in the bot's memory.
  await app.send(SECOND);
  await expect.poll(() => model.chatRequests().length).toBe(2);
  await expect(offer).toBeVisible();
  await offer.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(offer).toBeHidden();

  await page.getByRole("button", { name: "Editar Chief of Staff" }).click();
  const dialog = page.getByRole("dialog", { name: "Editar bot" });
  await expect(dialog.getByText(SECOND)).toBeVisible();
});
