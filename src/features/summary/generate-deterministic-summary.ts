import type { ChatLanguage } from "../chat/respond-to-message.ts";
import type { SummaryDataSource, SummaryRequestKind } from "./summary-types.ts";

export function generateDeterministicSummary(
  data: SummaryDataSource,
  language: ChatLanguage,
  kind: SummaryRequestKind = "repo_summary",
): string {
  const isPt = language === "pt";
  const lines: string[] = [];

  // 1. Header
  if (kind === "daily_briefing") {
    lines.push(isPt ? "### ☀️ Briefing Diário" : "### ☀️ Daily Briefing");
  } else if (data.repo) {
    lines.push(
      isPt
        ? `### 📋 Resumo de ${data.repo.owner}/${data.repo.repo}`
        : `### 📋 Summary for ${data.repo.owner}/${data.repo.repo}`,
    );
  } else {
    lines.push(isPt ? "### 📋 Resumo dos Dados" : "### 📋 Data Summary");
  }
  lines.push("");

  // 2. Partial Failures (transparency rule)
  if (data.githubError) {
    const errorMsg =
      data.githubError === "rate_limited"
        ? isPt
          ? "Limite de requisições da API pública do GitHub atingido para seu IP. Configure um GITHUB_TOKEN nas Configurações para obter dados em tempo real."
          : "GitHub public API rate limit exceeded for your IP. Configure a GITHUB_TOKEN in Settings for live data."
        : data.githubError === "repo_not_found"
          ? isPt
            ? `Repositório ${data.repo?.owner}/${data.repo?.repo} não encontrado ou inacessível.`
            : `Repository ${data.repo?.owner}/${data.repo?.repo} not found or inaccessible.`
          : data.githubError === "unauthorized"
            ? isPt
              ? "Token do GitHub não autorizado ou sem permissão de leitura."
              : "GitHub token unauthorized or lacking read permissions."
            : isPt
              ? "Erro de conexão ao acessar a API do GitHub."
              : "Network error connecting to the GitHub API.";

    lines.push(
      isPt
        ? `> ⚠️ **Falha Parcial (GitHub):** ${errorMsg}`
        : `> ⚠️ **Partial Failure (GitHub):** ${errorMsg}`,
    );
    lines.push("");
  }

  // 3. Fatos Verificados - GitHub
  const items = data.items ?? [];
  const prs = items.filter((i) => i.isPullRequest);
  const issues = items.filter((i) => !i.isPullRequest);

  if (items.length > 0) {
    lines.push(
      isPt
        ? `**Visão Geral do Repositório (${items.length} itens abertos):**`
        : `**Repository Overview (${items.length} open items):**`,
    );
    lines.push(
      isPt
        ? `- Pull Requests: **${prs.length}** abertos`
        : `- Pull Requests: **${prs.length}** open`,
    );
    lines.push(
      isPt
        ? `- Issues: **${issues.length}** abertas`
        : `- Issues: **${issues.length}** open`,
    );
    lines.push("");

    if (prs.length > 0) {
      lines.push(
        isPt ? `**Pull Requests Recentes:**` : `**Recent Pull Requests:**`,
      );
      for (const pr of prs.slice(0, 5)) {
        lines.push(`- **#${pr.number}** ${pr.title} (@${pr.author})`);
      }
      lines.push("");
    }

    if (issues.length > 0) {
      lines.push(isPt ? `**Issues Recentes:**` : `**Recent Issues:**`);
      for (const issue of issues.slice(0, 5)) {
        const labelsStr =
          issue.labels.length > 0 ? ` [${issue.labels.join(", ")}]` : "";
        lines.push(
          `- **#${issue.number}** ${issue.title} (@${issue.author})${labelsStr}`,
        );
      }
      lines.push("");
    }
  } else if (!data.githubError && data.repo) {
    lines.push(
      isPt
        ? `Nenhum item aberto encontrado em ${data.repo.owner}/${data.repo.repo}.`
        : `No open items found in ${data.repo.owner}/${data.repo.repo}.`,
    );
    lines.push("");
  }

  // 4. Fatos Verificados - Agenda
  if (data.events && data.events.length > 0) {
    lines.push(
      isPt ? `**Compromissos Agendados:**` : `**Scheduled Calendar Events:**`,
    );
    for (const event of data.events) {
      lines.push(`- **${event.time}** — ${event.title} (${event.detail})`);
    }
    lines.push("");
  }

  // 5. Sugestões de Ação (Separadas dos fatos)
  lines.push(
    isPt ? `#### 💡 Sugestões de Ação` : `#### 💡 Suggested Next Steps`,
  );
  if (prs.length > 0) {
    lines.push(
      isPt
        ? `- Revisar os PRs abertos prioritários para destravar o fluxo de desenvolvimento.`
        : `- Review pending PRs to unblock development workflow.`,
    );
  }
  if (issues.length > 0) {
    lines.push(
      isPt
        ? `- Fazer a triagem das issues mais recentes e classificar por prioridade.`
        : `- Triage the most recent issues and categorize by priority.`,
    );
  }
  if (data.events && data.events.length > 0) {
    lines.push(
      isPt
        ? `- Organizar pausas e foco antes do primeiro compromisso do dia.`
        : `- Prepare notes and align focus before the day's first meeting.`,
    );
  }
  if (
    prs.length === 0 &&
    issues.length === 0 &&
    (!data.events || data.events.length === 0)
  ) {
    lines.push(
      isPt
        ? `- Repositório sem pendências abertas. Bom momento para avançar no roadmap.`
        : `- Repository has no open items. Good time to advance roadmap priorities.`,
    );
  }
  lines.push("");

  // 6. Rodapé de Fontes
  lines.push(
    isPt
      ? `*Fontes: GitHub API v3 (somente leitura)${data.events ? " · Agenda local" : ""}*`
      : `*Sources: GitHub API v3 (read-only)${data.events ? " · Local calendar" : ""}*`,
  );

  return lines.join("\n");
}
