import { appPage, expect, test } from "./app-fixture.ts";
import { stubGrants } from "./tool-grants-stub.ts";
import { toolEvents as ev } from "./tools-stub.ts";

const TURN = "0f8e6c2a-1b2c-4d5e-8f90-123456789abc";
const NOTE_CALL = {
  callId: "c1",
  name: "memory_add_note",
  preview: "gosta de chá",
  argsDigest: "a".repeat(64),
  allowAlways: true,
};

test("settings list always-allow grants; a revoke makes the next call ask", async ({
  page,
  context,
  model,
}) => {
  const grants = await stubGrants(context, [
    {
      botId: "engineering",
      toolName: "memory_add_note",
      grantedAt: Date.now(),
    },
    { botId: "engineering", toolName: "github_list_open_items", grantedAt: 1 },
  ]);
  await page.goto("/");
  const app = appPage(page);
  await app.openSettingsTab("Segurança");

  const section = page.getByRole("region", {
    name: "Ferramentas sempre permitidas",
  });
  const items = section.getByRole("listitem");
  await expect(items).toHaveCount(2);
  await expect(items.first()).toContainText("Engineering");
  await expect(items.first()).toContainText("Permitida em");

  await section
    .getByRole("button", {
      name: "Revogar Salvar uma nota na memória para Engineering",
    })
    .click();
  await expect(items).toHaveCount(1);
  expect(grants.revokes()).toEqual([
    { botId: "engineering", toolName: "memory_add_note" },
  ]);

  // The next call of the revoked tool asks again.
  await page.getByRole("button", { name: "Fechar configurações" }).click();
  await page.getByRole("button", { name: "Editar Engineering" }).click();
  const dialog = page.getByRole("dialog", { name: "Editar bot" });
  await dialog.getByRole("switch", { name: "Ferramentas" }).click();
  await dialog.getByRole("button", { name: "Salvar bot" }).click();
  await app.botRows().filter({ hasText: "Engineering" }).click();
  model.tools.queue({
    events: [
      ev.call("c1", "memory_add_note", "gosta de chá"),
      ev.approval(TURN, [NOTE_CALL], Date.now() + 15 * 60_000),
    ],
  });
  await app.send("lembra que eu gosto de chá");
  await expect(
    page.getByRole("region", { name: "O bot quer usar uma ferramenta" }),
  ).toBeVisible();

  // Revoke all empties the list.
  await app.openSettingsTab("Segurança");
  await section.getByRole("button", { name: "Revogar todas" }).click();
  await expect(
    section.getByText("Nenhuma ferramenta está sempre"),
  ).toBeVisible();
  expect(grants.revokes().at(-1)).toEqual({ all: true });
});
