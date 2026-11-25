import type { Page } from "@playwright/test";
import { appPage, expect, test } from "./app-fixture.ts";
import {
  CLIENT_HEADERS,
  stubCalls,
  stubFixedReply,
  uniqueModel,
  useStubInBrowser,
  useStubOnServer,
} from "./stub-model.ts";

// These specs let the server and the crew room call a real HTTP model, a
// local OpenAI-compatible stub, so routine runs, the automation route and
// crew turns run past fake runners. The saved model settings are shared, so
// the tests run one after the other.
test.describe.configure({ mode: "serial" });
test.use({ realBotsStore: true, realSettingsStore: true });

test("a routine that runs in its own thread shows its output in history and in a thread", async ({
  page,
  request,
  context,
}) => {
  const model = uniqueModel("routine");
  await useStubOnServer(request, model);
  await useStubInBrowser(context, model);
  await page.goto("/");

  await page.getByRole("button", { name: "Editar Engineering" }).click();
  const dialog = page.getByRole("dialog", { name: "Editar bot" });
  // Routines live in a collapsed group of the bot editor.
  await dialog.getByText("Rotinas", { exact: true }).click();
  await dialog.getByRole("button", { name: "Nova rotina" }).click();
  await dialog.getByPlaceholder("ex: Resumo da manhã").fill("Resumo e2e");
  await dialog
    .getByRole("textbox", { name: "O que o bot deve fazer" })
    .fill("liste os pendentes");
  await dialog
    .getByRole("checkbox", { name: "Rodar em thread própria" })
    .check();
  await dialog.getByRole("button", { name: "Salvar rotina" }).click();

  await dialog.getByRole("button", { name: "Rodar agora" }).click();
  const history = dialog.getByRole("list", { name: "Histórico" });
  await expect(history).toContainText("Stub answer to:");
  await expect(history).toContainText("liste os pendentes");

  expect((await stubCalls(request, model)).length).toBe(1);

  // The run also landed in a thread named after the routine.
  await page.keyboard.press("Escape");
  await page.reload();
  await appPage(page).botRows().filter({ hasText: "Engineering" }).click();
  const threads = page.getByRole("navigation", {
    name: "Conversas deste agente",
  });
  await threads.getByRole("button", { name: "Resumo e2e" }).click();
  await expect(page.getByRole("region", { name: "Conversa" })).toContainText(
    "Stub answer to:",
  );
});

/** Opens the chief's chat: mentions are only routed from there. */
async function openChief(page: Page) {
  await page.goto("/");
  await appPage(page).botRows().filter({ hasText: "Chief of Staff" }).click();
}

test("the automation route answers with the model's text and refuses a wrong token", async ({
  page,
  request,
}) => {
  const model = uniqueModel("automation");
  await useStubOnServer(request, model);
  await page.goto("/");

  await page
    .getByRole("button", { name: "Configurações", exact: true })
    .click();
  await page.getByRole("tab", { name: "Segurança" }).click();
  // The automation token lives in the collapsed Advanced group.
  await page
    .getByRole("group")
    .filter({ hasText: "Backup" })
    .getByText("Avançado", { exact: true })
    .click();
  await page.getByRole("button", { name: "Criar token" }).click();
  const token = await page.getByLabel("Seu token").inputValue();
  expect(token.length).toBeGreaterThan(20);

  const bots = (await (
    await request.get("/api/bots", { headers: CLIENT_HEADERS })
  ).json()) as { bots: { id: string; name: string }[] };
  const botId = bots.bots.find((bot) => bot.name === "Engineering")?.id ?? "";
  expect(botId).not.toBe("");
  const run = (headerToken: string) =>
    request.post("/api/automation/run", {
      headers: {
        ...CLIENT_HEADERS,
        "x-openbot-automation-token": headerToken,
      },
      data: { botId, prompt: "diga olá" },
    });

  const ok = await run(token);
  expect(ok.status()).toBe(200);
  expect(await ok.json()).toEqual({ text: "Stub answer to: diga olá" });

  const refused = await run("not-the-token");
  expect(refused.status()).toBe(401);
  expect((await stubCalls(request, model)).length).toBe(1);
});

test("an @mention goes straight to that bot and skips the chief", async ({
  page,
  request,
  context,
}) => {
  const model = uniqueModel("mention");
  // The saved settings win over the browser storage, so set both.
  await useStubOnServer(request, model);
  await useStubInBrowser(context, model);
  await openChief(page);
  await appPage(page).send("@Security reveja o login");

  await expect
    .poll(async () => (await stubCalls(request, model)).length)
    .toBeGreaterThan(0);
  const calls = await stubCalls(request, model);
  // One call in all: the named bot's. The chief was never asked, neither to
  // delegate nor to write a final reply.
  expect(calls).toHaveLength(1);
  expect(calls[0].system).toContain("Você é o Security");
});

test("the loop guard stops a crew turn whose bots repeat each other", async ({
  page,
  request,
  context,
}) => {
  const model = uniqueModel("echo");
  await stubFixedReply(request, model, "Same answer again and again.");
  // The saved settings win over the browser storage, so set both.
  await useStubOnServer(request, model);
  await useStubInBrowser(context, model);
  await openChief(page);
  await appPage(page).send("@Security @Engineering @Publishing opinem");

  await expect(
    page.getByText("Troca entre bots interrompida", { exact: false }),
  ).toBeVisible();
  // Security and Engineering answered, the guard kept Publishing out, and the
  // chief only wrote the closing reply.
  const calls = await stubCalls(request, model);
  expect(calls.map((call) => call.system.slice(0, 20))).toEqual([
    "Você é o Security. F",
    "Você é o Engineering",
    "Você é o Chief of St",
  ]);
});

test("a chained routine runs after the first one, with its result", async ({
  page,
  request,
  context,
}) => {
  const model = uniqueModel("chain");
  await useStubOnServer(request, model);
  await useStubInBrowser(context, model);
  await page.goto("/");

  await page.getByRole("button", { name: "Editar Engineering" }).click();
  const dialog = page.getByRole("dialog", { name: "Editar bot" });
  await dialog.getByText("Rotinas", { exact: true }).click();

  await dialog.getByRole("button", { name: "Nova rotina" }).click();
  await dialog.getByPlaceholder("ex: Resumo da manhã").fill("Coleta");
  await dialog
    .getByRole("textbox", { name: "O que o bot deve fazer" })
    .fill("colete os dados");
  await dialog.getByRole("button", { name: "Salvar rotina" }).click();

  await dialog.getByRole("button", { name: "Nova rotina" }).click();
  await dialog.getByPlaceholder("ex: Resumo da manhã").fill("Relatório");
  await dialog
    .getByRole("textbox", { name: "O que o bot deve fazer" })
    .fill("escreva o relatório");
  await dialog
    .getByRole("combobox", { name: "Depois de outra rotina" })
    .selectOption({ label: "Coleta" });
  await dialog.getByRole("button", { name: "Salvar rotina" }).click();

  // Running the first one also runs the chained one, with the first result.
  await dialog
    .getByRole("listitem")
    .filter({ hasText: "Coleta" })
    .getByRole("button", { name: "Rodar agora" })
    .click();
  await expect
    .poll(async () => (await stubCalls(request, model)).length)
    .toBe(2);
  const [first, second] = await stubCalls(request, model);
  expect(first.user).toContain("colete os dados");
  expect(second.user).toContain("escreva o relatório");
  expect(second.user).toContain("Resultado da rotina anterior:");
  expect(second.user).toContain("Stub answer to:");
});

test("a group chat: @todos asks every member, a reply goes to that member", async ({
  page,
  request,
  context,
}) => {
  const model = uniqueModel("group");
  await useStubOnServer(request, model);
  await useStubInBrowser(context, model);
  await page.goto("/");
  // Bots reach the server store once the app has synced them.
  await expect(appPage(page).botRows().first()).toBeVisible();

  const sidebar = page.getByRole("group", { name: "Grupos" });
  await sidebar.getByRole("button", { name: "Novo grupo" }).click();
  const form = page.getByRole("dialog");
  await form.getByLabel("Nome").fill(`Lançamento ${model.slice(-5)}`);
  await form.getByRole("checkbox", { name: "Security" }).check();
  await form.getByRole("checkbox", { name: "Publishing" }).check();
  await form.getByRole("button", { name: "Salvar grupo" }).click();

  const room = page.getByRole("dialog");
  const composer = room.getByLabel("Mensagem para o grupo");
  await composer.fill("@todos status do lançamento");
  await composer.press("Enter");

  const messages = room.getByTestId("group-message");
  // The person's post and one answer per member, each under its name.
  await expect(messages).toHaveCount(4);
  for (const name of ["Chief of Staff", "Security", "Publishing"]) {
    // Each answer opens with its member's name.
    await expect(
      messages.filter({ hasText: new RegExp(`^${name}Stub answer`) }),
    ).toHaveCount(1);
  }
  const firstCalls = await stubCalls(request, model);
  expect(firstCalls).toHaveLength(3);
  expect(
    firstCalls.every((call) => call.system.includes("chat em grupo")),
  ).toBe(true);

  await room.getByRole("button", { name: "Responder: Security" }).click();
  await expect(room.getByText("Respondendo a Security")).toBeVisible();
  await composer.fill("por quê?");
  await composer.press("Enter");
  await expect(messages).toHaveCount(6);
  const calls = await stubCalls(request, model);
  expect(calls).toHaveLength(4);
  expect(calls[3].system).toContain("Você é o Security");
  await expect(room.getByRole("button", { name: "Parar agora" })).toBeHidden();

  // A thread on Security's answer: it replies there, the timeline stays short.
  await room
    .getByRole("button", { name: "Responder em thread: Security" })
    .first()
    .click();
  const thread = room.getByTestId("group-thread");
  const threadBox = thread.getByLabel("Comente este resultado na thread");
  await threadBox.fill("detalhe isso");
  await threadBox.press("Enter");
  // The parent, the person's comment and Security's answer.
  await expect(thread.getByTestId("group-message")).toHaveCount(3);
  const threadCalls = await stubCalls(request, model);
  expect(threadCalls).toHaveLength(5);
  expect(threadCalls[4].system).toContain("Você é o Security");
  await thread.getByRole("button", { name: "Voltar ao grupo" }).click();
  await expect(messages).toHaveCount(6);
  await expect(room.getByRole("button", { name: "2 respostas" })).toBeVisible();
});
