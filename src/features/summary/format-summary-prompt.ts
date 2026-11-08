import type { ChatLanguage } from "../chat/respond-to-message.ts";
import type { SummaryDataSource, SummaryRequestKind } from "./summary-types.ts";

interface PromptMessage {
  role: "user";
  text: string;
}

export function formatSummaryPrompt(
  data: SummaryDataSource,
  language: ChatLanguage,
  userQuery: string,
  _kind: SummaryRequestKind = "repo_summary",
): PromptMessage {
  const isPt = language === "pt";
  const items = data.items ?? [];
  const prs = items.filter((i) => i.isPullRequest);
  const issues = items.filter((i) => !i.isPullRequest);

  const contextLines: string[] = [];

  contextLines.push(
    isPt
      ? `[INSTRUÇÕES DO SISTEMA - RESUMO OPERACIONAL]`
      : `[SYSTEM INSTRUCTIONS - OPERATIONAL SUMMARY]`,
  );
  contextLines.push(
    isPt
      ? `Você é o OpenBot, assistente inteligente para desenvolvedores. Produza um resumo/briefing claro e estruturado dos dados reais abaixo.`
      : `You are OpenBot, a smart assistant for developers. Produce a clear, structured summary/briefing based on the real data below.`,
  );
  contextLines.push(
    isPt
      ? `Diretrizes obrigatórias:
1. Separe claramente "Fatos Verificados" de "Sugestões de Ação".
2. Mantenha referências explícitas: use #número para issues/PRs, mencione autores (@autor) e horários.
3. Se houver falha parcial indicada, declare-a de forma transparente (não finja que está vazio nem invente itens).
4. Não invente dados ou repositórios adicionais.
5. Responda em Português do Brasil com tom direto, profissional e amigável.`
      : `Mandatory guidelines:
1. Clearly distinguish "Verified Facts" from "Suggested Actions".
2. Keep explicit references: cite #number for issues/PRs, authors (@author) and times.
3. If partial failures are reported, state them transparently (do not hallucinate missing data).
4. Do not invent facts or extra repositories.
5. Respond in English with a direct, professional, and friendly tone.`,
  );
  contextLines.push("");

  contextLines.push(
    isPt ? `[DADOS COLETADOS EM TEMPO REAL]` : `[REAL-TIME RETRIEVED DATA]`,
  );

  if (data.repo) {
    contextLines.push(`Repositório: ${data.repo.owner}/${data.repo.repo}`);
  }

  if (data.githubError) {
    contextLines.push(`Falha no GitHub: ${data.githubError}`);
  } else if (items.length > 0) {
    contextLines.push(
      `GitHub: ${items.length} itens abertos (${prs.length} PRs, ${issues.length} issues)`,
    );
    if (prs.length > 0) {
      contextLines.push(`Pull Requests:`);
      for (const pr of prs.slice(0, 10)) {
        contextLines.push(
          `- PR #${pr.number}: "${pr.title}" por @${pr.author} (${pr.commentsCount} comentários)`,
        );
      }
    }
    if (issues.length > 0) {
      contextLines.push(`Issues:`);
      for (const issue of issues.slice(0, 10)) {
        const labels =
          issue.labels.length > 0 ? ` [${issue.labels.join(", ")}]` : "";
        contextLines.push(
          `- Issue #${issue.number}: "${issue.title}" por @${issue.author}${labels}`,
        );
      }
    }
  } else if (data.repo) {
    contextLines.push(`GitHub: Repositório sem issues ou PRs abertos.`);
  }

  contextLines.push("");
  contextLines.push(isPt ? `[SOLICITAÇÃO DO USUÁRIO]:` : `[USER QUERY]:`);
  contextLines.push(userQuery);

  return {
    role: "user",
    text: contextLines.join("\n"),
  };
}
