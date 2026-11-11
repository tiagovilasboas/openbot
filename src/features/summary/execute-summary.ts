import { requestModelReply } from "../chat/request-model-reply.ts";
import type { ChatLanguage } from "../chat/respond-to-message.ts";
import { listRepositoryItems } from "../github/list-repository-items.ts";
import type { ClientModelConfig } from "../model/model-config.ts";
import { formatSummaryPrompt } from "./format-summary-prompt.ts";
import { generateDeterministicSummary } from "./generate-deterministic-summary.ts";
import type {
  DetectedSummaryRequest,
  SummaryDataSource,
  SummaryOutcome,
} from "./summary-types.ts";

export async function executeSummary(
  request: DetectedSummaryRequest & { isSummary: true },
  language: ChatLanguage,
  userQuery: string,
  gitHubToken: string | null = null,
  modelConfig: ClientModelConfig | null = null,
  fetchImpl: typeof fetch = fetch,
  modelId?: string,
): Promise<SummaryOutcome> {
  const dataSource: SummaryDataSource = {
    repo: request.repo,
  };
  const partialFailures: string[] = [];

  // 1. Fetch GitHub data if repo is set
  if (request.repo) {
    const gitHubResult = await listRepositoryItems(
      request.repo,
      gitHubToken,
      fetchImpl,
    );
    if (gitHubResult.ok) {
      dataSource.items = gitHubResult.items;
    } else {
      dataSource.githubError = gitHubResult.error;
      partialFailures.push(`GitHub: ${gitHubResult.error}`);
    }
  }

  // 2. Generate summary text (AI model if configured, otherwise deterministic)
  let summaryText = "";

  if (modelConfig) {
    const promptMessage = formatSummaryPrompt(
      dataSource,
      language,
      userQuery,
      request.kind,
    );
    const outcome = await requestModelReply(
      language,
      [promptMessage],
      fetchImpl,
      modelConfig,
      undefined,
      // The active bot's own model; the server applies the allow-list.
      modelId ? { modelId } : {},
    );
    if (outcome.kind === "text") {
      summaryText = outcome.text;
    } else {
      // Fallback to deterministic if model fails or unavailable
      summaryText = generateDeterministicSummary(
        dataSource,
        language,
        request.kind,
      );
    }
  } else {
    summaryText = generateDeterministicSummary(
      dataSource,
      language,
      request.kind,
    );
  }

  return {
    text: summaryText,
    ...(dataSource.items && dataSource.items.length > 0 && request.repo
      ? { github: { repo: request.repo, items: dataSource.items } }
      : {}),
    partialFailures,
  };
}
