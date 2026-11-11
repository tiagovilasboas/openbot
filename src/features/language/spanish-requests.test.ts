import assert from "node:assert/strict";
import test from "node:test";
import { chatCopy } from "../chat/chat-copy.ts";
import { detectGitHubRequest } from "../github/detect-github-request.ts";
import { detectSummaryRequest } from "../summary/detect-summary-request.ts";

test("the Spanish starter chips are understood as the requests they name", () => {
  const briefing = detectSummaryRequest(chatCopy.es.summarySampleQuery);
  assert.equal(briefing.isSummary, true);
  assert.equal(briefing.isSummary && briefing.kind, "daily_briefing");

  const issues = detectGitHubRequest(chatCopy.es.gitHubIssuesQuery);
  assert.equal(issues.isGitHubRequest && issues.itemType, "issues");
  const pulls = detectGitHubRequest(chatCopy.es.gitHubPullsQuery);
  assert.equal(pulls.isGitHubRequest && pulls.itemType, "prs");
});

test("a Spanish summary request for a repository names the repository", () => {
  const request = detectSummaryRequest(
    "Hazme un resumen de tiagovilasboas/openbot",
  );
  assert.equal(request.isSummary, true);
  assert.equal(request.isSummary && request.kind, "repo_summary");
});

test("y/o is not read as a repository", () => {
  assert.equal(
    detectGitHubRequest("quiero issues y/o pull requests").isGitHubRequest,
    false,
  );
});

test("an ordinary Spanish message is not a summary or a GitHub request", () => {
  assert.equal(detectSummaryRequest("Hola, ¿cómo estás?").isSummary, false);
  assert.equal(
    detectGitHubRequest("Hola, ¿cómo estás?").isGitHubRequest,
    false,
  );
});
