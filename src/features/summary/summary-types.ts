import type {
  GitHubErrorCode,
  GitHubItem,
  GitHubRepoRef,
} from "../github/github-types.ts";
import type { ChatLanguage } from "../chat/respond-to-message.ts";

export type SummaryRequestKind = "repo_summary" | "daily_briefing";

export type DetectedSummaryRequest =
  | {
      isSummary: true;
      kind: SummaryRequestKind;
      repo: GitHubRepoRef;
    }
  | {
      isSummary: false;
    };

export interface SummaryDataSource {
  repo?: GitHubRepoRef;
  items?: GitHubItem[];
  githubError?: GitHubErrorCode | null;
}

export interface SummaryContext {
  language: ChatLanguage;
  data: SummaryDataSource;
}

export interface SummaryOutcome {
  text: string;
  github?: {
    repo: GitHubRepoRef;
    items: GitHubItem[];
  };
  partialFailures: string[];
}
