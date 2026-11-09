import type { ChatLanguage } from "@/features/chat/respond-to-message.ts";

/** Copy for a bot's own skills, edited in the bot sheet. Bilingual parity. */
export const skillsCopy = {
  pt: {
    sectionTitle: "Skills",
    sectionHint: "Comandos / que só este bot conhece.",
    addSkill: "Nova skill",
    empty:
      "Nenhuma skill ainda. Crie uma para guardar instruções atrás de um comando /.",
    createTitle: "Nova skill",
    importLabel: "Colar SKILL.md (opcional)",
    importHint: "Preenche os campos abaixo.",
    markdownPlaceholder:
      "# Nome da skill\n> Descrição curta\n\nInstruções detalhadas...",
    nameLabel: "Nome",
    namePlaceholder: "Revisão de código",
    commandLabel: "Comando",
    commandPlaceholder: "/revisao-de-codigo",
    commandHint: "Opcional. Gerado a partir do nome se ficar vazio.",
    duplicateCommand: "Este bot já tem o comando {command}.",
    descLabel: "Descrição curta",
    descPlaceholder: "Analisa diffs de PRs procurando bugs",
    instructionsLabel: "Instruções",
    instructionsPlaceholder:
      "Instruções enviadas ao modelo quando esta skill for chamada.",
    requiredHint: "Preencha o nome e as instruções para adicionar a skill.",
    addAction: "Adicionar skill",
    added: "Skill adicionada: {name}. Salve o bot para manter.",
    removeAria: "Remover skill {name}",
    removeConfirm: "Remover {name}?",
    removeConfirmAction: "Remover",
    cancel: "Cancelar",
    removed: "Skill removida. Salve o bot para confirmar.",
  },
  en: {
    sectionTitle: "Skills",
    sectionHint: "/ commands only this bot knows.",
    addSkill: "New skill",
    empty: "No skills yet. Create one to keep instructions behind a / command.",
    createTitle: "New skill",
    importLabel: "Paste a SKILL.md (optional)",
    importHint: "It fills in the fields below.",
    markdownPlaceholder:
      "# Skill name\n> Short description\n\nDetailed instructions...",
    nameLabel: "Name",
    namePlaceholder: "Code review",
    commandLabel: "Command",
    commandPlaceholder: "/code-review",
    commandHint: "Optional. Generated from the name if left empty.",
    duplicateCommand: "This bot already has the command {command}.",
    descLabel: "Short description",
    descPlaceholder: "Reviews PR diffs for bugs",
    instructionsLabel: "Instructions",
    instructionsPlaceholder:
      "Instructions sent to the model when this skill is called.",
    requiredHint: "Fill in the name and instructions to add the skill.",
    addAction: "Add skill",
    added: "Skill added: {name}. Save the bot to keep it.",
    removeAria: "Remove skill {name}",
    removeConfirm: "Remove {name}?",
    removeConfirmAction: "Remove",
    cancel: "Cancel",
    removed: "Skill removed. Save the bot to confirm.",
  },
} as const satisfies Record<ChatLanguage, Record<string, string>>;

export type SkillsCopy = (typeof skillsCopy)[ChatLanguage];

export function getSkillsCopy(language: ChatLanguage): SkillsCopy {
  return skillsCopy[language];
}
