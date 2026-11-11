import {
  externalDataRule,
  wrapExternalText,
} from "../untrusted-text/wrap-external-text.ts";
import type { Language } from "../language/language.ts";
import type { SummaryDataSource, SummaryRequestKind } from "./summary-types.ts";

interface PromptMessage {
  role: "user";
  text: string;
}

/** The instructions the summary prompt opens with, one entry per language. */
interface SummaryPromptCopy {
  heading: string;
  role: string;
  guidelines: string;
  dataHeading: string;
  queryHeading: string;
}

const PROMPT_COPY: Record<Language, SummaryPromptCopy> = {
  pt: {
    heading: `[INSTRUÇÕES DO SISTEMA - RESUMO OPERACIONAL]`,
    role: `Você é o OpenBot, assistente inteligente para desenvolvedores. Produza um resumo/briefing claro e estruturado dos dados reais abaixo.`,
    guidelines: `Diretrizes obrigatórias:
1. Separe claramente "Fatos Verificados" de "Sugestões de Ação".
2. Mantenha referências explícitas: use #número para issues/PRs, mencione autores (@autor) e horários.
3. Se houver falha parcial indicada, declare-a de forma transparente (não finja que está vazio nem invente itens).
4. Não invente dados ou repositórios adicionais.
5. Responda em Português do Brasil com tom direto, profissional e amigável.`,
    dataHeading: `[DADOS COLETADOS EM TEMPO REAL]`,
    queryHeading: `[SOLICITAÇÃO DO USUÁRIO]:`,
  },
  en: {
    heading: `[SYSTEM INSTRUCTIONS - OPERATIONAL SUMMARY]`,
    role: `You are OpenBot, a smart assistant for developers. Produce a clear, structured summary/briefing based on the real data below.`,
    guidelines: `Mandatory guidelines:
1. Clearly distinguish "Verified Facts" from "Suggested Actions".
2. Keep explicit references: cite #number for issues/PRs, authors (@author) and times.
3. If partial failures are reported, state them transparently (do not hallucinate missing data).
4. Do not invent facts or extra repositories.
5. Respond in English with a direct, professional, and friendly tone.`,
    dataHeading: `[REAL-TIME RETRIEVED DATA]`,
    queryHeading: `[USER QUERY]:`,
  },
  es: {
    heading: `[INSTRUCCIONES DEL SISTEMA - RESUMEN OPERATIVO]`,
    role: `Eres OpenBot, un asistente inteligente para desarrolladores. Produce un resumen o briefing claro y estructurado a partir de los datos reales de abajo.`,
    guidelines: `Pautas obligatorias:
1. Separa con claridad los "Hechos verificados" de las "Acciones sugeridas".
2. Mantén referencias explícitas: usa #número para issues/PRs, menciona a los autores (@autor) y los horarios.
3. Si se indica una falla parcial, decláralo con transparencia (no finjas que está vacío ni inventes elementos).
4. No inventes datos ni repositorios adicionales.
5. Responde en español latinoamericano neutro, con un tono directo, profesional y amable.`,
    dataHeading: `[DATOS OBTENIDOS EN TIEMPO REAL]`,
    queryHeading: `[SOLICITUD DEL USUARIO]:`,
  },
};

export function formatSummaryPrompt(
  data: SummaryDataSource,
  language: Language,
  userQuery: string,
  _kind: SummaryRequestKind = "repo_summary",
): PromptMessage {
  const copy = PROMPT_COPY[language];
  const items = data.items ?? [];
  const prs = items.filter((i) => i.isPullRequest);
  const issues = items.filter((i) => !i.isPullRequest);

  const contextLines: string[] = [];

  contextLines.push(copy.heading);
  contextLines.push(copy.role);
  contextLines.push(copy.guidelines);
  contextLines.push("");

  contextLines.push(copy.dataHeading);

  if (data.repo) {
    contextLines.push(`Repositório: ${data.repo.owner}/${data.repo.repo}`);
  }

  if (data.githubError) {
    contextLines.push(`Falha no GitHub: ${data.githubError}`);
  } else if (items.length > 0) {
    contextLines.push(
      `GitHub: ${items.length} itens abertos (${prs.length} PRs, ${issues.length} issues)`,
    );
    // Titles, authors and labels are written by strangers: data, not orders.
    const external: string[] = [];
    if (prs.length > 0) {
      external.push(`Pull Requests:`);
      for (const pr of prs.slice(0, 10)) {
        external.push(
          `- PR #${pr.number}: "${pr.title}" por @${pr.author} (${pr.commentsCount} comentários)`,
        );
      }
    }
    if (issues.length > 0) {
      external.push(`Issues:`);
      for (const issue of issues.slice(0, 10)) {
        const labels =
          issue.labels.length > 0 ? ` [${issue.labels.join(", ")}]` : "";
        external.push(
          `- Issue #${issue.number}: "${issue.title}" por @${issue.author}${labels}`,
        );
      }
    }
    contextLines.push(externalDataRule(language));
    contextLines.push(wrapExternalText(external.join("\n")));
  } else if (data.repo) {
    contextLines.push(`GitHub: Repositório sem issues ou PRs abertos.`);
  }

  contextLines.push("");
  contextLines.push(copy.queryHeading);
  contextLines.push(userQuery);

  return {
    role: "user",
    text: contextLines.join("\n"),
  };
}
