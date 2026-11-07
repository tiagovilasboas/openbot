export interface SkillDefinition {
  id: string;
  name: string;
  description: string;
  instructions: string;
  command: string; // e.g. "/github", "/agenda", "/briefing", "/code-review"
  isBuiltin: boolean;
  createdAt: string;
}

export const BUILTIN_SKILLS: readonly SkillDefinition[] = [
  {
    id: "github",
    name: "GitHub Reader",
    description: "Leitura de issues e pull requests de repositórios do GitHub.",
    instructions:
      "Quando o usuário solicitar informações de repositórios, liste e analise issues e PRs com fontes diretas.",
    command: "/github",
    isBuiltin: true,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "calendar",
    name: "Agenda de Demonstração",
    description: "Consulta e organização de reuniões e compromissos do dia.",
    instructions:
      "Apresente e organize a agenda de reuniões e blocos de trabalho agendados.",
    command: "/agenda",
    isBuiltin: true,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "summary",
    name: "Briefing & Síntese Factual",
    description:
      "Resumos estruturados separando fatos verificados de sugestões.",
    instructions:
      "Gere briefings e resumos concisos separando fatos concretos de sugestões acionáveis.",
    command: "/briefing",
    isBuiltin: true,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
] as const;
