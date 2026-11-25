import { appPage, expect, test } from "./app-fixture.ts";
import {
  stubCalls,
  stubToolCall,
  useStubInBrowser,
  useStubOnServer,
} from "./stub-model.ts";

// A group member whose tool needs approval pauses its turn: the room shows
// the same approval card as a 1:1 chat, and the decision resumes the member
// and then the rest of the group. The server calls the HTTP stub model, which
// playwright.config.ts vouches for as tool-capable (OPENBOT_TOOLS_NATIVE_MODELS).
const MODEL = "e2e-group-approval";

test.use({ realBotsStore: true, realSettingsStore: true });

test("a group member's tool call waits for approval, then the group goes on", async ({
  page,
  request,
  context,
}) => {
  await useStubOnServer(request, MODEL);
  await useStubInBrowser(context, MODEL);
  await stubToolCall(request, MODEL, "memory_add_note", { text: "likes tea" });
  await page.goto("/");
  await expect(appPage(page).botRows().first()).toBeVisible();

  // Security opts into tools.
  await page.getByRole("button", { name: "Editar Security" }).click();
  const editor = page.getByRole("dialog", { name: "Editar bot" });
  const toggle = editor.getByRole("switch", { name: "Ferramentas" });
  await toggle.click();
  await expect(toggle).toBeChecked();
  await editor.getByRole("button", { name: "Salvar bot" }).click();

  const sidebar = page.getByRole("group", { name: "Grupos" });
  await sidebar.getByRole("button", { name: "Novo grupo" }).click();
  const form = page.getByRole("dialog");
  await form.getByLabel("Nome").fill(`Aprovação ${Date.now().toString(36)}`);
  await form.getByRole("checkbox", { name: "Security" }).check();
  await form.getByRole("checkbox", { name: "Publishing" }).check();
  await form.getByRole("button", { name: "Salvar grupo" }).click();

  const room = page.getByRole("dialog");
  const composer = room.getByLabel("Mensagem para o grupo");
  await composer.fill("@Security @Publishing guardem isso");
  await composer.press("Enter");

  // Security asked for a tool: the card is in the timeline, and Publishing,
  // who answers after Security, has not spoken yet.
  const card = room.getByRole("region", {
    name: "O bot quer usar uma ferramenta",
  });
  await expect(card).toBeVisible();
  await expect(room.getByTestId("group-approval")).toContainText(
    "Security pede para usar uma ferramenta",
  );
  await expect(card).toContainText("Salvar uma nota na memória");
  await expect(card).toContainText("likes tea");
  const messages = room.getByTestId("group-message");
  await expect(messages).toHaveCount(1);

  await card.getByRole("button", { name: "Permitir uma vez" }).click();

  // Security continues with the tool result, then Publishing answers.
  await expect(card).toHaveCount(0);
  await expect(messages).toHaveCount(3);
  await expect(
    messages.filter({ hasText: /^SecurityStub answer/ }),
  ).toHaveCount(1);
  await expect(
    messages.filter({ hasText: /^PublishingStub answer/ }),
  ).toHaveCount(1);
  // Two model calls for Security (the tool request, then the answer) and one
  // for Publishing.
  expect(await stubCalls(request, MODEL)).toHaveLength(3);
  await expect(room.getByRole("button", { name: "Parar agora" })).toBeHidden();
});
