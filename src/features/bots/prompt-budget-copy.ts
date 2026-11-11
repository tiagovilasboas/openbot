import type { PromptBudgetReport } from "./prompt-budget.ts";

type Language = "pt" | "en";

interface PromptBudgetCopy {
  title: string;
  skills: (count: number) => string;
  workspace: string;
  description: string;
  overBy: (chars: number) => string;
  hint: string;
}

const COPY: Record<Language, PromptBudgetCopy> = {
  pt: {
    title: "Atenção: o prompt deste bot é grande demais",
    skills: (n) =>
      n === 1 ? "1 skill ficará de fora" : `${n} skills ficarão de fora`,
    workspace: "o contexto de projeto será cortado",
    description: "as instruções serão cortadas",
    overBy: (n) =>
      `Passa do limite em cerca de ${n.toLocaleString("pt-BR")} caracteres.`,
    hint: "Reduza o texto ou remova skills. Para o bot principal, a lista da equipe também ocupa espaço.",
  },
  en: {
    title: "Heads up: this bot's prompt is too long",
    skills: (n) =>
      n === 1 ? "1 skill will be left out" : `${n} skills will be left out`,
    workspace: "the project context will be cut",
    description: "the instructions will be cut",
    overBy: (n) =>
      `It is over the limit by about ${n.toLocaleString("en-US")} characters.`,
    hint: "Shorten the text or remove skills. For the main bot, the team list also takes room.",
  },
};

/** What the status says, or null when the prompt fits and nothing is shown. */
export function describePromptBudget(
  report: PromptBudgetReport,
  language: Language,
): { title: string; losses: string[]; overBy: string; hint: string } | null {
  if (report.overBy <= 0) return null;
  const copy = COPY[language];
  const losses: string[] = [];
  if (report.skillsLeftOut > 0) losses.push(copy.skills(report.skillsLeftOut));
  if (report.workspaceCut) losses.push(copy.workspace);
  if (report.descriptionCut) losses.push(copy.description);
  return {
    title: copy.title,
    losses,
    overBy: copy.overBy(report.overBy),
    hint: copy.hint,
  };
}
