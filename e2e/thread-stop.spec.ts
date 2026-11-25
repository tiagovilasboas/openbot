import { appPage, expect, test } from "./app-fixture.ts";
import {
  stubCalls,
  stubFixedReply,
  stubHang,
  uniqueModel,
  useStubInBrowser,
  useStubOnServer,
} from "./stub-model.ts";

// Stop inside a group thread ends the member's reply that is still coming and
// gives the thread back: the composer takes a new comment right away.
test.use({ realBotsStore: true, realSettingsStore: true });

test("Stop in a group thread ends a slow reply and frees the composer", async ({
  page,
  request,
  context,
}) => {
  const model = uniqueModel("thread-stop");
  await useStubOnServer(request, model);
  await useStubInBrowser(context, model);
  await stubFixedReply(request, model, "Complete answer from the stub");
  await page.goto("/");
  await expect(appPage(page).botRows().first()).toBeVisible();

  const sidebar = page.getByRole("group", { name: "Grupos" });
  await sidebar.getByRole("button", { name: "Novo grupo" }).click();
  const form = page.getByRole("dialog");
  await form.getByLabel("Nome").fill(`Parada ${model.slice(-5)}`);
  await form.getByRole("checkbox", { name: "Security" }).check();
  await form.getByRole("checkbox", { name: "Publishing" }).check();
  await form.getByRole("button", { name: "Salvar grupo" }).click();

  const room = page.getByRole("dialog");
  const composer = room.getByLabel("Mensagem para o grupo");
  await composer.fill("@Security status");
  await composer.press("Enter");
  await expect(room.getByTestId("group-message")).toHaveCount(2);

  await room
    .getByRole("button", { name: "Responder em thread: Security" })
    .first()
    .click();
  const thread = room.getByTestId("group-thread");
  const box = thread.getByLabel("Comente este resultado na thread");

  // From here on the model starts answering and never finishes.
  await stubHang(request, model, true);
  await box.fill("detalhe isso");
  await box.press("Enter");
  const stop = thread.getByRole("button", { name: "Parar agora" });
  await expect(stop).toBeVisible();
  const before = (await stubCalls(request, model)).length;
  expect(before).toBe(2);

  await stop.click();
  await expect(stop).toBeHidden();
  await expect(thread.getByRole("status")).toBeHidden();
  // The unfinished reply was not stored: the parent and the comment only.
  await expect(thread.getByTestId("group-message")).toHaveCount(2);

  // The composer is usable again: the next comment is answered in full.
  await stubHang(request, model, false);
  await expect(box).toBeEnabled();
  await box.fill("agora conclua");
  await box.press("Enter");
  await expect(thread.getByTestId("group-message")).toHaveCount(4);
  await expect(stop).toBeHidden();
});
