import { appPage, expect, test } from "./app-fixture.ts";

type ChatBody = { memory?: string[]; systemPrompt?: string };

test("a bot's memory is visible, sent as raw notes, editable and switchable", async ({
  page,
  model,
}) => {
  await page.goto("/");
  const app = appPage(page);
  const dialog = page.getByRole("dialog", { name: "Editar bot" });
  const note = dialog.getByRole("textbox", { name: "Nova anotação" });

  async function openMemory() {
    await page.getByRole("button", { name: "Editar Chief of Staff" }).click();
    await expect(
      dialog.getByText("As anotações ficam só neste aparelho"),
    ).toBeVisible();
  }
  async function closeDialog() {
    await dialog.getByRole("button", { name: "Cancelar" }).first().click();
    await expect(dialog).toBeHidden();
  }
  const lastBody = () => model.chatRequests().at(-1) as ChatBody;

  // Add a note: it is listed at once and saved without the bot's Save button.
  await openMemory();
  await note.fill("Prefiro respostas curtas");
  await note.press("Enter");
  await expect(dialog.getByText("Prefiro respostas curtas")).toBeVisible();
  await expect(dialog.getByText("1 de 30 anotações")).toBeVisible();
  await closeDialog();

  // The request carries the raw note; the server delimits it as data.
  await app.send("first question");
  await expect.poll(() => model.chatRequests().length).toBe(1);
  expect(lastBody().memory).toEqual(["Prefiro respostas curtas"]);
  expect(lastBody().systemPrompt ?? "").not.toContain("Prefiro respostas");

  // It survives a reload, and editing replaces the text.
  await page.reload();
  await openMemory();
  await dialog.getByRole("button", { name: "Editar", exact: true }).click();
  const editField = dialog.getByRole("textbox", { name: "Editar anotação" });
  await editField.fill("Prefiro respostas longas");
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(dialog.getByText("Prefiro respostas longas")).toBeVisible();
  await closeDialog();
  await app.send("second question");
  await expect.poll(() => model.chatRequests().length).toBe(2);
  expect(lastBody().memory).toEqual(["Prefiro respostas longas"]);

  // Switched off: nothing is sent, and the note stays on the device.
  await page.getByRole("button", { name: "Editar Chief of Staff" }).click();
  await dialog.getByRole("switch", { name: "Usar memória" }).click();
  await expect(
    dialog.getByRole("switch", { name: "Usar memória" }),
  ).toHaveAttribute("aria-checked", "false");
  await expect(dialog.getByText("Prefiro respostas longas")).toBeVisible();
  await closeDialog();
  await app.send("third question");
  await expect.poll(() => model.chatRequests().length).toBe(3);
  expect("memory" in lastBody()).toBe(false);

  // Back on, then delete the note: absent again.
  await page.getByRole("button", { name: "Editar Chief of Staff" }).click();
  await dialog.getByRole("switch", { name: "Usar memória" }).click();
  await dialog.getByRole("button", { name: "Excluir", exact: true }).click();
  await expect(dialog.getByText("Nenhuma anotação ainda.")).toBeVisible();
  await closeDialog();
  await app.send("fourth question");
  await expect.poll(() => model.chatRequests().length).toBe(4);
  expect("memory" in lastBody()).toBe(false);
});

test("clear all asks first and empties the memory", async ({ page }) => {
  await page.goto("/");
  const dialog = page.getByRole("dialog", { name: "Editar bot" });
  await page.getByRole("button", { name: "Editar Chief of Staff" }).click();
  const note = dialog.getByRole("textbox", { name: "Nova anotação" });
  await note.fill("Um");
  await note.press("Enter");
  await note.fill("Dois");
  await dialog.getByRole("button", { name: "Adicionar" }).click();
  await expect(dialog.getByText("2 de 30 anotações")).toBeVisible();

  await dialog.getByRole("button", { name: "Limpar tudo" }).click();
  await dialog
    .getByRole("alert")
    .getByRole("button", { name: "Cancelar" })
    .click();
  await expect(dialog.getByText("2 de 30 anotações")).toBeVisible();

  await dialog.getByRole("button", { name: "Limpar tudo" }).click();
  await dialog.getByRole("button", { name: "Apagar" }).click();
  await expect(dialog.getByText("Nenhuma anotação ainda.")).toBeVisible();
});
