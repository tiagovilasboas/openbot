import type { BotProfile } from "@/features/bots/bot-types.ts";
import type { CrewStepRecord } from "@/features/crew/crew-step-record.ts";
import type {
  GitHubItem,
  GitHubRepoRef,
} from "@/features/github/github-types.ts";
import type { ModelCallResult } from "@/features/model/model-status.ts";
import type { IncompleteKind } from "./incomplete-reply.ts";
import type { ToolPauseDraft, ToolTurnReply } from "./tool-turn-reply.ts";

export interface ChatReplyOutcome {
  text: string;
  delegatedBot?: BotProfile;
  github?: { repo: GitHubRepoRef; items: GitHubItem[] };
  failover?: { fromModel: string; toModel: string; reason: string };
  /** The text is what arrived before the reply broke off or was cancelled. */
  incomplete?: IncompleteKind;
  /** Set when the turn reached the model, so the header dot can follow it. */
  modelCall?: ModelCallResult;
  /** Set when the Chief delegated: its kickoff and each specialist's reply. */
  crew?: {
    kickoff: string;
    specialists: Array<{
      bot: BotProfile;
      text: string;
      /** What the Chief asked and how it went; the team room reads this. */
      step?: CrewStepRecord;
    }>;
  };
  /** On a tool turn: the calls, the plain-chat notice, a pause. */
  toolSteps?: ToolTurnReply["toolSteps"];
  toolsUnavailable?: true;
  toolPause?: ToolPauseDraft;
}
