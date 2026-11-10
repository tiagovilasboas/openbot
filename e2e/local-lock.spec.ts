import { appPage, expect, test } from "./app-fixture.ts";

const PASSWORD = "e2e-pass-1";

test("a local password locks the app after a reload until the right one is typed", async ({
  page,
}) => {
  // PBKDF2 at 600000 iterations is slow on shared CI runners.
  test.setTimeout(90_000);
  await page.goto("/");
  const app = appPage(page);

  await app.openSettingsTab("Segurança");
  await page.getByLabel("Senha ou PIN", { exact: true }).fill(PASSWORD);
  await page.getByLabel("Confirmar senha ou PIN").fill(PASSWORD);
  await page.getByRole("button", { name: "Ativar proteção" }).click();
  await expect(page.getByText("Proteção por senha ativada.")).toBeVisible();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: /fechar/i }).click();
  await expect(dialog).toHaveCount(0);

  // Locking clears the session; the lock screen then survives a reload.
  await page.getByRole("button", { name: "Bloquear" }).click();
  const lockTitle = page.getByRole("heading", { name: "OpenBot bloqueado" });
  // Wait for the lock to apply before reloading, or a slow runner races it.
  await expect(lockTitle).toBeVisible();
  await page.reload();
  await expect(lockTitle).toBeVisible();
  await expect(app.botRows()).toHaveCount(0);

  await page.getByLabel("Senha ou PIN").fill("wrong-password");
  await page.getByRole("button", { name: "Desbloquear" }).click();
  await expect(
    page.getByText("Senha incorreta. Tente novamente."),
  ).toBeVisible();
  await expect(lockTitle).toBeVisible();

  await page.getByLabel("Senha ou PIN").fill(PASSWORD);
  await page.getByRole("button", { name: "Desbloquear" }).click();
  await expect(lockTitle).toHaveCount(0);
  await expect(app.botRows()).toHaveCount(9);
});
