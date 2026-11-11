import type { Language } from "../language/language.ts";

/** The words of the deterministic summary, one entry per language. */
export interface SummaryCopy {
  dailyBriefing: string;
  repoSummary: (repoName: string) => string;
  dataSummary: string;
  partialFailure: (message: string) => string;
  rateLimited: string;
  repoNotFound: (repoName: string) => string;
  unauthorized: string;
  network: string;
  overview: (count: number) => string;
  openPullRequests: (count: number) => string;
  openIssues: (count: number) => string;
  recentPullRequests: string;
  recentIssues: string;
  noOpenItems: (repoName: string) => string;
  nextSteps: string;
  reviewPullRequests: string;
  triageIssues: string;
  nothingPending: string;
  sources: string;
}

const PT: SummaryCopy = {
  dailyBriefing: "### ☀️ Briefing Diário",
  repoSummary: (name) => `### 📋 Resumo de ${name}`,
  dataSummary: "### 📋 Resumo dos Dados",
  partialFailure: (message) => `> ⚠️ **Falha Parcial (GitHub):** ${message}`,
  rateLimited:
    "Limite de requisições da API pública do GitHub atingido para seu IP. Configure um GITHUB_TOKEN nas Configurações para obter dados em tempo real.",
  repoNotFound: (name) => `Repositório ${name} não encontrado ou inacessível.`,
  unauthorized: "Token do GitHub não autorizado ou sem permissão de leitura.",
  network: "Erro de conexão ao acessar a API do GitHub.",
  overview: (count) =>
    `**Visão Geral do Repositório (${count} itens abertos):**`,
  openPullRequests: (count) => `- Pull Requests: **${count}** abertos`,
  openIssues: (count) => `- Issues: **${count}** abertas`,
  recentPullRequests: `**Pull Requests Recentes:**`,
  recentIssues: `**Issues Recentes:**`,
  noOpenItems: (name) => `Nenhum item aberto encontrado em ${name}.`,
  nextSteps: `#### 💡 Sugestões de Ação`,
  reviewPullRequests: `- Revisar os PRs abertos prioritários para destravar o fluxo de desenvolvimento.`,
  triageIssues: `- Fazer a triagem das issues mais recentes e classificar por prioridade.`,
  nothingPending: `- Repositório sem pendências abertas. Bom momento para avançar no roadmap.`,
  sources: `*Fontes: GitHub API v3 (somente leitura)*`,
};

const EN: SummaryCopy = {
  dailyBriefing: "### ☀️ Daily Briefing",
  repoSummary: (name) => `### 📋 Summary for ${name}`,
  dataSummary: "### 📋 Data Summary",
  partialFailure: (message) => `> ⚠️ **Partial Failure (GitHub):** ${message}`,
  rateLimited:
    "GitHub public API rate limit exceeded for your IP. Configure a GITHUB_TOKEN in Settings for live data.",
  repoNotFound: (name) => `Repository ${name} not found or inaccessible.`,
  unauthorized: "GitHub token unauthorized or lacking read permissions.",
  network: "Network error connecting to the GitHub API.",
  overview: (count) => `**Repository Overview (${count} open items):**`,
  openPullRequests: (count) => `- Pull Requests: **${count}** open`,
  openIssues: (count) => `- Issues: **${count}** open`,
  recentPullRequests: `**Recent Pull Requests:**`,
  recentIssues: `**Recent Issues:**`,
  noOpenItems: (name) => `No open items found in ${name}.`,
  nextSteps: `#### 💡 Suggested Next Steps`,
  reviewPullRequests: `- Review pending PRs to unblock development workflow.`,
  triageIssues: `- Triage the most recent issues and categorize by priority.`,
  nothingPending: `- Repository has no open items. Good time to advance roadmap priorities.`,
  sources: `*Sources: GitHub API v3 (read-only)*`,
};

const ES: SummaryCopy = {
  dailyBriefing: "### ☀️ Resumen diario",
  repoSummary: (name) => `### 📋 Resumen de ${name}`,
  dataSummary: "### 📋 Resumen de los datos",
  partialFailure: (message) => `> ⚠️ **Falla parcial (GitHub):** ${message}`,
  rateLimited:
    "Se alcanzó el límite de solicitudes de la API pública de GitHub para tu IP. Configura un GITHUB_TOKEN en Configuración para obtener datos en tiempo real.",
  repoNotFound: (name) => `Repositorio ${name} no encontrado o inaccesible.`,
  unauthorized: "Token de GitHub no autorizado o sin permiso de lectura.",
  network: "Error de conexión al acceder a la API de GitHub.",
  overview: (count) =>
    `**Panorama del repositorio (${count} elementos abiertos):**`,
  openPullRequests: (count) => `- Pull Requests: **${count}** abiertos`,
  openIssues: (count) => `- Issues: **${count}** abiertos`,
  recentPullRequests: `**Pull Requests recientes:**`,
  recentIssues: `**Issues recientes:**`,
  noOpenItems: (name) => `No se encontró ningún elemento abierto en ${name}.`,
  nextSteps: `#### 💡 Próximos pasos sugeridos`,
  reviewPullRequests: `- Revisar los PRs abiertos prioritarios para destrabar el flujo de desarrollo.`,
  triageIssues: `- Hacer la clasificación de los issues más recientes y ordenarlos por prioridad.`,
  nothingPending: `- El repositorio no tiene pendientes abiertos. Buen momento para avanzar en el roadmap.`,
  sources: `*Fuentes: GitHub API v3 (solo lectura)*`,
};

const SUMMARY_COPY: Record<Language, SummaryCopy> = { pt: PT, en: EN, es: ES };

export function getSummaryCopy(language: Language): SummaryCopy {
  return SUMMARY_COPY[language];
}
