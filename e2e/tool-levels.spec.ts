import { appPage, expect, test } from "./app-fixture.ts";
import { stubLevels } from "./tool-levels-stub.ts";

test("settings set a level per tool; allow is only offered to tools that opt in", async ({
  page,
  context,
}) => {
  const levels = await stubLevels(context, [
    { name: "memory_add_note", level: "ask", canAllow: true },
    { name: "github_list_open_items", level: "ask", canAllow: false },
  ]);
  await page.goto("/");
  await appPage(page).openSettingsTab("Segurança");

  const section = page.getByRole("region", {
    name: "Nível de cada ferramenta",
  });
  const note = section.getByRole("group", {
    name: "Salvar uma nota na memória",
  });
  const github = section.getByRole("group", {
    name: "Ler issues e PRs abertos no GitHub",
  });

  // Allow is not offered for the tool that does not opt in.
  await expect(note.getByRole("radio")).toHaveCount(3);
  await expect(github.getByRole("radio")).toHaveCount(2);
  await expect(github.getByRole("radio", { name: "Permitir" })).toHaveCount(0);
  await expect(note.getByRole("radio", { name: "Perguntar" })).toBeChecked();

  // Mouse and keyboard both set a level.
  await note.getByText("Permitir").click();
  await expect(note.getByRole("radio", { name: "Permitir" })).toBeChecked();
  await note.getByRole("radio", { name: "Permitir" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(note.getByRole("radio", { name: "Bloquear" })).toBeChecked();
  await github.getByText("Bloquear").click();
  await expect(github.getByRole("radio", { name: "Bloquear" })).toBeChecked();
  expect(levels.puts()).toEqual([
    { toolName: "memory_add_note", level: "allow" },
    { toolName: "memory_add_note", level: "block" },
    { toolName: "github_list_open_items", level: "block" },
  ]);
});

test("level choices are 44px touch targets on a phone", async ({
  page,
  context,
}) => {
  await stubLevels(context, [
    { name: "memory_add_note", level: "ask", canAllow: true },
  ]);
  await page.goto("/");
  // The sidebar holds Settings at desktop size; measure once at phone size.
  await appPage(page).openSettingsTab("Segurança");
  await page.setViewportSize({ width: 375, height: 760 });
  const section = page.getByRole("region", {
    name: "Nível de cada ferramenta",
  });
  for (const name of ["Perguntar", "Permitir", "Bloquear"]) {
    const box = await section.getByText(name, { exact: true }).boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
  }
});
