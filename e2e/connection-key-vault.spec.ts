import { appPage, expect, test } from "./app-fixture.ts";

const KEY = "sk-or-v1-e2e-secret-key";
const headers = { "x-openbot-client": "1" };

test("a connected key lives on the server, never in the browser", async ({
  page,
  model,
}) => {
  model.queue({ text: "ok" });
  await page.goto("/");
  const app = appPage(page);
  await app.openSettingsTab("Conexões");

  await page.getByRole("button", { name: /OpenRouter/ }).click();
  await page.getByLabel("Chave de API").fill(KEY);
  await page.getByRole("button", { name: "Testar e conectar" }).click();
  await expect(page.getByText("Conectado. A chave funcionou.")).toBeVisible();

  // The field is emptied and the key is in no browser storage.
  await expect(page.getByLabel("Chave de API")).toHaveValue("");
  const stored = await page.evaluate(() =>
    JSON.stringify({ ...localStorage, ...sessionStorage }),
  );
  expect(stored).not.toContain(KEY);

  // The server lists it by provider and origin, without any value.
  const listed = await page.request.get("/api/keys", { headers });
  const text = await listed.text();
  expect(text).not.toContain(KEY);
  expect(JSON.parse(text).keys).toEqual([
    expect.objectContaining({
      provider: "router",
      origin: "https://openrouter.ai",
    }),
  ]);

  // The reload still shows it connected, and chat requests carry no key.
  await page.reload();
  await app.openSettingsTab("Conexões");
  await expect(page.getByText("Conectado", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Fechar configurações" }).click();
  await expect(page.getByRole("tab", { name: "Conexões" })).toBeHidden();
  await app.send("hello");
  await expect(page.getByText("ok", { exact: true })).toBeVisible();
  expect(JSON.stringify(model.chatRequests())).not.toContain(KEY);

  // Disconnecting forgets it on the server.
  await app.openSettingsTab("Conexões");
  await page.getByRole("button", { name: /OpenRouter/ }).click();
  await page.getByRole("button", { name: "Desconectar" }).click();
  const after = await page.request.get("/api/keys", { headers });
  expect((await after.json()).keys).toEqual([]);
});
