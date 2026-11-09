import type { ChatLanguage } from "@/features/chat/respond-to-message.ts";

/** Copy for the skills section of Settings. Bilingual parity. */
export const skillsCopy = {
  pt: {
    addSkill: "Nova skill",
    back: "Voltar para a lista",
    empty:
      "Nenhuma skill ainda. Crie uma para reutilizar instruções com um comando /.",
    createTitle: "Nova skill",
    importHint: "Cole um SKILL.md para preencher os campos abaixo.",
    markdownPlaceholder:
      "# Nome da skill\n> Descrição curta\n\nInstruções detalhadas...",
    namePlaceholder: "Revisão de código",
    commandPlaceholder: "/revisao-de-codigo",
    commandHint: "Opcional. Gerado a partir do nome se ficar vazio.",
    descPlaceholder: "Analisa diffs de PRs procurando bugs",
    instructionsPlaceholder:
      "Instruções enviadas ao modelo quando esta skill for chamada.",
    requiredHint: "Preencha o nome e as instruções para criar a skill.",
    added: "Skill criada: {name}.",
    removeAria: "Excluir skill {name}",
    removeConfirm: "Excluir {name}?",
    removeConfirmAction: "Excluir",
    cancel: "Cancelar",
    removed: "Skill excluída.",
  },
  en: {
    addSkill: "New skill",
    back: "Back to list",
    empty:
      "No skills yet. Create one to reuse instructions behind a / command.",
    createTitle: "New skill",
    importHint: "Paste a SKILL.md to fill in the fields below.",
    markdownPlaceholder:
      "# Skill name\n> Short description\n\nDetailed instructions...",
    namePlaceholder: "Code review",
    commandPlaceholder: "/code-review",
    commandHint: "Optional. Generated from the name if left empty.",
    descPlaceholder: "Reviews PR diffs for bugs",
    instructionsPlaceholder:
      "Instructions sent to the model when this skill is called.",
    requiredHint: "Fill in the name and instructions to create the skill.",
    added: "Skill created: {name}.",
    removeAria: "Delete skill {name}",
    removeConfirm: "Delete {name}?",
    removeConfirmAction: "Delete",
    cancel: "Cancel",
    removed: "Skill deleted.",
  },
} as const satisfies Record<ChatLanguage, Record<string, string>>;

export function getSkillsCopy(language: ChatLanguage) {
  return skillsCopy[language];
}
