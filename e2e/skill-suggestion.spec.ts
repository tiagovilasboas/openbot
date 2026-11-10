import { appPage, expect, test } from "./app-fixture.ts";

const SUGGEST = "Sugerir uma skill a partir das conversas deste bot";

const draft = {
  name: "Revisão de código",
  command: "/revisao-de-codigo",
  description: "Revisa diffs procurando riscos",
  instructions: "Leia o diff e liste os riscos primeiro.",
};

type SuggestBody = { language: string; messages: string[] };

test("a skill is suggested from the bot's own chats and added only on accept", async ({
  page,
  context,
  model,
}) => {
  const requests: SuggestBody[] = [];
  let delayMs = 0;
  await context.route("**/api/skills/suggest", async (route) => {
    requests.push(route.request().postDataJSON() as SuggestBody);
    if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
    await route.fulfill({ json: { skill: draft } }).catch(() => undefined);
  });

  await page.goto("/");
  const app = appPage(page);
  const dialog = page.getByRole("dialog", { name: "Editar bot" });
  const skills = dialog.getByRole("region", { name: "Skills" });

  async function openEditor() {
    await page.getByRole("button", { name: "Editar Chief of Staff" }).click();
    await expect(dialog).toBeVisible();
  }

  // With fewer than five messages nothing is sent and the reason is plain.
  await openEditor();
  await dialog.getByRole("button", { name: SUGGEST }).click();
  await expect(dialog.getByRole("alert")).toContainText(
    "pelo menos 5 mensagens",
  );
  expect(requests).toHaveLength(0);
  await dialog.getByRole("button", { name: "Cancelar" }).first().click();
  await expect(dialog).toBeHidden();

  // Five exchanges later the button reads only what the user wrote.
  model.queue(...[1, 2, 3, 4, 5].map((n) => ({ text: `Resposta ${n}` })));
  for (let n = 1; n <= 5; n++) {
    await app.send(`revise este diff ${n}`);
    await expect(page.getByText(`Resposta ${n}`)).toBeVisible();
  }
  await openEditor();

  // Thinking can be cancelled, and then nothing is left over.
  delayMs = 3_000;
  await dialog.getByRole("button", { name: SUGGEST }).click();
  await expect(dialog.getByText("Lendo suas conversas")).toBeVisible();
  await dialog.getByRole("button", { name: "Cancelar" }).first().click();
  await expect(dialog.getByRole("button", { name: SUGGEST })).toBeVisible();
  await expect(dialog.getByText("Skill sugerida")).toHaveCount(0);

  // The draft appears; discarding adds nothing.
  delayMs = 0;
  await dialog.getByRole("button", { name: SUGGEST }).click();
  const card = dialog.getByRole("group", { name: "Skill sugerida" });
  await expect(card).toContainText("Revisão de código");
  await expect(card).toContainText("/revisao-de-codigo");
  await card.getByRole("button", { name: "Descartar" }).click();
  await expect(card).toHaveCount(0);
  await expect(skills.getByRole("listitem")).toHaveCount(0);

  // Accepting adds a normal skill with the "Sugerida" badge.
  await dialog.getByRole("button", { name: SUGGEST }).click();
  await card.getByRole("button", { name: "Adicionar skill" }).click();
  const added = skills.getByRole("listitem");
  await expect(added).toHaveCount(1);
  await expect(added).toContainText("Revisão de código");
  await expect(added).toContainText("/revisao-de-codigo");
  await expect(added.getByText("Sugerida", { exact: true })).toBeVisible();

  // Only the user's five messages travelled, never the model's replies.
  const body = requests.at(-1);
  expect(body?.messages).toEqual(
    [1, 2, 3, 4, 5].map((n) => `revise este diff ${n}`),
  );
  expect(body?.language).toBe("pt");

  // It is kept with the bot, badge included.
  await dialog.getByRole("button", { name: "Salvar bot" }).click();
  await expect(dialog).toBeHidden();
  await page.reload();
  await openEditor();
  await expect(skills.getByText("Sugerida", { exact: true })).toBeVisible();
});
